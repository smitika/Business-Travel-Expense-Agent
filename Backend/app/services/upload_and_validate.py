import cloudinary.uploader
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import your database session maker (SessionLocal) and your Pydantic model
from app.services.claim_validator import run_claim_validation
from app.database.db import SessionLocal  # Adjust import if named differently
from app.schemas.claim_schemas import UploadMetadata  # Adjust to your exact schemas path

logger = logging.getLogger(__name__)

def process_uploads_and_validate(
    claim_id: int, 
    emp_id: str, 
    files_data: list, 
    initial_status: str
):
    # Manually open a dedicated DB session for this background lifecycle
    db: Session = SessionLocal()
    logger.info(f"[UploadWorker] Started for claim={claim_id}")
    try:
        for item in files_data:
            # Explicitly type-hint 'meta' so your IDE highlights and autocompletes it!
            meta: UploadMetadata = item["metadata"]
            logger.info(f"[UploadWorker] Uploading day={meta.day_number}")
            # 1. Upload bytes to Cloudinary in the background
            upload_result = cloudinary.uploader.upload(
                item["content"],
                folder=f"expense_claims/{emp_id}/claim_{claim_id}/day{meta.day_number}_{meta.category}",
                resource_type="image"
            )
            logger.info("[UploadWorker] Cloudinary upload successful")
            file_url = upload_result["secure_url"]

            # 2. Insert into claim_uploads
            db.execute(
                text("""
                    INSERT INTO claim_uploads
                        (claim_id, day_number, claim_date, category, file_url,
                         user_description, status, file_role)
                    VALUES
                        (:claim_id, :day_number, :claim_date, :category, :file_url,
                         :description, 'PENDING',:file_role)
                """),
                {
                    "claim_id": claim_id,
                    "day_number": meta.day_number,
                    "claim_date": meta.claim_date,
                    "category": meta.category,
                    "file_url": file_url,
                    "description": meta.description or "", # Fallback if description is separate
                    "file_role": meta.file_role or "receipt",
                }
            )
            logger.info(f"[UploadWorker] Inserted upload row for day={meta.day_number}")
        db.commit()
        logger.info("[UploadWorker] All claim_upload rows committed")

        # 3. If claim was validated as PENDING, trigger the OCR + policy evaluation
        if initial_status == "PENDING":
            logger.info(f"[UploadWorker] Starting validator for claim={claim_id}")
            run_claim_validation(claim_id)
            logger.info(f"[UploadWorker] Validator finished for claim={claim_id}")

    except Exception as e:
        db.rollback()
        logger.exception(f"[UploadWorker] Background uploads failed for claim_id={claim_id}")
    finally:
        db.close() # Always close the session to release it back to the connection pool
import logging
import requests
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.travel_utils import to_inr
from app.services.travel_type_classifier import infer_travel_type
from app.services.expense_categorizer import categorize_expense, inferred_matches_uploaded
from app.services.policy_engine import load_policy_limits, load_disallowed_items, enforce_budget
from app.services.ocr import extract_ocr_data
from app.services.check_policy_metadata import is_policy_extracted
from app.services.match_receipt_description import description_matches_receipt
logger = logging.getLogger(__name__)

from app.database.db import SessionLocal
# ---------------------------------------------------------------------------
# Entry point (called by BackgroundTasks in /submit-claim)
# ---------------------------------------------------------------------------
def run_claim_validation(claim_id: int) -> None:
    logger.info(f"[Validator] Starting validation for claim_id={claim_id}")

    # Spin up a dedicated database session for this background execution lifecycle
    db = SessionLocal() 
    try:
        # 1. Fetch claim header
        claim = db.execute(
            text("""
                SELECT claim_id, emp_id, policy_version_id,
                       trip_start_date, trip_end_date, travel_id
                FROM claims
                WHERE claim_id = :claim_id
            """),
            {"claim_id": claim_id}
        ).mappings().first()

        if not claim:
            logger.error(f"[Validator] claim_id={claim_id} not found — aborting")
            return

        # 2. Infer travel type from destination
        travel = db.execute(
            text("SELECT destination FROM travel_requests WHERE id = :tid"),
            {"tid": claim["travel_id"]}
        ).mappings().first()

        destination = travel["destination"] if travel else ""
        travel_type = infer_travel_type(destination)
        policy_version_id = claim["policy_version_id"]

        logger.info(f"[Validator] claim={claim_id} destination='{destination}' → travel_type={travel_type}")

        # --- SAFETY CHECK: Halt if policies are unpopulated ---
        if not is_policy_extracted(policy_version_id, db):
            logger.error(
                f"[Validator] Claim={claim_id} requires policy={policy_version_id} which is missing metadata. "
                f"Failing validation, resetting status to 'SYSTEM_PENDING', and aborting."
            )
            _update_claim_status(claim_id, "SYSTEM_PENDING", db)
            db.commit() # Make sure to commit the status update to DB
            return

        # 3. Load policy rules
        policy_daily_limits = load_policy_limits(policy_version_id, travel_type, db)
        disallowed_items    = load_disallowed_items(policy_version_id, travel_type, db)

        # 4. Fetch all PENDING uploads
        uploads = db.execute(
            text("""
                SELECT upload_id, day_number, claim_date, category,
                       file_url, user_description
                FROM claim_uploads
                WHERE claim_id = :claim_id
                  AND status = 'PENDING'
                ORDER BY upload_id ASC
            """),
            {"claim_id": claim_id}
        ).mappings().all()

        if not uploads:
            logger.warning(f"[Validator] No PENDING uploads for claim_id={claim_id}")
            _update_claim_status(claim_id, "APPROVED", db)
            db.commit()
            return

        # 5. Running daily totals
        daily_totals: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))

        # 6. Per-upload processing loop
        for upload in uploads:
            logger.info(
                f"[Validator] Processing upload_id={upload['upload_id']} day={upload['day_number']} cat={upload['category']}"
            )
            try:
                verdict = _process_single_upload(
                    upload=upload,
                    policy_daily_limits=policy_daily_limits,
                    disallowed_items=disallowed_items,
                    daily_totals=daily_totals,
                )
            except Exception as e:
                logger.exception(f"[Validator] Unexpected error on upload_id={upload['upload_id']}: {e}")
                verdict = _error_verdict(f"Internal processing error: {e}")

            _write_upload_verdict(upload["upload_id"], verdict, db)

        # 7. Roll up status and commit final validation results
        _rollup_claim_status(claim_id, db)
        db.commit() # Commit all receipt verdicts and final claim rollup
        logger.info(f"[Validator] Validation complete for claim_id={claim_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"[Validator] Execution failed for claim_id={claim_id}: {e}")
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Single-upload processor
# ---------------------------------------------------------------------------

def _process_single_upload(
    upload: dict,
    policy_daily_limits: dict,
    disallowed_items: dict,
    daily_totals: dict,
) -> dict:

    category = category = upload["category"].strip().lower()
    file_url = upload["file_url"]
    description = upload["user_description"] or ""
    day_number = upload["day_number"]

    base = _empty_verdict()

    # ---------------------------------------------------------
    # Step 1: Download receipt
    # ---------------------------------------------------------
    try:
        resp = requests.get(file_url, timeout=15)
        resp.raise_for_status()
        file_bytes = resp.content
    except Exception as e:
        return {
            **base,
            "status": "REVIEW",
            "review_reason": f"Could not download file: {e}",
        }

    # ---------------------------------------------------------
    # Step 2: OCR + LLM Extraction
    # ---------------------------------------------------------
    try:
        ocr = extract_ocr_data(file_bytes)
    except Exception as e:
        logger.info(f"[Validator] ocr failed")
        return {
            **base,
            "status": "REVIEW",
            "review_reason": f"OCR failed: {e}",
        }

    logger.info(f"[Validator] OCR Result: {ocr}")
    logger.info(
    f"[Validator] upload_id={upload['upload_id']} "
    f"category_raw={upload['category']!r} "
    f"category_normalized={category!r} "
    f"policy_limit_keys={list(policy_daily_limits.keys())} "
    f"disallowed_keys={list(disallowed_items.keys())}"
    )

    base.update({
        "ocr_raw_text": ocr.get("ocr_raw_text"),
        "ocr_merchant": ocr.get("merchant"),
        "ocr_date": ocr.get("ocr_date"),
        "ocr_amount": ocr.get("amount"),
        "ocr_currency": ocr.get("currency", "INR"),
        "ocr_confidence": ocr.get("confidence"),
        "expense_summary": ocr.get("expense_summary"),
        "detected_doc_type": ocr.get("detected_doc_type"),
    })

    # ---------------------------------------------------------
    # Step 3: OCR sanity checks
    # ---------------------------------------------------------
    if ocr.get("confidence") == "low":
        return {
            **base,
            "status": "REVIEW",
            "review_reason": "OCR confidence too low.",
        }

    if ocr.get("ocr_date") is None:
        return {
            **base,
            "status": "REVIEW",
            "review_reason": "Could not extract receipt date.",
        }

    if ocr.get("amount") is None:
        return {
            **base,
            "status": "REVIEW",
            "review_reason": "Could not extract receipt amount.",
        }
    try:
        receipt_date = ocr.get("ocr_date")
        claim_date = upload.get("claim_date")

        # normalize if needed (in case string vs date mismatch)
        if isinstance(receipt_date, str):
            receipt_date = receipt_date.split("T")[0]

        if isinstance(claim_date, str):
            claim_date = claim_date.split("T")[0]

        if receipt_date != claim_date:
            return {
                **base,
                "status": "REJECTED",
                "rejection_reason": (
                    f"Receipt date ({receipt_date}) does not match claim date ({claim_date})."
                ),
            }

    except Exception as e:
        return {
        **base,
        "status": "REVIEW",
        "review_reason": f"Date validation error: {e}",
        }

    # ---------------------------------------------------------
    # Step 4: Document type validation
    # ---------------------------------------------------------
    doc_type = ocr.get("detected_doc_type", "unknown")

    NON_REIMBURSABLE_DOCS = {
        "flight_ticket",
        "hotel_booking_confirmation",
        "boarding_pass",
    }

    if doc_type in NON_REIMBURSABLE_DOCS:
        return {
            **base,
            "status": "REJECTED",
            "rejection_reason":
                f"{doc_type.replace('_',' ').title()} is company-arranged and not reimbursable.",
        }

    if doc_type == "unknown":
        return {
            **base,
            "status": "REVIEW",
            "review_reason": "Unknown document type.",
        }

    # ---------------------------------------------------------
    # Step 5: Expense categorization
    # ---------------------------------------------------------
    inferred = categorize_expense(
        merchant=ocr.get("merchant", ""),
        line_items=ocr.get("line_items", []),
        expense_summary=ocr.get("expense_summary", ""),
    )

    if inferred == "non-reimbursable":
        return {
            **base,
            "status": "REJECTED",
            "rejection_reason": "Expense is non-reimbursable.",
        }

    if not inferred_matches_uploaded(inferred, category):
        from app.services.expense_categorizer import CATEGORY_MAP

        inferred_display = CATEGORY_MAP.get(inferred, inferred)

        return {
            **base,
            "status": "REJECTED",
            "rejection_reason":
                f"Uploaded as '{category}' but appears to be '{inferred_display}'.",
        }

    # ---------------------------------------------------------
    # Step 6: Misc description validation
    # ---------------------------------------------------------
    if category == "misc":

        if len(description.strip()) < 5:
            return {
                **base,
                "status": "REVIEW",
                "review_reason":
                    "Miscellaneous expenses require a description.",
            }

        if not description_matches_receipt(
            user_description=description,
            expense_summary=ocr.get("expense_summary", ""),
            line_items=ocr.get("line_items", []),
        ):
            return {
                **base,
                "status": "REJECTED",
                "rejection_reason":
                    "Description does not match the uploaded receipt.",
            }

    # ---------------------------------------------------------
    # Step 7: Policy disallowed items
    # ---------------------------------------------------------
    disallowed_for_category = disallowed_items.get(category, set())

    if disallowed_for_category:

        for item in [x.lower() for x in ocr.get("line_items", [])]:

            for banned in disallowed_for_category:

                if banned in item:

                    return {
                        **base,
                        "status": "REJECTED",
                        "rejection_reason":
                            f"'{item}' is not reimbursable under policy.",
                    }

    # ---------------------------------------------------------
    # Step 8: Currency conversion
    # ---------------------------------------------------------
    amount_inr = to_inr(
        float(ocr.get("amount")),
        ocr.get("currency", "INR"),
    )

    base["ocr_amount_inr"] = amount_inr

    # ---------------------------------------------------------
    # Step 9: Daily budget validation
    # ---------------------------------------------------------
    result = enforce_budget(
        category=category,
        amount_inr=amount_inr,
        day_number=day_number,
        policy_daily_limits=policy_daily_limits,
        daily_totals=daily_totals,
    )

    if not result["approved"]:

        status = "REVIEW" if result.get("needs_review") else "REJECTED"

        return {
            **base,
            "status": status,
            "review_reason" if status == "REVIEW" else "rejection_reason": result["reason"],
        }

    # ---------------------------------------------------------
    # Step 10: Approved
    # ---------------------------------------------------------
    return {
        **base,
        "status": "APPROVED",
    }

# ---------------------------------------------------------------------------
# DB write helpers
# ---------------------------------------------------------------------------

def _write_upload_verdict(upload_id: int, verdict: dict, db: Session) -> None:
    db.execute(
        text("""
            UPDATE claim_uploads
            SET
                ocr_raw_text      = :ocr_raw_text,
                ocr_merchant      = :ocr_merchant,
                ocr_date          = :ocr_date,
                ocr_amount        = :ocr_amount,
                ocr_currency      = :ocr_currency,
                ocr_amount_inr    = :ocr_amount_inr,
                ocr_confidence    = :ocr_confidence,
                detected_doc_type = :detected_doc_type,
                status            = :status,
                rejection_reason  = :rejection_reason,
                review_reason     = :review_reason,
                processed_at      = :processed_at
            WHERE upload_id = :upload_id
        """),
        {
            "upload_id":        upload_id,
            "ocr_raw_text":     verdict.get("ocr_raw_text"),
            "ocr_merchant":     verdict.get("ocr_merchant"),
            "ocr_date":         verdict.get("ocr_date"),
            "ocr_amount":       verdict.get("ocr_amount"),
            "ocr_currency":     verdict.get("ocr_currency", "INR"),
            "ocr_amount_inr":   verdict.get("ocr_amount_inr"),
            "ocr_confidence":   verdict.get("ocr_confidence"),
            "detected_doc_type": verdict.get("detected_doc_type"),
            "status":           verdict["status"],
            "rejection_reason": verdict.get("rejection_reason"),
            "review_reason":    verdict.get("review_reason"),
            "processed_at":     datetime.now(timezone.utc),
        }
    )
    db.commit()
    logger.info(f"[Validator] upload_id={upload_id} → {verdict['status']}")


def _rollup_claim_status(claim_id: int, db: Session) -> None:
    """
    FLAGGED_FOR_REVIEW  — any upload needs HITL (takes priority over everything)
    APPROVED            — all uploads approved
    REJECTED            — all uploads rejected
    PARTIALLY_APPROVED  — mix of approved + rejected, no review ones
    """
    rows = db.execute(
        text("SELECT status FROM claim_uploads WHERE claim_id = :cid"),
        {"cid": claim_id}
    ).mappings().all()

    statuses = {row["status"] for row in rows}

    if "REVIEW" in statuses:
        claim_status = "FLAGGED_FOR_REVIEW"
    elif statuses == {"APPROVED"}:
        claim_status = "APPROVED"
    elif statuses == {"REJECTED"}:
        claim_status = "REJECTED"
    else:
        claim_status = "PARTIALLY_APPROVED"

    _update_claim_status(claim_id, claim_status, db)
    logger.info(f"[Validator] claim_id={claim_id} rolled up → {claim_status}")


def _update_claim_status(claim_id: int, status: str, db: Session) -> None:
    db.execute(
        text("UPDATE claims SET status = :status, updated_at = :now WHERE claim_id = :cid"),
        {"status": status, "cid": claim_id, "now": datetime.now(timezone.utc)}
    )
    db.commit()


# ---------------------------------------------------------------------------
# Verdict shape helpers
# ---------------------------------------------------------------------------

def _empty_verdict() -> dict:
    return {
        "ocr_raw_text":    None,
        "ocr_merchant":    None,
        "ocr_date":        None,
        "ocr_amount":      None,
        "ocr_currency":    "INR",
        "ocr_amount_inr":  None,
        "ocr_confidence":  None,
        "detected_doc_type": None,
        "status":          "PENDING",
        "rejection_reason": None,
        "review_reason":   None,
    }


def _error_verdict(reason: str) -> dict:
    return {**_empty_verdict(), "status": "REVIEW", "review_reason": reason}
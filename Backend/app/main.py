from datetime import datetime
from fastapi import Depends, FastAPI
import httpx
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File,Form, HTTPException, BackgroundTasks
from pathlib import Path
from collections import OrderedDict
from realtime import List
from app.services.validate_policy_db import ensure_policy_extracted
from app.services.upload_and_validate import process_uploads_and_validate
from app.services.ingest import ingest_file
import os
from app.graph.graph import graph
import cloudinary.uploader
from sqlalchemy.orm import Session
from app.database.db import get_db
from sqlalchemy import text
import uuid
import requests
from fastapi.security import OAuth2PasswordRequestForm
from app.core.auth import verify_password, create_access_token, verify_admin
from datetime import date
from app.core.auth import get_current_user, get_current_admin
from app.services.claim_validator import run_claim_validation
from app.services.check_policy_metadata import is_policy_extracted
from app.services.rollup_claim_status import rollup_claim_status
from app.schemas.claim_schemas import UploadMetadata
import logging
import json
from pydantic import ValidationError



POLICY_PATH = Path("data/ABC Global Technologies Travel and Expense Policy.pdf")  # place your PDF here on server
SHARED_INDEX_DIR = Path("faiss_index/shared")
SHARED_DATA_DIR = Path("data/shared")


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origins=["http://localhost:5173", "https://business-travel-expense-agent.vercel.app"]
)

# class QueryRequest(BaseModel):
#     session_id: str
#     message: str

logging.basicConfig(level=logging.INFO)

class IngestRequest(BaseModel):
    policy_id : int
    policy_path : str

class AdminSessionRequest(BaseModel):
    policy_id: int

class ChatRequest(BaseModel):
    session_id: str
    policy_id: int
    vector_path :str
    chat_mode: str
    message: str

class EmployeeClaimSessionRequest(BaseModel):
    travel_start: str
    travel_end: str


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT emp_id, emp_name, password_hash FROM users WHERE emp_id = :emp_id"),
        {"emp_id": form_data.username}
    ).mappings().first()

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["emp_id"], "name": user["emp_name"]})
    return {"access_token": token, "token_type": "bearer", "emp_name": user["emp_name"]}


@app.post("/admin-login")
def admin_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if not verify_admin(form_data.username, form_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": form_data.username})

    return {"access_token": token,"token_type": "bearer", "admin_id":form_data.username}

@app.get("/")
def root():
    print("GET / HIT")
    return {"status": "ok"}


@app.post("/hitl")
async def hitl():
    """
    Future Human-in-the-Loop endpoint.
    """
    return {
        "message": "HITL workflow not implemented yet."
    }


@app.post("/initiate-ingest")
async def initiate_ingest(request: IngestRequest, db: Session = Depends(get_db)):
    print("POST /initiate-ingest HIT")
    print("Starting ingestion...")
    storage_path = ingest_file(request.policy_path, request.policy_id)
    print("Ingestion complete.")
    db.execute(
        text("""UPDATE policies 
                SET is_active = TRUE, ingested = TRUE, 
                vector_path = :vector_path, updated_at = NOW() 
                WHERE policy_id = :id"""),
        {"vector_path": storage_path, "id": request.policy_id}
    )
    db.commit()
    return {"ingestion_complete": True, "vector_path": storage_path}


@app.get("/check-ingest/{policy_id}")
async def check_ingest(policy_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT ingested FROM policies WHERE policy_id = :id"),
        {"id": policy_id}
    ).mappings().first()
    return {"ingested": result["ingested"] if result else False}


@app.post("/activate-policy/{policy_id}")
async def activate_policy(policy_id: int, db: Session = Depends(get_db),admin_id: str = Depends(get_current_admin)):
    db.execute(
        text("UPDATE policies SET is_active = TRUE, updated_at = NOW() WHERE policy_id = :id"),
        {"id": policy_id}
    )
    db.commit()
    return {"activated": True}

@app.post("/deactivate-policy/{policy_id}")
async def deactivate_policy(policy_id: int, db: Session = Depends(get_db),admin_id: str = Depends(get_current_admin)):
    db.execute(
        text("UPDATE policies SET is_active = FALSE, updated_at = NOW() WHERE policy_id = :id"),
        {"id": policy_id}
    )
    db.commit()
    return {"deactivated": True}


@app.get("/policies")
def get_policies(db: Session = Depends(get_db),admin_id: str = Depends(get_current_admin)):
    result = db.execute(
        text("""SELECT policy_id,policy_name,file_path,valid_from,valid_till,is_active,ingested,created_at FROM policies WHERE is_deleted = FALSE ORDER BY created_at DESC"""))
    return {"policies": result.mappings().all()}


@app.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    valid_from: str = Form(...),
    valid_to: str = Form(...),
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_admin)
    ):

    # 1. Upload to Cloudinary
    upload_result = cloudinary.uploader.upload(
        file.file,
        folder="home/travel-policies",
        resource_type="raw"
    )
    file_url = upload_result["secure_url"]
    policy_name = file.filename.replace("_", " ").replace(".pdf", "").title()
    valid_from_dt = datetime.strptime(valid_from, "%Y-%m-%d")
    valid_to_dt = datetime.strptime(valid_to, "%Y-%m-%d")

    if valid_from_dt > valid_to_dt:
        raise HTTPException(
            status_code=400,
            detail="Invalid date range"
        )
    
    # 3. Insert into DB (matching your schema)
    db.execute(
        text("""
             INSERT INTO policies (policy_name,file_path,valid_from,valid_till,ingested,is_active,vector_path,is_deleted,deleted_at,created_at,updated_at)VALUES (:policy_name,:file_path,:valid_from,:valid_to,FALSE,FALSE,NULL,FALSE,NULL,NOW(),NOW())"""),{"policy_name": policy_name,"file_path": file_url,"valid_from":valid_from_dt,"valid_to":valid_to_dt})
    db.commit()
    return {
        "message": "Policy uploaded successfully"
    }

@app.get("/get-active-policies")
async def get_active_policies(db: Session = Depends(get_db)):
    result=db.execute(
    text(""" SELECT policy_id,policy_name from policies WHERE is_active = TRUE ORDER BY created_at DESC""")
    )
    policies = [dict(row) for row in result.mappings().all()]
    return {"active_policies": policies}


@app.post("/admin-chat-session")
async def create_admin_chat_session(request: AdminSessionRequest,db: Session = Depends(get_db),admin_id: str = Depends(get_current_admin)):
    policy = db.execute(text("""SELECT policy_id,file_path,vector_path FROM policies WHERE policy_id = :policy_id AND is_deleted = FALSE"""),{"policy_id": request.policy_id}).mappings().first()

    if not policy:
        raise HTTPException(
            status_code=404,
            detail="Policy not found"
        )
    file_path = policy["file_path"]
    vector_path = policy["vector_path"]

    if not vector_path:
        print("Starting ingestion...")
        vector_path = ingest_file(file_path, request.policy_id)
        print("Ingestion complete!")
        db.execute(text("""UPDATE policies SET ingested = TRUE , vector_path = :vector_path WHERE policy_id = :policy_id"""),{"vector_path": vector_path, "policy_id":request.policy_id})

    session_id = str(uuid.uuid4())

    return {
        "session_id": session_id,
        "policy_id": request.policy_id,
        "vector_path" :vector_path,
        "chat_mode": "admin_test"
    }

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    vector_path = request.vector_path
    initial_state = {
        "session_id": request.session_id,
        "policy_id": request.policy_id,
        "chat_mode": request.chat_mode,
        "user_message": request.message,
        "vector_path": vector_path
    }
    llm_result = graph.invoke(
        initial_state,
        config={
            "configurable": {
                "thread_id": request.session_id
            }
        }
    )
    return {
    "response": llm_result["final_response"],
    "retrieved_chunks": llm_result.get("retrieved_chunks", []),
    "retrieval_confidence": llm_result.get("retrieval_confidence", None)
}

@app.post("/employee-claim-session")
async def create_employee_claim_session(request: EmployeeClaimSessionRequest, db: Session = Depends(get_db)):
    policy = db.execute(
        text("""SELECT policy_id, file_path, vector_path
        FROM policies
        WHERE is_deleted = FALSE
          AND :travel_start >= valid_from
          AND :travel_end <= valid_till
        ORDER BY valid_from DESC
        LIMIT 1"""),{"travel_start": request.travel_start, "travel_end":request.travel_end}).mappings().first()

    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")

    vector_path = policy["vector_path"]
    file_path = policy["file_path"]
    policy_id = policy["policy_id"]

    if not vector_path:
        print("Starting ingestion...")
        vector_path = ingest_file(file_path,policy_id)
        print("Ingestion complete!")
        db.execute(text("""UPDATE policies SET ingested = TRUE , vector_path = :vector_path WHERE policy_id = :policy_id"""),{"vector_path": vector_path, "policy_id":policy_id})

    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "policy_id": policy_id,
        "vector_path": vector_path,
        "chat_mode": "claim_query",
    }


@app.post("/employee-travel-session")
async def create_employee_travel_session(db: Session = Depends(get_db)):
    policy = db.execute(
        text("""SELECT policy_id,vector_path FROM policies 
                WHERE is_active = TRUE AND is_deleted = FALSE 
                ORDER BY updated_at DESC LIMIT 1""")
    ).mappings().first()

    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")

    vector_path = policy["vector_path"]
    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "policy_id": policy["policy_id"],
        "vector_path": vector_path,
        "chat_mode": "travel_query"
    }

logger = logging.getLogger(__name__)

@app.post("/claims/submit-claim")
async def submit_claim(
    background_tasks: BackgroundTasks,
    travel_id: int = Form(...),
    metadata: str = Form(...),          # JSON string: List[UploadMetadata]
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    emp_id: str = Depends(get_current_user),
):
    # ---------- 1. Parse + validate metadata shape ----------
    try:
        raw_meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="metadata is not valid JSON")

    if not isinstance(raw_meta, list) or len(raw_meta) == 0:
        raise HTTPException(status_code=400, detail="metadata must be a non-empty array")

    try:
        parsed_meta = [UploadMetadata(**m) for m in raw_meta]
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata entry: {e}")

    # ---------- 2. Re-validate travel belongs to this employee ----------
    # Note: dates were already checked once in /validate-travel, but we re-check here
    # because that's a separate request — a client could call /submit-claim directly
    # or with stale/tampered travel_id, so don't trust the frontend blindly.
    travel = db.execute(
        text("""
            SELECT id, travel_start_date, travel_end_date
            FROM travel_requests
            WHERE id = :travel_id AND emp_id = :emp_id
        """),
        {"travel_id": travel_id, "emp_id": emp_id}
    ).mappings().first()

    if not travel:
        raise HTTPException(status_code=400, detail="No matching travel request found for this employee")

    trip_start: date = travel["travel_start_date"]
    trip_end: date = travel["travel_end_date"]
    duration_days = (trip_end - trip_start).days + 1

    
    # ---------- 3. Resolve the policy version active for these travel dates ----------
    policy = db.execute(
        text("""
            SELECT policy_id
            FROM policies
            WHERE is_deleted = FALSE
              AND valid_from <= :start_date
              AND (valid_till IS NULL OR valid_till >= :end_date)
            ORDER BY valid_from DESC
            LIMIT 1
        """),
        {"start_date": trip_start, "end_date": trip_end}
    ).mappings().first()
    
    if not policy:
        raise HTTPException(
            status_code=400,
            detail="No active policy version covers these travel dates"
        )
    policy_version_id = policy["policy_id"]

    has_policy_metadata = is_policy_extracted(policy_version_id, db)
    initial_status = "PENDING" if has_policy_metadata else "SYSTEM_PENDING"

    # ---------- 4. Validate every metadata entry's day_number/claim_date fall inside the trip ----------
    from datetime import timedelta

    for m in parsed_meta:
        if m.day_number < 1 or m.day_number > duration_days:
            raise HTTPException(
                status_code=400,
                detail=f"day_number {m.day_number} is out of range for a {duration_days}-day trip"
            )
        expected_date = trip_start + timedelta(days=m.day_number - 1)
        if m.claim_date != expected_date:
            raise HTTPException(
                status_code=400,
                detail=f"claim_date {m.claim_date} does not match day_number {m.day_number} "
                       f"(expected {expected_date})"
            )

    # ---------- 5. Create the claim header row ----------
    claim_row = db.execute(
    text("""
        INSERT INTO claims (travel_id, emp_id, policy_version_id, trip_start_date,
                             trip_end_date, duration_days, status)
        VALUES (:travel_id, :emp_id, :policy_version_id, :trip_start_date,
                :trip_end_date, :duration_days, :status) -- <-- Changed 'PENDING' to :status here
        RETURNING claim_id
    """),
    {
        "travel_id": travel_id,
        "emp_id": emp_id,
        "policy_version_id": policy_version_id,
        "trip_start_date": trip_start,
        "trip_end_date": trip_end,
        "duration_days": duration_days,
        "status": initial_status,  # <-- This will now correctly map to the DB!
    }
    ).mappings().first()
    claim_id = claim_row["claim_id"]
    db.commit()
    files_data = []
    try:
        for f, m in zip(files, parsed_meta):
            file_bytes = await f.read()
            files_data.append({
                "content": file_bytes,
                "metadata": m
            })
    except Exception as e:
        logger.exception("Failed to read upload buffers.")
        raise HTTPException(status_code=500, detail="Failed to read file buffers.")

    # ---------- 9. Offload Cloudinary uploads & claim_uploads inserts ----------
    background_tasks.add_task(
        process_uploads_and_validate,
        claim_id,
        emp_id,
        files_data,
        initial_status
    )

    return {
        "claim_id": claim_id,
        "status": initial_status,
        "duration_days": duration_days,
        "total_uploads": len(files),
        "message": (
            "Claim submitted successfully. Validation is running in the background."
            if initial_status == "PENDING" else
            "Claim submitted but cannot be processed due to a system setup error. It will resume automatically once the administrator updates settings."
        )
    }

@app.get("/my-claims")
def my_claims(db: Session = Depends(get_db), emp_id: str = Depends(get_current_user)):
    rows = db.execute(text("""
        SELECT 
            c.claim_id,
            c.status,
            c.trip_start_date,
            c.trip_end_date,
            c.duration_days,
            c.created_at,
            COUNT(u.upload_id) AS total_uploads,
            COUNT(CASE WHEN u.status = 'APPROVED' THEN 1 END) AS approved_count,
            COUNT(CASE WHEN u.status = 'REJECTED' THEN 1 END) AS rejected_count,
            COUNT(CASE WHEN u.status = 'REVIEW' THEN 1 END) AS review_count
        FROM claims c
        LEFT JOIN claim_uploads u ON c.claim_id = u.claim_id
        WHERE c.emp_id = :emp_id
        GROUP BY c.claim_id, c.status, c.trip_start_date, c.trip_end_date, c.duration_days, c.created_at
        ORDER BY c.created_at DESC
    """), {"emp_id": emp_id}).mappings().all()

    return {"claims": [dict(r) for r in rows]}

class TravelValidationRequest(BaseModel):
    start_date: date
    end_date: date

@app.post("/claims/validate-travel")
def validate_travel(req: TravelValidationRequest, db: Session = Depends(get_db), emp_id: str = Depends(get_current_user)):

    travel = db.execute(
        text("""
        SELECT *
        FROM travel_requests
        WHERE emp_id = :emp_id
          AND travel_start_date = :start_date
          AND travel_end_date = :end_date
        LIMIT 1
        """),
        {
            "emp_id": emp_id,
            "start_date": req.start_date,
            "end_date": req.end_date
        }
    ).mappings().first()

    if not travel:
        return {
            "valid": False,
            "travel_id": None,
            "duration_days": 0,
            "policy_id": None,
            "message": "No matching travel request found"
        }
    start: date = travel.travel_start_date
    end: date = travel.travel_end_date
    duration_days = (end - start).days + 1

    return {
        "valid": True,
        "travel_id": travel.id,
        "duration_days": duration_days,
        "policy_id": 1,
        "message": "Travel validated"
    }


@app.get("/claims/{claim_id}/details")
def get_claim_details(
    claim_id: int,
    db: Session = Depends(get_db),
    emp_id: str = Depends(get_current_user),
):
    # 1. Fetch Claim Header metadata (Claim details + Travel request destination)
    # Note: We assume a 'users' or 'employees' table exists to fetch the 'emp_name'.
    header_row = db.execute(
        text("""
            SELECT 
                c.claim_id,
                c.emp_id,
                c.status,
                c.trip_start_date,
                c.trip_end_date,
                c.duration_days,
                c.created_at,
                tr.destination,
                u.emp_name
            FROM claims c
            LEFT JOIN travel_requests tr ON c.travel_id = tr.id
            LEFT JOIN users u ON c.emp_id = u.emp_id
            WHERE c.claim_id = :claim_id AND c.emp_id = :emp_id
        """),
        {"claim_id": claim_id, "emp_id": emp_id}
    ).mappings().first()

    if not header_row:
        raise HTTPException(status_code=404, detail="Claim not found")

    # 2. Fetch all uploads for day-wise aggregation
    rows = db.execute(
        text("""
            SELECT day_number, claim_date, status, rejection_reason, review_reason 
            FROM claim_uploads 
            WHERE claim_id = :claim_id 
            ORDER BY day_number ASC
        """),
        {"claim_id": claim_id},
    ).mappings().all()

    days_map = OrderedDict()
    overall = {"approved": 0, "rejected": 0, "flagged_for_review": 0, "total_docs": 0}

    STATUS_BUCKET = {
        "approved": "approved",
        "rejected": "rejected",
        "review": "flagged_for_review"
    }
 
    for row in rows:
        day_num = row["day_number"]
        if day_num not in days_map:
            days_map[day_num] = {
                "day_number": day_num,
                "date": row["claim_date"],
                "summary": {"approved": 0, "rejected": 0, "flagged_for_review": 0, "total_docs": 0},
            }
 
        bucket = STATUS_BUCKET.get((row["status"] or "").lower())
 
        days_map[day_num]["summary"]["total_docs"] += 1
        overall["total_docs"] += 1
 
        if bucket:
            days_map[day_num]["summary"][bucket] += 1
            overall[bucket] += 1
 
    return {
        "claim": {
            "claim_id": header_row["claim_id"],
            "emp_id": header_row["emp_id"],
            "emp_name": header_row["emp_name"] or "Unknown Employee",
            "status": header_row["status"],
            "trip_start_date": header_row["trip_start_date"],
            "trip_end_date": header_row["trip_end_date"],
            "duration_days": header_row["duration_days"],
            "created_at": header_row["created_at"],
            "destination": header_row["destination"] or "N/A"
        },
        "overall_summary": overall,
        "days": list(days_map.values()),
    }

@app.get("/claims/{claim_id}/days/{day_number}/details")
def get_day_details(
    claim_id: int,
    day_number: int,
    db: Session = Depends(get_db),
    emp_id: str = Depends(get_current_user),
):
    rows = db.execute(
        text("""
            SELECT 
                upload_id, 
                claim_date, 
                detected_doc_type, 
                category, 
                ocr_amount, 
                ocr_currency, 
                ocr_amount_inr,
                status, 
                rejection_reason, 
                review_reason,
                file_url       
            FROM claim_uploads 
            WHERE claim_id = :claim_id AND day_number = :day_number 
            ORDER BY upload_id ASC
        """),
        {"claim_id": claim_id, "day_number": day_number},
    ).mappings().all()
 
    if not rows:
        raise HTTPException(status_code=404, detail="No documents found for this day")
 
    STATUS_BUCKET = {
        "approved": "approved",
        "rejected": "rejected",
        "review": "flagged_for_review"
    }
 
    summary = {"approved": 0, "rejected": 0, "flagged_for_review": 0, "total_docs": 0}
    documents = []
 
    for row in rows:
        summary["total_docs"] += 1
        bucket = STATUS_BUCKET.get((row["status"] or "").lower())
        if bucket:
            summary[bucket] += 1
 
        status_lower = (row["status"] or "").lower()
        if status_lower == "rejected":
            reason = row["rejection_reason"]
        elif status_lower in ("review", "flagged for review", "flagged_for_review"): # Catches "review"
            reason = row["review_reason"]
        else:
            reason = None
 
        documents.append({
            "upload_id": row["upload_id"],
            "doc_type": row["detected_doc_type"],
            "category": row["category"],
            "amount": row["ocr_amount"],
            "currency": row["ocr_currency"],
            "amount_inr": row["ocr_amount_inr"],
            "status": row["status"],
            "reason": reason,
            "file_url": row["file_url"]
        })
 
    return {
        "claim_id": claim_id,
        "day_number": day_number,
        "date": rows[0]["claim_date"],
        "summary": summary,
        "documents": documents,
    }

@app.get("/populate-fetch-policies")
def populate_fetch_policies(db: Session = Depends(get_db)):
    policy_row = db.execute(
        text("""
            SELECT policy_id, policy_name, file_path, valid_from, valid_till, is_populated
            FROM policies 
            WHERE is_deleted = FALSE
            ORDER BY valid_from DESC
        """)).mappings().all()

    if not policy_row:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Check database state to tell frontend which button to disable/enable
    return {"policies": [dict(r) for r in policy_row]}

class PopulatePolicyRequest(BaseModel):
    policy_id : int
    file_path : str

@app.post("/populate-policy")
def populate_policy(
    req: PopulatePolicyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        # 1. Run the extraction service (this writes to policy_limits & policy_items)
        ensure_policy_extracted(policy_id=req.policy_id, db=db, file_path=req.file_path)
        db.execute(
        text("UPDATE policies SET is_populated = TRUE WHERE policy_id = :pid"),
        {"pid": req.policy_id}
        )
        db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to populate policy metadata: {str(e)}"
        )

    # 2. Query all SYSTEM_PENDING claims referencing this policy version
    stalled_claims = db.execute(
        text("""
            SELECT claim_id 
            FROM claims 
            WHERE status = 'SYSTEM_PENDING' AND policy_version_id = :pid
        """),
        {"pid": req.policy_id}
    ).mappings().all()

    # 3. Batch-update status of these claims to 'PENDING' 
    # This ensures the employee instantly sees "Pending" (Processing) on their dashboard [2]
    if stalled_claims:
        claim_ids = [row["claim_id"] for row in stalled_claims]
        db.execute(
            text("""
                UPDATE claims 
                SET status = 'PENDING', updated_at = NOW()
                WHERE claim_id IN :ids
            """),
            {"ids": tuple(claim_ids)}
        )
        db.commit() # Safely commit the state updates

        # 4. Offload validation for each claim to background tasks
        for cid in claim_ids:
            background_tasks.add_task(run_claim_validation, cid)

    return {
        "message": "Policy metadata populated successfully.",
        "reprocessed_claims_count": len(stalled_claims)
    }

class RevokePolicyRequest(BaseModel):
    policy_id: int

@app.post("/revoke-policy")
def revoke_policy(req: RevokePolicyRequest, db: Session = Depends(get_db)):
    # 1. Physically delete metadata from both limit and item tables
    db.execute(
        text("DELETE FROM policy_limits WHERE policy_version_id = :pid"),
        {"pid": req.policy_id}
    )
    db.execute(
        text("DELETE FROM policy_items WHERE policy_version_id = :pid"),
        {"pid": req.policy_id}
    )

    db.execute(
        text("UPDATE policies SET is_populated = FALSE WHERE policy_id = :pid"),
        {"pid": req.policy_id}
    )
    db.commit()

    return {
        "message": f"Policy {req.policy_id} metadata successfully revoked.",
        "policy_id": req.policy_id
    }

@app.get("/admin/flagged-receipts")
def get_flagged_receipts(
    db: Session = Depends(get_db),
    admin_id : str = Depends(get_current_admin)
    ):
    rows = db.execute(
        text("""
            SELECT 
                u.upload_id,
                u.claim_id,
                c.emp_id,
                usr.emp_name,
                u.created_at,
                u.status
            FROM claim_uploads u
            JOIN claims c ON u.claim_id = c.claim_id
            JOIN users usr ON c.emp_id = usr.emp_id
            WHERE LOWER(u.status) IN ('review', 'flagged for review', 'flagged_for_review')
            ORDER BY u.created_at DESC
        """)
    ).mappings().all()

    return {"flagged_receipts": [dict(r) for r in rows]}

@app.get("/admin/flagged-receipts/{upload_id}")
def get_flagged_receipt_details(
    upload_id: int,
    db: Session = Depends(get_db),
    admin_id : str = Depends(get_current_admin)
    ):
    """
    Retrieves complete metadata, OCR parameters, travel dates, 
    and all associated policy rules for a single flagged upload ID.
    """
    # 1. Fetch deep upload metadata, travel request, and policy header
    # NOTE: 'travel_request' maps to your exact table schema name
    upload_row = db.execute(
        text("""
            SELECT 
                u.upload_id,
                u.claim_id,
                c.emp_id,
                usr.emp_name,
                u.category,
                u.created_at AS upload_created_at,
                u.review_reason,
                u.file_url,
                u.ocr_confidence,
                u.ocr_raw_text,
                u.ocr_merchant,
                u.ocr_amount,
                u.ocr_currency,
                u.ocr_amount_inr, -- Selecting corrected column name
                u.ocr_date,
                u.detected_doc_type,
                -- Policy general info
                p.policy_id,
                p.policy_name,
                -- Travel Request fields
                tr.id AS travel_id,
                tr.destination,
                tr.travel_start_date,
                tr.travel_end_date,
                tr.purpose
            FROM claim_uploads u
            JOIN claims c ON u.claim_id = c.claim_id
            JOIN users usr ON c.emp_id = usr.emp_id
            JOIN policies p ON c.policy_version_id = p.policy_id
            LEFT JOIN travel_request tr ON c.travel_id = tr.id
            WHERE u.upload_id = :upload_id
        """),
        {"upload_id": upload_id}
    ).mappings().first()

    if not upload_row:
        raise HTTPException(status_code=404, detail="Flagged receipt not found.")

    upload_data = dict(upload_row)
    policy_id = upload_data["policy_id"]

    # 2. Extract OCR line items dynamically from the full raw text
    # Splitting raw text by lines ensures you have a list of strings for the UI
    raw_text = upload_data.get("ocr_raw_text") or ""
    upload_data["ocr_line_items"] = [line.strip() for line in raw_text.split("\n") if line.strip()]

    # 3. Fetch all policy limits associated with this policy version
    # NOTE: Maps 'catrgory' alias to standard 'category' to protect frontend execution
    policy_limits = db.execute(
        text("""
            SELECT id, policy_version_id, travel_type, catrgory AS category, daily_limit, currency 
            FROM policy_limits 
            WHERE policy_version_id = :pid
        """),
        {"pid": policy_id}
    ).mappings().all()

    # 4. Fetch all policy items associated with this policy version
    policy_items = db.execute(
        text("""
            SELECT id, policy_version_id, travel_type, category, item_name, isallowed, per_item_limit, currency, notes 
            FROM policy_items 
            WHERE policy_version_id = :pid
        """),
        {"pid": policy_id}
    ).mappings().all()

    return {
        "upload_details": upload_data,
        "policy_limits": [dict(row) for row in policy_limits],
        "policy_items": [dict(row) for row in policy_items]
    }

class ApproveUploadRequest(BaseModel):
    approval_reason : str
@app.post("/admin/flagged-receipts/{upload_id}/approve")
def approve_flagged_receipt(
    upload_id: int,
    req: ApproveUploadRequest,
    db: Session = Depends(get_db)
):
    # 1. Fetch the upload to identify the parent claim_id
    upload = db.execute(
        text("SELECT claim_id, status FROM claim_uploads WHERE upload_id = :uid"),
        {"uid": upload_id}
    ).mappings().first()

    if not upload:
        raise HTTPException(status_code=404, detail="Receipt upload not found.")

    claim_id = upload["claim_id"]

    # 2. Update status of the individual upload and save the mandatory approval_reason
    db.execute(
        text("""
            UPDATE claim_uploads 
            SET status = 'APPROVED', 
                approval_reason = :reason, 
                processed_at = NOW() 
            WHERE upload_id = :uid
        """),
        {"reason": req.approval_reason, "uid": upload_id}
    )

    # 3. Call API 5 status rollup to dynamically recalculate and update parent claim status
    new_claim_status = rollup_claim_status(claim_id, db)

    # Commit both changes securely within the same transaction
    db.commit()

    return {
        "message": "Receipt approved successfully.",
        "upload_id": upload_id,
        "claim_id": claim_id,
        "new_claim_status": new_claim_status
    }

class RejectPolicyRequest(BaseModel):
    rejection_reason: str

@app.post("/admin/flagged-receipts/{upload_id}/reject")
def reject_upload(
    upload_id: int,
    req: RejectPolicyRequest,
    db: Session = Depends(get_db)
):
    # 1. Fetch parent claim_id
    upload = db.execute(
        text("SELECT claim_id FROM claim_uploads WHERE upload_id = :uid"),
        {"uid": upload_id}
    ).mappings().first()

    if not upload:
        raise HTTPException(status_code=404, detail="Receipt upload not found.")

    claim_id = upload["claim_id"]

    # 2. Update status to REJECTED and write rejection_reason
    db.execute(
        text("""
            UPDATE claim_uploads 
            SET status = 'REJECTED', 
                rejection_reason = :reason, 
                processed_at = NOW() 
            WHERE upload_id = :uid
        """),
        {"reason": req.rejection_reason, "uid": upload_id}
    )

    # 3. Call API 5 status rollup
    new_claim_status = rollup_claim_status(claim_id, db)

    db.commit()

    return {
        "message": "Receipt rejected successfully.",
        "upload_id": upload_id,
        "claim_id": claim_id,
        "new_claim_status": new_claim_status
    }
from datetime import datetime
from fastapi import Depends, FastAPI
import httpx
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File,Form, HTTPException
from pathlib import Path
from app.database.db import get_db
from app.services.ingest import ingest_file
import os
from app.graph.graph import graph
import cloudinary.uploader
from sqlalchemy.orm import Session
from app.database.db import get_db
from sqlalchemy import text
import uuid
import requests




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
async def activate_policy(policy_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE policies SET is_active = TRUE, updated_at = NOW() WHERE policy_id = :id"),
        {"id": policy_id}
    )
    db.commit()
    return {"activated": True}

@app.post("/deactivate-policy/{policy_id}")
async def deactivate_policy(policy_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE policies SET is_active = FALSE, updated_at = NOW() WHERE policy_id = :id"),
        {"id": policy_id}
    )
    db.commit()
    return {"deactivated": True}


@app.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    result = db.execute(
        text("""SELECT policy_id,policy_name,file_path,valid_from,valid_till,is_active,ingested,created_at FROM policies WHERE is_deleted = FALSE ORDER BY created_at DESC"""))
    return {"policies": result.mappings().all()}


@app.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    valid_from: str = Form(...),
    valid_to: str = Form(...),
    db: Session = Depends(get_db)
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
async def create_admin_chat_session(request: AdminSessionRequest,db: Session = Depends(get_db)):
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
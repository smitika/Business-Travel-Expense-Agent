from datetime import datetime
from fastapi import Depends, FastAPI
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




POLICY_PATH = Path("data/ABC Global Technologies Travel and Expense Policy.pdf")  # place your PDF here on server
SHARED_INDEX_DIR = Path("faiss_index/shared")
SHARED_DATA_DIR = Path("data/shared")


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    session_id: str
    message: str

class IngestRequest(BaseModel):
    policy_id : int
    policy_path : str

@app.get("/")
def root():
    print("GET / HIT")
    return {"status": "ok"}

@app.post("/query")
async def query(request: QueryRequest, db: Session = Depends(get_db)):

    history_result = db.execute(
    text("""
        SELECT
        user_message,
        assistant_message
        FROM chat_history
        WHERE session_id = :sid
        ORDER BY created_at DESC
        LIMIT 2
    """),
    {"sid": request.session_id}
    )
    chat_history = history_result.mappings().all()
    initial_state = {
        "user_message": request.message,
        "chat_history": chat_history,
        "file_path": None,
        "intent": "rag",
        "rag_response": None,
        "validation_result": None,
        "final_response": None,
    }

    result = graph.invoke(initial_state)

    db.execute(
    text("""
        INSERT INTO chat_history
        (session_id, user_message, assistant_message)
        VALUES (:sid, :user_msg, :assistant_msg)
    """),
    {
        "sid": request.session_id,
        "user_msg": result["user_message"],
        "assistant_msg": result["final_response"]
    }
    )

    db.execute(text("""UPDATE sessions SET last_active_at = NOW() WHERE session_id = :sid"""),
    {"sid": request.session_id})

    db.commit()

    return {
        "response": result["final_response"]
    }


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
    policy_index_dir = str(SHARED_INDEX_DIR / f"policy_{request.policy_id}")
    print("Starting ingestion...")
    ingest_file(request.policy_path, policy_index_dir)
    print("Ingestion complete.")
    db.execute(
        text("""UPDATE policies 
                SET is_active = TRUE, ingested = TRUE, 
                vector_path = :vector_path, updated_at = NOW() 
                WHERE policy_id = :id"""),
        {"vector_path": policy_index_dir, "id": request.policy_id}
    )
    db.commit()
    return {"ingestion_complete": True}


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


@app.post("/session")
def create_session(db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    db.execute(
        text("INSERT INTO sessions (session_id, last_active_at) VALUES (:sid, NOW())"),
        {"sid": session_id}
    )
    db.commit()
    return {"session_id": session_id}


@app.get("/history/{session_id}")
def get_history(
    session_id: str,
    db: Session = Depends(get_db)):
    result = db.execute(
        text("""
            SELECT
                user_message,
                assistant_message,
                created_at
            FROM chat_history
            WHERE session_id = :sid
            ORDER BY created_at ASC
        """),
        {"sid": session_id}
    )

    return result.mappings().all()

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


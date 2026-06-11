from fastapi import Depends, FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException
from pathlib import Path
from app.database.db import get_db
from app.services.ingest import ingest_file
import os
from app.graph.graph import graph

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


@app.get("/")
def root():
    print("GET / HIT")
    return {"status": "ok"}


# @app.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     os.makedirs(SHARED_DATA_DIR, exist_ok=True)
#     os.makedirs(SHARED_INDEX_DIR, exist_ok=True)
#     file_path = SHARED_DATA_DIR / file.filename
#     with open(file_path, "wb") as f:
#         f.write(await file.read())
#     ingest_file(str(file_path), str(SHARED_INDEX_DIR))
#     return {"message": f"'{file.filename}' uploaded successfully"}

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
        LIMIT 4
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
async def initiate_ingest():
    print("POST /initiate-ingest HIT")
    if POLICY_PATH.exists():
        print("Starting ingestion...")
        os.makedirs(SHARED_INDEX_DIR, exist_ok=True)
        ingest_file(str(POLICY_PATH), str(SHARED_INDEX_DIR))
        print("Ingestion complete.")
        return {"ingestion_complete": True}
    else:
        print("Policy file NOT found — skipping ingestion.")
    return {"ingestion_complete": False}
    


@app.get("/check-ingest")
async def check_ingest():
    index_file = SHARED_INDEX_DIR / "index.faiss"
    return {"ingested": index_file.exists()}


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
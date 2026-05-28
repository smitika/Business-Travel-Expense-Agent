from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os

from Rag_Agent.ingest import ingest_file
from Rag_Agent.rag_chain import answer_question

app = FastAPI(title="RAG Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARED_INDEX_DIR = Path("Rag_Agent/faiss_index/shared")
SHARED_DATA_DIR = Path("Rag_Agent/data/shared")

class QueryRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(SHARED_DATA_DIR, exist_ok=True)
    os.makedirs(SHARED_INDEX_DIR, exist_ok=True)

    file_path = SHARED_DATA_DIR / file.filename
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    try:
        ingest_file(str(file_path), str(SHARED_INDEX_DIR))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {e}")

    return {"message": f"'{file.filename}' ingested successfully"}

import traceback

@app.post("/query")
def query_index(req: QueryRequest):
    if not SHARED_INDEX_DIR.exists():
        raise HTTPException(status_code=404, detail="No documents uploaded yet")

    try:
        answer = answer_question(str(SHARED_INDEX_DIR), req.question)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to answer: {e}")

    return {"answer": answer}

import shutil

@app.post("/reset")
def reset_index():
    if SHARED_INDEX_DIR.exists():
        shutil.rmtree(SHARED_INDEX_DIR)
    if SHARED_DATA_DIR.exists():
        shutil.rmtree(SHARED_DATA_DIR)
    return {"message": "Index cleared"}
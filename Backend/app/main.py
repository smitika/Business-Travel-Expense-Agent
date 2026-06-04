from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException
from pathlib import Path
from app.services.ingest import ingest_file
import os
from app.graph.graph import graph
from contextlib import asynccontextmanager


POLICY_PATH = Path("data/ABC Global Technologies Travel and Expense Policy.pdf")  # place your PDF here on server
SHARED_INDEX_DIR = Path("faiss_index/shared")
SHARED_DATA_DIR = Path("data/shared")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"CWD: {os.getcwd()}")
    print(f"Policy path: {POLICY_PATH.resolve()}")
    print(f"Policy exists: {POLICY_PATH.exists()}")
    if POLICY_PATH.exists():
        print("Starting ingestion...")
        os.makedirs(SHARED_INDEX_DIR, exist_ok=True)
        ingest_file(str(POLICY_PATH), str(SHARED_INDEX_DIR))
        print("Ingestion complete.")
    else:
        print("Policy file NOT found — skipping ingestion.")
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





class QueryRequest(BaseModel):
    message: str


@app.get("/")
def root():
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
async def query(request: QueryRequest):

    initial_state = {
        "user_message": request.message,
        "file_path": None,
        "intent": "rag",
        "rag_response": None,
        "validation_result": None,
        "final_response": None,
    }

    result = graph.invoke(initial_state)

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
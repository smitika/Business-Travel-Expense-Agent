from langchain_openai import AzureOpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from app.core.supabase_client import supabase
from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT
)
import os
import pickle
import requests
import tempfile
from storage3.utils import StorageException

def ingest_file(policy_path: str, policy_id : int) -> str:
    # download if URL
    if policy_path.startswith("http"):
        response = requests.get(policy_path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(response.content)
            policy_path = tmp.name

    loader = PyPDFLoader(policy_path)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=300)
    chunks = splitter.split_documents(docs)

    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )

    # always fresh index per policy — no merging
    vectorstore = FAISS.from_documents(chunks, embeddings)

    with tempfile.TemporaryDirectory() as tmp_dir:
        vectorstore.save_local(tmp_dir)
        
        for filename in ["index.faiss", "index.pkl"]:
            file_bytes = open(os.path.join(tmp_dir, filename), "rb").read()
            storage_path = f"shared/policy_{policy_id}/{filename}"
            supabase.storage.from_("faiss-index").upload(
                storage_path,
                file_bytes,
                {"content-type": "application/octet-stream", "x-upsert": "true"}
            )

    return f"shared/policy_{policy_id}"
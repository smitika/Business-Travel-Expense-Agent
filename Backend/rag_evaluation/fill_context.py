from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings
import  json
from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT
)

embeddings = AzureOpenAIEmbeddings(
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
)

db = FAISS.load_local("faiss_index/shared", embeddings, allow_dangerous_deserialization=True)
retriever = db.as_retriever(search_kwargs={"k": 4})

with open("rag_evaluation/eval_data.json", "r") as f:
    data = json.load(f)

for entry in data:
    docs = retriever.invoke(entry["question"])
    entry["contexts"] = [doc.page_content for doc in docs]

with open("rag_evaluation/eval_data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Done — eval_data.json created")
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings, AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT
)
from app.graph.state import AgentState
from pathlib import Path

SHARED_INDEX_DIR = str(Path("faiss_index/shared"))

def format_docs(docs):
    return "\n\n".join([d.page_content for d in docs])

def rag_node(state: AgentState) -> AgentState:
    question = state["user_message"]

    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )

    db = FAISS.load_local(SHARED_INDEX_DIR, embeddings, allow_dangerous_deserialization=True)
    retriever = db.as_retriever(search_kwargs={"k": 4})

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT
    )

    prompt = ChatPromptTemplate.from_template("""
    You are a professional corporate travel policy assistant.

    Use the provided context to answer employee travel-related questions accurately and logically.

    Context:
    {context}

    Question:
    {question}

    Instructions:
    - Answer clearly and concisely.
    - Use the policy context to infer reasonable answers when the rule is indirectly stated.
    - If the policy restricts luxury or non-standard options, apply that rule logically.
    - Do not invent benefits, limits, or approvals that are not supported by the context.
    - Keep answers short (2 to 5 lines).
    - If the information is completely unavailable in the document, say:
    "The document does not contain this information."

    Answer:
    """)

    chain = (
        {"context": retriever | format_docs, "question": lambda x: x}
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(question)

    return {**state, "rag_response": answer, "final_response": answer, "user_message": question}
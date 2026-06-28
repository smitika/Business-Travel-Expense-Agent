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
from app.database.db import get_db
from pathlib import Path
from sqlalchemy import text
import os
import tempfile
import pickle
from app.core.supabase_client import supabase

def format_docs(docs):
    return "\n\n".join([d.page_content for d in docs])

def build_prompt(chat_mode: str):
    """
    3-mode prompt system
    """

    if chat_mode == "admin_test":

        return ChatPromptTemplate.from_template("""
        You are a Corporate Travel Policy AI used for INTERNAL ADMIN TESTING.

        Use the provided context to answer.

        Your role:
        - Answer questions strictly using the provided policy context.
        - Be precise, factual, and policy-grounded.

        Context:
        {context}

        User Question:
        {question}

        Instructions:
        - Provide a clear and direct answer.
        - If policy information is partial, explicitly mention uncertainty.
        - Use the policy context to infer reasonable answers when the rule is indirectly stated.
        - If the policy restricts luxury or non-standard options, apply that rule logically.
        - Do not invent benefits, limits, or approvals that are not supported by the context.
        - Keep answers short (2 to 5 lines).
        - If the information is completely unavailable in the document, say:
        "The document does not contain this information."
        - Do not be conversational.
        - This is a debugging mode, so accuracy is more important than friendliness.
        - Do NOT include the context, chunk text, or any debug information in your answer.
        - Answer only in your own words based on what the context says.
        Answer:
        """)

    elif chat_mode == "claim_query":

        return ChatPromptTemplate.from_template("""
        You are a CORPORATE TRAVEL CLAIM ASSISTANT.
        Your job is to evaluate employee claims strictly based on policy context.

        Rules:
        - Be strict and policy-driven.
        - Do NOT approve anything not explicitly supported.
        - If policy is unclear, respond conservatively.

        Context:
        {context}

        User Question:
        {question}

        Instructions:
        - Determine eligibility clearly.
        - Use the policy context to infer reasonable answers when the rule is indirectly stated.
        - If the policy restricts luxury or non-standard options, apply that rule logically.
        - Do not invent benefits, limits, or approvals that are not supported by the context.
        - Keep answers short (2 to 5 lines).
        - If rejected, explain why in simple terms.
        - Do NOT include the context, chunk text, or any debug information in your answer.
        - Answer only in your own words based on what the context says.
                                                
        Answer:
        """)

    else:

        return ChatPromptTemplate.from_template("""
        You are a CORPORATE TRAVEL ASSISTANT helping employees with pre-travel and general travel planning queries.

        Your role:
        - Help users understand travel policies and plan compliant travel.
        - Provide helpful, policy-aware guidance.

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
        - Do NOT include the context, chunk text, or any debug information in your answer.
        - Answer only in your own words based on what the context says.

        Answer:
        """)
    
def rag_node(state: AgentState) -> AgentState:
    question = state["user_message"]
    chat_mode = state["chat_mode"]
    vector_path = state["vector_path"]

    embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )

    with tempfile.TemporaryDirectory() as tmp_dir:
        for filename in ["index.faiss", "index.pkl"]:
            file_bytes = supabase.storage.from_("faiss-index").download(f"{vector_path}/{filename}")
            with open(os.path.join(tmp_dir, filename), "wb") as f:
                f.write(file_bytes)
        db: FAISS = FAISS.load_local(tmp_dir, embeddings, allow_dangerous_deserialization=True)


    retriever = db.as_retriever(search_kwargs={"k": 6})

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT
    )

    prompt = build_prompt(chat_mode)
    
    docs_with_scores = db.similarity_search_with_score(question, k=6)
    retrieved_chunks = [
    {"content": doc.page_content, "score": float(score)}
    for doc, score in docs_with_scores
    ]
    docs = [doc for doc, _ in docs_with_scores]
    context = format_docs(docs)
    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke({
        "context": context,
        "question": question
    })

    confidence = float(1 / (1 + min(score for _, score in docs_with_scores)))
    return {
        **state,
        "final_response": answer,
        "retrieved_chunks": retrieved_chunks,
        "retrieval_confidence": confidence
    }
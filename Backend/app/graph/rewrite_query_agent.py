from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import AzureChatOpenAI
from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT
)
from app.graph.state import AgentState


def rewrite_query_agent(state: AgentState) -> AgentState:
    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT
    )

    prompt = ChatPromptTemplate.from_template("""
    You are a query rewriting assistant for a Retrieval-Augmented Generation (RAG) system.

    Your task is to rewrite the user's latest question into a fully self-contained, explicit, and context-rich query that can be understood without any chat history.

    Rules:
    - Use the chat history to resolve pronouns like "it", "this", "that", "they", "those".
    - Expand vague, short, or incomplete questions into a complete and specific question.
    - ALWAYS include the domain context when available (e.g., "travel policy", "expense policy", "company policy").
    - NEVER output single words or fragments. The rewritten query must be a full sentence question.
    - If the user query is too vague (e.g., "international", "what about it"), infer the most likely intent from chat history and make it explicit.
    - Do NOT answer the question.
    - Do NOT add explanations or comments.
    - Output ONLY the rewritten query.
                                              
    Chat History:
    {chat_history}

    User Question:
    {user_message}

    Rewritten Query:
    """)

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    rewritten_query = chain.invoke({
        "chat_history": state["chat_history"],
        "user_message": state["user_message"]
    })

    return {**state, "user_message": rewritten_query}
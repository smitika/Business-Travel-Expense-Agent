from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.graph.state import AgentState
from app.graph.orchestrator import (
    orchestrator_router,
    orchestrator_response,
)
from app.graph.rag_agent import rag_node
from app.graph.ask_ai_receipt_agent import ask_ai_receipt_agent

builder = StateGraph(AgentState)

builder.add_node("rag_agent", rag_node)
builder.add_node("ask_ai_receipt_agent", ask_ai_receipt_agent)
builder.add_node("orchestrator_response", orchestrator_response)


builder.add_conditional_edges(
    START,
    orchestrator_router,
    {
        "rag_agent": "rag_agent",
        "ask_ai_receipt_agent": "ask_ai_receipt_agent",  
    }
)

builder.add_edge("rag_agent", "orchestrator_response")
builder.add_edge("ask_ai_receipt_agent", "orchestrator_response")
builder.add_edge("orchestrator_response", END)

checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)
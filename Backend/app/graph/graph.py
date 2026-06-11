from langgraph.graph import StateGraph, START, END

from app.graph.state import AgentState
from app.graph.orchestrator import (
    orchestrator_router,
    orchestrator_response,
)
from app.graph.rag_agent import rag_node
from app.graph.rewrite_query_agent import rewrite_query_agent

builder = StateGraph(AgentState)

# Nodes
builder.add_node("rewrite_query", rewrite_query_agent)
builder.add_node("rag_agent", rag_node)
builder.add_node("orchestrator_response", orchestrator_response)

# Entry routing
builder.add_conditional_edges(
    START,
    orchestrator_router,
    {
        "rag_agent": "rewrite_query",
    }
)

# Flow
builder.add_edge("rewrite_query", "rag_agent")
builder.add_edge("rag_agent", "orchestrator_response")
builder.add_edge("orchestrator_response", END)

graph = builder.compile()
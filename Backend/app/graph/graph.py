from langgraph.graph import StateGraph, START, END

from app.graph.state import AgentState
from app.graph.orchestrator import (
    orchestrator_router,
    orchestrator_response,
)
from app.graph.rag_agent import rag_node

# from app.graph.validator import validator_node

builder = StateGraph(AgentState)

builder.add_node("rag_agent", rag_node)

# Future node
# builder.add_node("validator", validator_node)

builder.add_node("orchestrator_response", orchestrator_response)

builder.add_conditional_edges(
    START,
    orchestrator_router,
    {
        "rag_agent": "rag_agent",
    }
)

builder.add_edge("rag_agent", "orchestrator_response")

builder.add_edge("orchestrator_response", END)

graph = builder.compile()
from app.graph.state import AgentState


def orchestrator_router(state: AgentState) -> str:
    # Currently only one route — RAG agent handles all chat queries.
    # Claim validation is handled outside the graph as a background task.
    return "rag_agent"


def orchestrator_response(state: AgentState) -> AgentState:
    response = state.get("final_response", "")

    if not response:
        response = "Sorry, I couldn't generate a response."

    state["final_response"] = response
    return state
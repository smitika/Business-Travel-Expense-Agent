from app.graph.state import AgentState


def orchestrator_router(state: AgentState) -> str:
    """
    Entry-point orchestrator.
    Currently all requests go to the RAG agent.
    """

    return "rag_agent"


def orchestrator_response(state: AgentState) -> AgentState:
    """
    Exit-point orchestrator.
    Formats the final response before returning to the user.
    """

    state["final_response"] = state.get("rag_response")

    return state
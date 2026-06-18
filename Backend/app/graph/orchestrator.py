from app.graph.state import AgentState


def orchestrator_router(state: AgentState) -> str:
    """
    Entry-point orchestrator.
    Currently all requests go to the RAG agent.
    """

    return "rag_agent"

def orchestrator_response(state: AgentState) -> AgentState:
    response = state.get("final_response", "")
    chat_mode = state.get("chat_mode")
    
    if not response:
        response = "Sorry, I couldn't generate a response."

    if chat_mode == "claim_query":
        response = f"CLAIM EVALUATION:\n\n{response}"

    state["final_response"] = response
    return state
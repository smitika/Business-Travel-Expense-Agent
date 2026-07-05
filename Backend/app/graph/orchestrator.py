from app.graph.state import AgentState


def orchestrator_router(state: AgentState) -> str:
    if state.get("chat_mode") == "ask_ai_receipt":
        return "ask_ai_receipt_agent"
    return "rag_agent"


def orchestrator_response(state: AgentState) -> AgentState:
    response = state.get("final_response", "")

    if not response:
        response = "Sorry, I couldn't generate a response."

    state["final_response"] = response
    return state
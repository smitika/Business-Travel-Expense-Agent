from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    session_id: str
    policy_id: int
    chat_mode: str
    user_message: str
    vector_path: str
    final_response: Optional[str]
    retrieved_chunks: Optional[list]
    retrieval_confidence: Optional[float]
    structured_context: Optional[str]
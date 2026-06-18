
from typing import Any, List, Optional, Dict
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
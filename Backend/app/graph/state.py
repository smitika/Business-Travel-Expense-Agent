from typing import Optional
from typing_extensions import TypedDict

class AgentState(TypedDict):
    user_message: Optional[str]       # text query from user
    file_path: Optional[str]          # uploaded receipt path
    intent: Optional[str]             # "rag" or "validate"
    rag_response: Optional[str]       # answer from RAG agent
    validation_result: Optional[str]  # "approved" / "flagged" / "rejected"
    final_response: Optional[str]     # what gets sent back to user
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT,
)

_PROMPT = ChatPromptTemplate.from_template("""
You are helping validate a corporate travel reimbursement claim.

The employee's home country is India.

Given the destination below, determine whether the travel is domestic or international.

Destination:
{destination}

Rules:

- If every destination is within India, return:
domestic

- If any destination is outside India, return:
international

Examples:

Mumbai
→ domestic

Delhi
→ domestic

Kolkata
→ domestic

Bhubaneswar
→ domestic

Mumbai, Delhi
→ domestic

Singapore
→ international

Berlin
→ international

Tokyo
→ international

Dubai
→ international

Delhi, Dubai
→ international

Mumbai -> Singapore
→ international

If you are uncertain whether the destination is inside or outside India,
return:

international

Respond with ONLY one word:

domestic

or

international
""")


def infer_travel_type(destination: str) -> str:
    """
    Returns:
        "domestic"
        or
        "international"
    """

    if not destination or not destination.strip():
        return "domestic"

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT,
        temperature=0,
    )

    chain = _PROMPT | llm | StrOutputParser()

    result = chain.invoke(
        {
            "destination": destination.strip()
        }
    )

    result = result.strip().lower()

    if result not in ("domestic", "international"):
        return "international"

    return result
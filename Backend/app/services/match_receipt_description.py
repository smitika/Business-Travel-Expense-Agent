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
You are validating a travel reimbursement claim.

An employee uploaded a receipt under the Miscellaneous category.

Determine whether the employee's description accurately matches the receipt.

Employee Description:
{description}

Receipt Summary:
{summary}

Receipt Line Items:
{items}

Rules:

- Return TRUE if the employee description is consistent with the receipt.
- Return FALSE if the employee description contradicts the receipt.
- Minor wording differences are acceptable.
- Use semantic meaning, not exact keyword matching.

Examples:

Employee:
"Toll Tax"

Receipt:
"FASTag Toll Plaza payment"

→ TRUE

Employee:
"Parking"

Receipt:
"Parking Fee"

→ TRUE

Employee:
"Courier"

Receipt:
"Blue Dart Shipment"

→ TRUE

Employee:
"Office Supplies"

Receipt:
"A4 Paper, Pens"

→ TRUE

Employee:
"Restaurant"

Receipt:
"Burger, Fries, Coke"

→ FALSE

Employee:
"Taxi"

Receipt:
"Laundry Service"

→ FALSE

Employee:
"Parking"

Receipt:
"Hotel Dinner"

→ FALSE

Respond with ONLY:

TRUE

or

FALSE

Do not explain.
""")
def description_matches_receipt(
    user_description: str,
    expense_summary: str | None,
    line_items: list[str],
) -> bool:

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT,
    )

    items_text = "\n".join(line_items[:20]) if line_items else "None"

    chain = _PROMPT | llm | StrOutputParser()

    result = chain.invoke(
        {
            "description": user_description,
            "summary": expense_summary or "None",
            "items": items_text,
        }
    )

    return result.strip().upper() == "TRUE"
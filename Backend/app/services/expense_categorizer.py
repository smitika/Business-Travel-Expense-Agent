from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT,
)

VALID_CATEGORIES = {"meals", "transport", "miscellaneous", "non-reimbursable"}

# Maps LLM-returned category → upload category stored in DB
CATEGORY_MAP = {
    "meals": "food",
    "transport": "transport",
    "miscellaneous": "misc",
    "non-reimbursable": None,  # handled as rejection before map lookup
}
_PROMPT = ChatPromptTemplate.from_template("""
You are an expense categorization assistant for a corporate travel reimbursement system.

Your task is to determine the SINGLE most appropriate expense category.

Return ONLY one of these exact values:
- meals
- transport
- miscellaneous
- non-reimbursable

Merchant:
{merchant}

Expense Summary:
{summary}

Line Items:
{items}

Rules:

1. meals
Examples:
- Restaurant
- Cafe
- Food court
- Breakfast
- Lunch
- Dinner
- Coffee
- Snacks
- Room service meals

2. transport
Examples:
- Taxi
- Cab
- Uber
- Ola
- Metro
- Bus
- Train fare
- Auto rickshaw
- Toll
- Parking
- Fuel
- Airport shuttle

3. miscellaneous
Examples:
- Laundry
- Printing
- Courier
- Office stationery
- Internet recharge
- SIM card
- Business supplies
- Medical items
- Any legitimate business expense that is neither food nor transport.

4. non-reimbursable
Examples:
- Alcohol
- Cigarettes
- Tobacco
- Entertainment
- Movie tickets
- Personal shopping
- Cosmetics
- Jewellery
- Personal gifts
- Luxury purchases

Important Rules:
- Use Expense Summary together with Merchant and Line Items.
- If the line items clearly indicate alcohol or tobacco, return non-reimbursable.
- If uncertain between meals and miscellaneous, prefer meals only if food or beverages are clearly involved.
- Return ONLY the category name.
Do not explain your answer.
""")


def categorize_expense(
    merchant: str,
    line_items: list[str],
    expense_summary: str | None,
) -> str:
    """
    Calls Azure OpenAI to infer the expense category from merchant + line items.
    Returns one of: meals | transport | miscellaneous | non-reimbursable
    Falls back to 'miscellaneous' if LLM returns an unexpected value.
    """
    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT,
    )
    items_text = "\n".join(line_items[:20]) if line_items else "None"

    chain = _PROMPT | llm | StrOutputParser()
    result = chain.invoke({
    "merchant": merchant or "Unknown",
    "summary": expense_summary or "None",
    "items": items_text,
    })
    result = result.strip().lower()

    return result if result in VALID_CATEGORIES else "miscellaneous"


def inferred_matches_uploaded(llm_category: str, upload_category: str) -> bool:
    """
    Returns True if the LLM-inferred category maps to the upload's category field.
    e.g. llm='meals', upload='food' → True
         llm='transport', upload='food' → False
    """
    mapped = CATEGORY_MAP.get(llm_category)
    if mapped is None:
        return False  # non-reimbursable never matches any upload category
    return mapped == upload_category.lower()
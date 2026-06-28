import json
import re
from typing import Any
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import (AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT)
from langchain_core.output_parsers import StrOutputParser

def _parse_receipt_with_llm(raw_text: str) -> dict:
    PROMPT = """
You are an expert OCR parser for a corporate travel expense reimbursement system.

Your task is to extract structured factual information from OCR text.

Return ONLY a valid JSON object.
Do NOT wrap it in markdown.
Do NOT explain your answer.
Do NOT include any extra keys.

Return exactly this schema:

{{
  "merchant": "<string or null>",
  "date": "YYYY-MM-DD or null",
  "amount": <number or null>,
  "currency": "<ISO 4217 code, default INR>",
  "detected_doc_type": "<receipt | invoice | bill | upi_payment_proof | flight_ticket | hotel_booking_confirmation | hotel_folio | boarding_pass | train_ticket | unknown>",
  "line_items": [
      "<item/service 1>",
      "<item/service 2>"
  ],
  "expense_summary": "<one sentence describing what this document is for>",
  "confidence": "<high | medium | low>"
}}

Extraction Rules:

1. merchant
- Name of the merchant, restaurant, hotel, vendor, taxi operator, toll operator, etc.
- Return null if uncertain.

2. date
- Extract ONLY the transaction/payment date.
- Format strictly as YYYY-MM-DD.
- Return null if no valid date exists.

3. amount
- Extract the FINAL payable amount.
- Ignore subtotals, taxes and discounts unless they are the final total.
- Return null if uncertain.

4. currency
- Return ISO currency code.
- Examples:
  INR
  USD
  EUR
  GBP
  SGD
  AED
- Default to INR if not mentioned.

5. detected_doc_type
Choose exactly ONE:

receipt
invoice
bill
upi_payment_proof
flight_ticket
hotel_booking_confirmation
hotel_folio
boarding_pass
train_ticket
unknown

6. line_items
- Return ONLY item/service names.
- Do NOT include quantities.
- Do NOT include prices.
- Examples:
[
    "Veg Thali",
    "Mineral Water",
    "Parking Fee"
]

If no individual items exist, return [].

7. expense_summary
Write ONE factual sentence describing what the document represents.

Examples:
"Restaurant meal."
"Taxi fare."
"Toll payment."
"Hotel accommodation charges."
"Office stationery purchase."

Do NOT mention reimbursement or policy.

8. confidence
Return:
high
medium
or
low

Use low if OCR text is severely corrupted.

Never invent information.
If uncertain, return null (or [] for line_items).

OCR Text:
----------------
{ocr_text}
----------------
"""

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT,
        temperature=0,
    )

    prompt = ChatPromptTemplate.from_template(PROMPT)

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    raw = chain.invoke({"ocr_text": raw_text})

    # Remove markdown fences if the model accidentally returns them
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)

    

    parsed: dict[str, Any] = json.loads(raw)

    required_keys = {
        "merchant",
        "date",
        "amount",
        "currency",
        "detected_doc_type",
        "line_items",
        "expense_summary",
        "confidence",
    }

    missing = required_keys - parsed.keys()
    if missing:
        raise ValueError(f"LLM response missing keys: {missing}")

    return parsed
import io
import platform
from datetime import datetime, date as date_type
from typing import Optional
from app.services.parse_receipt import _parse_receipt_with_llm
import pytesseract
from PIL import Image
import logging
logger = logging.getLogger(__name__)

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

_DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y",
    "%Y/%m/%d", "%Y-%m-%d",
]

def _parse_date(date_str: Optional[str]) -> Optional[date_type]:
    """Try each known format until one parses. Returns None if nothing matches."""
    if not date_str:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None



def extract_ocr_data(file_bytes: bytes) -> dict:
    """
    Performs OCR on an uploaded receipt image and extracts structured data using an LLM.

    Returns:
    {
        "merchant": str | None,
        "ocr_date": date | None,
        "amount": float | None,
        "currency": str,
        "line_items": list[str],
        "detected_doc_type": str,
        "expense_summary": str | None,
        "ocr_raw_text": str,
        "confidence": "high" | "medium" | "low"
    }
    """

    image = Image.open(io.BytesIO(file_bytes))
    raw_text = pytesseract.image_to_string(image)

    if not raw_text.strip():
        return {
            "merchant": None,
            "ocr_date": None,
            "amount": None,
            "currency": "INR",
            "line_items": [],
            "detected_doc_type": "unknown",
            "expense_summary": None,
            "ocr_raw_text": "",
            "confidence": "low",
        }

    try:
        llm_data = _parse_receipt_with_llm(raw_text)
    except Exception as e:
        logger.error(f"[OCR-LLM] Extraction failed: {e}")

        return {
            "merchant": None,
            "ocr_date": None,
            "amount": None,
            "currency": "INR",
            "line_items": [],
            "detected_doc_type": "unknown",
            "expense_summary": None,
            "ocr_raw_text": raw_text,
            "confidence": "low",
        }

    # ---------------- Merchant ----------------

    merchant = llm_data.get("merchant")

    # ---------------- Date ----------------

    ocr_date = None
    date_str = llm_data.get("date")

    if date_str:
        try:
            ocr_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            ocr_date = _parse_date(date_str)

    # ---------------- Amount ----------------

    amount = llm_data.get("amount")

    if amount is not None:
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            amount = None

    # ---------------- Currency ----------------

    currency = llm_data.get("currency") or "INR"

    # ---------------- Line Items ----------------

    line_items = llm_data.get("line_items", [])

    if not isinstance(line_items, list):
        line_items = []

    line_items = [
        str(item).strip()
        for item in line_items
        if str(item).strip()
    ]

    # ---------------- Document Type ----------------

    detected_doc_type = (
        llm_data.get("detected_doc_type") or "unknown"
    ).lower()

    # ---------------- Expense Summary ----------------

    expense_summary = llm_data.get("expense_summary")

    # ---------------- Confidence ----------------

    confidence = (
        llm_data.get("confidence") or "low"
    ).lower()

    if confidence not in {"high", "medium", "low"}:
        confidence = "low"

    return {
        "merchant": merchant,
        "ocr_date": ocr_date,
        "amount": amount,
        "currency": currency,
        "line_items": line_items,
        "detected_doc_type": detected_doc_type,
        "expense_summary": expense_summary,
        "ocr_raw_text": raw_text,
        "confidence": confidence,
    }
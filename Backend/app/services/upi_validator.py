from app.services.ocr import extract_ocr_data


def validate_upi(receipt_ocr: dict, upi_bytes: bytes) -> dict:
    upi_ocr = extract_ocr_data(upi_bytes)
    mismatches = []

    if receipt_ocr.get("amount") and upi_ocr.get("amount"):
        if abs(float(receipt_ocr["amount"]) - float(upi_ocr["amount"])) > 1.0:
            mismatches.append("amount mismatch")

    if receipt_ocr.get("date") and upi_ocr.get("date"):
        if receipt_ocr["date"] != upi_ocr["date"]:
            mismatches.append("date mismatch")

    if mismatches:
        return {"valid": False, "reason": ", ".join(mismatches)}
    return {"valid": True, "reason": ""}
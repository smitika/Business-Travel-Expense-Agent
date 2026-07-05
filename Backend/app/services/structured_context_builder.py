from sqlalchemy import text
from sqlalchemy.orm import Session

def get_ask_ai_context(upload_id: int, db: Session) -> tuple[str, int]:
    """
    Queries the database and compiles a structured Markdown context string 
    about the receipt upload, claim, and policy rules for the LLM.
    Returns: (context_string, policy_id)
    """
    # 1. Fetch main upload, claim, and travel request details
    upload_query = text("""
        SELECT 
            cu.upload_id, 
            cu.claim_id, 
            cu.day_number, 
            cu.claim_date, 
            cu.category, 
            cu.status, 
            cu.rejection_reason, 
            cu.review_reason, 
            cu.ocr_amount, 
            cu.ocr_currency, 
            cu.ocr_invoice_number, 
            cu.file_role, 
            cu.can_reapply,
            c.trip_start_date, 
            c.trip_end_date, 
            c.duration_days, 
            c.policy_version_id,
            tr.destination, 
            tr.purpose
        FROM claim_uploads cu
        JOIN claims c ON cu.claim_id = c.claim_id
        LEFT JOIN travel_requests tr ON c.travel_id = tr.id
        WHERE cu.upload_id = :upload_id
    """)
    
    upload_row = db.execute(upload_query, {"upload_id": upload_id}).mappings().first()
    if not upload_row:
        return None, None
        
    policy_version_id = upload_row["policy_version_id"]
    category = upload_row["category"]
    status = upload_row["status"]

    # 2. Fetch matching policy items (limits per item) for this category
    items_query = text("""
        SELECT item_name, is_allowed, per_item_limit, currency, notes, travel_type
        FROM policy_items
        WHERE policy_version_id = :policy_id 
          AND LOWER(category) = LOWER(:category)
    """)
    items = db.execute(items_query, {
        "policy_id": policy_version_id, 
        "category": category
    }).mappings().all()

    # 3. Fetch matching daily policy limits for this category (using column name 'catrgory')
    limits_query = text("""
        SELECT daily_limit, currency, travel_type
        FROM policy_limits
        WHERE policy_version_id = :policy_id 
          AND LOWER(category) = LOWER(:category)
    """)
    limits = db.execute(limits_query, {
        "policy_id": policy_version_id, 
        "category": category
    }).mappings().all()

    # Compile into a structured format for the LLM context
    context_lines = []
    
    context_lines.append("### UPLOAD DETAILS ###")
    context_lines.append(f"Upload ID: {upload_row['upload_id']}")
    context_lines.append(f"Category: {upload_row['category']}")
    context_lines.append(f"Status: {upload_row['status']}")
    context_lines.append(f"Rejection Reason: {upload_row['rejection_reason'] or 'N/A'}")
    context_lines.append(f"Review Reason: {upload_row['review_reason'] or 'N/A'}")
    context_lines.append(f"OCR Amount: {upload_row['ocr_amount']} {upload_row['ocr_currency']}")
    context_lines.append(f"OCR Invoice Number: {upload_row['ocr_invoice_number'] or 'Missing'}")
    context_lines.append(f"Can Re-apply: {'Yes' if upload_row['can_reapply'] else 'No'}")
    context_lines.append(f"Claim Date (Day {upload_row['day_number']}): {upload_row['claim_date']}")

    context_lines.append("\n### CLAIM & TRAVEL DETAILS ###")
    context_lines.append(f"Claim ID: {upload_row['claim_id']}")
    context_lines.append(f"Trip Dates: {upload_row['trip_start_date']} to {upload_row['trip_end_date']} ({upload_row['duration_days']} days)")
    context_lines.append(f"Destination: {upload_row['destination'] or 'N/A'}")
    context_lines.append(f"Trip Purpose: {upload_row['purpose'] or 'N/A'}")

    context_lines.append("\n### APPLICABLE POLICY LIMITS & RULES ###")
    if items:
        context_lines.append("Policy Allowed Items:")
        for item in items:
            allowed_str = "Allowed" if item['is_allowed'] else "NOT Allowed"
            context_lines.append(
                f"- Item: {item['item_name']} | {allowed_str} | Limit: {item['per_item_limit']} "
                f"{item['currency']} | Travel Type: {item['travel_type']} | Notes: {item['notes']}"
            )
    else:
        context_lines.append("No specific item limits found under this category.")

    if limits:
        context_lines.append("\nPolicy Daily Limits:")
        for limit in limits:
            context_lines.append(
                f"- Daily Limit: {limit['daily_limit']} {limit['currency']} | Travel Type: {limit['travel_type']}"
            )
    else:
        context_lines.append("No specific daily limits configured under this category.")

    return "\n".join(context_lines), policy_version_id, status
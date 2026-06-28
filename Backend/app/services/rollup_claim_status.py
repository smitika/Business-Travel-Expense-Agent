from sqlalchemy.orm import Session
from sqlalchemy import text


def rollup_claim_status(claim_id: int, db: Session) -> str:
    """
    API 5: Checks all uploads associated with this claim ID and rolls up the status.
    - If all resolved uploads are APPROVED -> APPROVED.
    - If all resolved uploads are REJECTED -> REJECTED.
    - If some are APPROVED and some are REJECTED -> PARTIALLY APPROVED.
    - If some uploads are still under REVIEW/PENDING but at least one is resolved -> PARTIALLY APPROVED.
    - Otherwise, preserves the unresolved status.
    """
    # Fetch all upload statuses belonging to this claim
    rows = db.execute(
        text("SELECT status FROM claim_uploads WHERE claim_id = :cid"),
        {"cid": claim_id}
    ).mappings().all()

    if not rows:
        return "APPROVED" # Fallback if no uploads exist

    statuses = [(row["status"] or "").upper() for row in rows]
    total_uploads = len(statuses)

    approved_count = statuses.count("APPROVED")
    rejected_count = statuses.count("REJECTED")
    review_count = statuses.count("REVIEW") + statuses.count("FLAGGED FOR REVIEW") + statuses.count("FLAGGED_FOR_REVIEW")
    pending_count = statuses.count("PENDING")

    resolved_count = approved_count + rejected_count

    # Determine rolled-up status
    if resolved_count == total_uploads:
        if approved_count == total_uploads:
            new_status = "APPROVED"
        elif rejected_count == total_uploads:
            new_status = "REJECTED"
        else:
            new_status = "PARTIALLY APPROVED"
    else:
        # Unresolved uploads still exist (either PENDING or REVIEW)
        if approved_count > 0 or rejected_count > 0:
            new_status = "PARTIALLY APPROVED"
        elif review_count > 0:
            new_status = "FLAGGED FOR REVIEW"
        else:
            new_status = "PENDING"

    # Update the parent claims table with the newly calculated status
    db.execute(
        text("UPDATE claims SET status = :status, updated_at = NOW() WHERE claim_id = :cid"),
        {"status": new_status, "cid": claim_id}
    )
    return new_status
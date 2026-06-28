from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
def is_policy_extracted(policy_id: int, db:Session) -> bool:
    """
    Checks if policy limits and items exist in the DB for a given policy_id.
    Note: In policies table the key is policy_id, but in policy_limits and
    policy_items, the column is named policy_version_id.
    """
    has_limits = db.execute(
        text("SELECT 1 FROM policy_limits WHERE policy_version_id = :pvid LIMIT 1"),
        {"pvid": policy_id}
    ).first()

    has_items = db.execute(
        text("SELECT 1 FROM policy_items WHERE policy_version_id = :pvid LIMIT 1"),
        {"pvid": policy_id}
    ).first()

    return bool(has_limits and has_items)
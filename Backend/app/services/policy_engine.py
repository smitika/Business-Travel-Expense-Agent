import logging
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.travel_utils import to_inr

logger = logging.getLogger(__name__)


def load_policy_limits(policy_version_id: int, travel_type: str, db: Session) -> dict[str, float]:
    """
    Returns { category: daily_limit_inr } for the given policy version + travel type.
    Limits stored in foreign currencies are converted to INR at load time.
    """
    rows = db.execute(
        text("""
            SELECT category, daily_limit, currency
            FROM policy_limits
            WHERE policy_version_id = :pvid
              AND travel_type = :ttype
        """),
        {"pvid": policy_version_id, "ttype": travel_type}
    ).mappings().all()

    limits = {}
    for row in rows:
        limits[row["category"].lower()] = to_inr(float(row["daily_limit"]), row["currency"])

    logger.info(f"[PolicyEngine] Loaded limits for policy={policy_version_id} type={travel_type}: {limits}")
    return limits


def load_disallowed_items(policy_version_id: int, travel_type: str, db: Session) -> dict[str, set]:
    """
    Returns { category: set(disallowed_item_name_lower) } for the given policy version + travel type.
    Only fetches rows where is_allowed = FALSE.
    """
    rows = db.execute(
        text("""
            SELECT category, item_name
            FROM policy_items
            WHERE policy_version_id = :pvid
              AND travel_type = :ttype
              AND is_allowed = FALSE
        """),
        {"pvid": policy_version_id, "ttype": travel_type}
    ).mappings().all()

    disallowed: dict[str, set] = defaultdict(set)
    for row in rows:
        disallowed[row["category"].lower()].add(row["item_name"].lower())

    logger.info(f"[PolicyEngine] Loaded disallowed items for policy={policy_version_id}: { {k: list(v) for k, v in disallowed.items()} }")
    return disallowed


def enforce_budget(
    category: str,
    amount_inr: float,
    day_number: int,
    policy_daily_limits: dict[str, float],
    daily_totals: dict[int, dict[str, float]],
) -> dict:
    """
    Checks whether this upload fits within the remaining daily budget for its category.

    Args:
        category:            upload category (food | transport | misc)
        amount_inr:          receipt amount already converted to INR
        day_number:          which day of the trip this upload belongs to
        policy_daily_limits: { category: daily_limit_inr } loaded at claim start
        daily_totals:        mutable running total { day_number: { category: approved_so_far } }
                             — updated in-place on approval so subsequent uploads see correct remaining

    Returns:
        { "approved": bool, "reason": str | None }
    """
    daily_limit = policy_daily_limits.get(category)

    if daily_limit is None:
        return {
            "approved": False,
            "reason": f"No daily limit defined in policy for category '{category}' — manual review required",
            "needs_review": True,
        }

    spent_so_far = daily_totals[day_number][category]
    remaining    = daily_limit - spent_so_far

    if amount_inr > remaining:
        return {
            "approved": False,
            "needs_review": False,
            "reason": (
                f"Exceeds daily {category} limit: "
                f"₹{daily_limit:.0f}/day limit, "
                f"₹{spent_so_far:.0f} already approved, "
                f"₹{remaining:.0f} remaining — this receipt is ₹{amount_inr:.0f}"
            ),
        }

    # Approved — update running total so next upload in same day+category sees correct remaining
    daily_totals[day_number][category] += amount_inr
    return {"approved": True, "needs_review": False, "reason": None}


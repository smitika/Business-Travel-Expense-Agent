from datetime import date
from typing import Optional, List
from pydantic import BaseModel, field_validator


ALLOWED_CATEGORIES = {"food", "transport", "misc"}


class UploadMetadata(BaseModel):
    """
    Describes ONE file in the `files` list of /submit-claim, at the same index.
    Frontend sends a JSON array of these (one entry per file) as the `metadata` form field.
    """
    day_number: int
    claim_date: date
    category: str
    description: Optional[str] = None  # mandatory for misc, enforced below

    @field_validator("category")
    @classmethod
    def category_must_be_valid(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f"category must be one of {ALLOWED_CATEGORIES}, got '{v}'")
        return v

    @field_validator("description")
    @classmethod
    def description_required_for_misc(cls, v, info):
        # category may not be validated yet depending on field order, so re-check raw value
        category = info.data.get("category")
        if category == "misc" and not v:
            raise ValueError("description is mandatory for misc category uploads")
        return v


class SubmitClaimResponse(BaseModel):
    claim_id: int
    status: str
    duration_days: int
    total_uploads: int
    message: str

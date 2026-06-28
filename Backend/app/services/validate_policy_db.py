import json
import logging
import os
import re
import tempfile
from langchain_community.document_loaders import PyPDFLoader
import requests
from openai import AzureOpenAI
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import (
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT
)
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
)

_PROMPT = """
You are a travel policy parser. Extract ALL expense rules from the policy text below.

Return ONLY a valid JSON object — no markdown, no explanation — with exactly two keys:

{{
  "policy_limits": [
    {{
      "travel_type": "domestic" | "international",
      "category": "food" | "transport" | "misc",
      "daily_limit": <number or null>,
      "currency": "<3-letter code, default INR>"
    }}
  ],
  "policy_items": [
    {{
      "travel_type": "domestic" | "international",
      "category": "food" | "transport" | "misc",
      "item_name": "<specific item or expense name>",
      "is_allowed": true | false,
      "per_item_limit": <number or null>,
      "currency": "<3-letter code, default INR>",
      "notes": "<any clarification or null>"
    }}
  ]
}}

Rules:
- travel_type must be exactly "domestic" or "international"
- category must be exactly "food", "transport", or "misc"
- If a limit applies to both travel types, emit two rows (one per type)
- If no explicit currency is mentioned, use "INR"
- Do not invent data not present in the policy

Policy text:
\"\"\"
{policy_text}
\"\"\"
"""


# ---------------------------------------------------------------------------
# Public entry point — call this at the top of run_claim_validation
# ---------------------------------------------------------------------------

def ensure_policy_extracted(policy_id: int, file_path: str, db: Session) -> None:
    """
    If policy_items or policy_limits rows are missing for this policy_version_id,
    fetch the PDF from Cloudinary, extract via GPT-4.1, and populate both tables.
    No-op if rows already exist.
    """
    has_limits = db.execute(
        text("SELECT 1 FROM policy_limits WHERE policy_version_id = :pvid LIMIT 1"),
        {"pvid": policy_id}
    ).first()

    has_items = db.execute(
        text("SELECT 1 FROM policy_items WHERE policy_version_id = :pvid LIMIT 1"),
        {"pvid": policy_id}
    ).first()

    if has_limits and has_items:
        logger.info(f"[PolicyIngest] policy={policy_id} already extracted — skipping")
        return

    logger.info(f"[PolicyIngest] policy={policy_id} missing rows — starting extraction")

    # 1. Fetch file_path from policies table
    row = db.execute(
        text("SELECT file_path FROM policies WHERE policy_id = :pvid"),
        {"pvid": policy_id}
    ).mappings().first()

    if not row or not row["file_path"]:
        logger.error(f"[PolicyIngest] No file_path found for policy={policy_id} — cannot extract")
        return

    policy_text = _extract_pdf_text(file_path)

    if not policy_text.strip():
        logger.error(f"[PolicyIngest] Extracted empty text from policy PDF — aborting")
        return

    # 4. Send to GPT-4.1
    try:
        extracted = _call_llm(policy_text)
    except Exception as e:
        logger.error(f"[PolicyIngest] LLM extraction failed: {e}")
        raise

    # 5. Insert into DB
    try:
        _insert_extracted(policy_id, extracted, has_limits, has_items, db)
    except Exception as e:
        logger.error(f"[PolicyIngest] DB insert failed: {e}")
        db.rollback()
        raise

    logger.info(f"[PolicyIngest] policy={policy_id} extraction complete")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_pdf_text(pdf_url: str) -> str:
    response = requests.get(pdf_url, timeout=30)
    response.raise_for_status()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    loader = PyPDFLoader(tmp_path)
    docs = loader.load()
    return "\n".join(doc.page_content for doc in docs)

def _call_llm(policy_text: str) -> dict:
    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_CHAT_DEPLOYMENT
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a structured data extractor. Return only valid JSON."),
        ("human", _PROMPT),
    ])

    chain = prompt | llm | StrOutputParser()

    raw = chain.invoke({"policy_text": policy_text[:12000]})

    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    parsed = json.loads(raw)

    if "policy_limits" not in parsed or "policy_items" not in parsed:
        raise ValueError(f"LLM response missing required keys: {list(parsed.keys())}")

    return parsed


def _insert_extracted(
    policy_version_id: int,
    extracted: Dict[str, List[Dict[str, Any]]],
    has_limits: bool,
    has_items: bool,
    db: Session,
) -> None:
    if not has_limits:
        for row in extracted.get("policy_limits", []):
            db.execute(
                text("""
                    INSERT INTO policy_limits
                        (policy_version_id, travel_type, category, daily_limit, currency)
                    VALUES
                        (:pvid, :travel_type, :category, :daily_limit, :currency)
                    ON CONFLICT (policy_version_id, travel_type, category) DO NOTHING
                """),
                {
                    "pvid":        policy_version_id,
                    "travel_type": row.get("travel_type", "domestic"),
                    "category":    row.get("category", "misc"),
                    "daily_limit": row.get("daily_limit"),
                    "currency":    row.get("currency", "INR"),
                },
            )
        logger.info(f"[PolicyIngest] Inserted {len(extracted.get('policy_limits', []))} policy_limits rows")

    if not has_items:
        for row in extracted.get("policy_items", []):
            db.execute(
                text("""
                    INSERT INTO policy_items
                        (policy_version_id, travel_type, category, item_name,
                         is_allowed, per_item_limit, currency, notes)
                    VALUES
                        (:pvid, :travel_type, :category, :item_name,
                         :is_allowed, :per_item_limit, :currency, :notes)
                """),
                {
                    "pvid":          policy_version_id,
                    "travel_type":   row.get("travel_type", "domestic"),
                    "category":      row.get("category", "misc"),
                    "item_name":     row.get("item_name", ""),
                    "is_allowed":    row.get("is_allowed", True),
                    "per_item_limit": row.get("per_item_limit"),
                    "currency":      row.get("currency", "INR"),
                    "notes":         row.get("notes"),
                },
            )
        logger.info(f"[PolicyIngest] Inserted {len(extracted.get('policy_items', []))} policy_items rows")

    db.commit()
"""Restore the checked-in, already-approved snapshot into an empty local database.

Preserves original approval provenance and data versions; never approves candidates
and never replaces existing records. Intended for the local app launcher.
"""
import json
from datetime import date, datetime

from sqlalchemy import func, select, text

from unclaimed import DATA, review
from unclaimed.db import SessionLocal
from unclaimed.models import Resource


def restore(session, snapshot):
    # An existing catalog, including a pending-only catalog, belongs to its owner.
    if session.scalar(select(func.count()).select_from(Resource)):
        return 0
    rows = []
    seen = set()
    for data in snapshot["resources"]:
        rid = data["id"]
        if rid in seen:
            raise ValueError(f"Duplicate resource in approved snapshot: {rid}")
        seen.add(rid)
        if data.get("status") != "approved" or not data.get("approved_by") or not data.get("approved_at") or not isinstance(data.get("data_version"), int) or data["data_version"] < 1:
            raise ValueError(f"Snapshot resource lacks original approval provenance: {rid}")
        benefit = data.get("benefit") or {}
        deadline = data.get("deadline") or {}
        row = Resource(
            id=rid, version=1, status="approved",
            **{key: data.get(key) for key in ("title", "provider", "category", "academic_year", "where", "note", "source_url", "evidence_quote", "approved_by", "data_version")},
            **{key: data.get(key) or [] for key in ("eligibility", "relevance", "steps", "docs", "conflicts")},
            benefit_label=benefit.get("label"), benefit_value=benefit.get("value"), benefit_period=benefit.get("period"),
            deadline_label=deadline.get("label"),
            last_verified=date.fromisoformat(data["last_verified"]) if data.get("last_verified") else None,
            approved_at=datetime.fromisoformat(data["approved_at"]),
        )
        if blockers := review.approval_blockers(row):
            raise ValueError(f"Invalid approved snapshot record {rid}: {', '.join(blockers)}")
        rows.append(row)
    if not rows or max(row.data_version for row in rows) != snapshot["data_version"]:
        raise ValueError("The snapshot data version does not match its records")
    session.add_all(rows)
    session.flush()
    # Future human approvals must receive versions beyond those restored.
    session.execute(text("SELECT setval('data_version_seq', GREATEST((SELECT last_value FROM data_version_seq), :version), true)"), {"version": snapshot["data_version"]})
    session.commit()
    return len(rows)


def main():
    snapshot = json.loads((DATA / "approved_resources.json").read_text())
    with SessionLocal() as session:
        count = restore(session, snapshot)
    print(f"Restored {count} previously approved resources." if count else "Catalog already exists; nothing was changed.")


if __name__ == "__main__":
    main()

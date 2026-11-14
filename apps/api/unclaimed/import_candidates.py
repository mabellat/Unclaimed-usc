"""Load data/candidates/*.md into the database as PENDING records.

Usage: python -m unclaimed.import_candidates
Nothing is ever approved here. Records whose id already exists are skipped, so
re-running is safe and never overwrites a reviewed record.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from unclaimed.candidates import load_candidates
from unclaimed.db import SessionLocal
from unclaimed.models import Resource


def import_records(session: Session, records: list[dict]) -> tuple[list[str], list[str]]:
    added, skipped = [], []
    for rec in records:
        if session.scalar(select(Resource.id).where(Resource.id == rec["id"]).limit(1)):
            skipped.append(rec["id"])
            continue
        fields = rec | {"last_verified": date.fromisoformat(rec["last_verified"])}
        # Status and approval stamps are set here, never taken from the file.
        session.add(Resource(**fields, version=1, status="pending",
                             approved_by=None, approved_at=None, data_version=None))
        added.append(rec["id"])
    session.commit()
    return added, skipped


def main():
    with SessionLocal() as session:
        added, skipped = import_records(session, load_candidates())
    print(f"Imported {len(added)} pending records.")
    if skipped:
        print(f"Skipped {len(skipped)} that already exist: {', '.join(skipped)}")


if __name__ == "__main__":
    main()

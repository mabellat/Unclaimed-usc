"""Approve every ready pending record, after one confirmation.

Usage: python -m unclaimed.approve_all --by manoj
"""

import argparse

from unclaimed import review
from unclaimed.db import SessionLocal


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--by", required=True, help="owner name stamped as approved_by")
    args = parser.parse_args()

    with SessionLocal() as session:
        ready, skipped = review.plan_approve_all(session)
        if not ready:
            print("No pending records are ready to approve.")
        elif input(f"Approve {len(ready)} pending records as {args.by}? Type 'yes' to confirm: ").strip() == "yes":
            approved, skipped, entry = review.approve_all(
                session, approved_by=args.by, confirmed={(r.id, r.version) for r in ready})
            print(f"Approved {len(approved)} records. Logged as bulk action #{entry.id} at {entry.at.isoformat()}.")
        else:
            print("Cancelled. Nothing was approved.")
        if skipped:
            print(f"\nSkipped {len(skipped)}:")
            for r, reason in skipped:
                print(f"  {r.id} v{r.version}: {reason}")


if __name__ == "__main__":
    main()

"""Write the approved resources to data/approved_resources.json.

Usage: python -m unclaimed.export_approved
Golden and property tests run against this snapshot, so they test exactly what the
owner approved without needing the database. Re-export after every approval.
"""

import json

from unclaimed import DATA, repo
from unclaimed.db import SessionLocal

SNAPSHOT = DATA / "approved_resources.json"


def main():
    with SessionLocal() as session:
        resources = [repo.public_dict(r) for r in repo.list_approved(session)]
        data_version = repo.current_data_version(session)
    SNAPSHOT.write_text(json.dumps({"data_version": data_version, "resources": resources}, indent=1, ensure_ascii=False) + "\n")
    print(f"Wrote {len(resources)} approved resources (data version {data_version}) to {SNAPSHOT}.")


if __name__ == "__main__":
    main()

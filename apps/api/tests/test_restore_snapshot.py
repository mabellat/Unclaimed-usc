import copy
import json

import pytest
from sqlalchemy import func, select, text

from tests.conftest import make_pending
from unclaimed import DATA, repo
from unclaimed.models import Resource
from unclaimed.restore_snapshot import restore


@pytest.fixture
def snapshot():
    return json.loads((DATA / "approved_resources.json").read_text())


def test_restore_preserves_approval_and_versions_and_is_repeatable(session, snapshot):
    assert restore(session, snapshot) == len(snapshot["resources"])
    actual = {r["id"]: r for r in (repo.public_dict(row) for row in repo.list_approved(session))}
    for original in snapshot["resources"]:
        for field in ("title", "status", "approved_by", "data_version", "source_url", "evidence_quote", "eligibility"):
            assert actual[original["id"]][field] == original[field]
    assert session.scalar(text("SELECT nextval('data_version_seq')")) > snapshot["data_version"]
    assert restore(session, snapshot) == 0


def test_restore_never_overwrites_an_existing_catalog(session, snapshot):
    make_pending(session, title="Owner's work in progress")
    assert restore(session, snapshot) == 0
    assert session.scalar(select(func.count()).select_from(Resource)) == 1
    assert session.scalar(select(Resource)).status == "pending"


@pytest.mark.parametrize("field,value", [("status", "pending"), ("approved_by", None), ("approved_at", None), ("evidence_quote", ""), ("data_version", None)])
def test_invalid_snapshot_does_not_partially_restore(session, snapshot, field, value):
    broken = copy.deepcopy(snapshot)
    broken["resources"][-1][field] = value
    with pytest.raises(ValueError):
        restore(session, broken)
    assert session.scalar(select(func.count()).select_from(Resource)) == 0

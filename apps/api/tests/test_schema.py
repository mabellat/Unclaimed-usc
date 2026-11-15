"""The database itself enforces the approval rule and the vocabularies."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from tests.conftest import make_pending
from unclaimed.models import Student, StudentFact


def test_approved_row_without_stamps_is_rejected_by_db(session):
    with pytest.raises(IntegrityError, match="ck_resources_approved_stamped"):
        make_pending(session, status="approved")


@pytest.mark.parametrize("missing", ["approved_by", "approved_at", "data_version", "source_url", "evidence_quote"])
def test_approved_row_missing_any_stamp_or_evidence_is_rejected(session, missing):
    stamps = dict(approved_by="owner", approved_at=datetime.now(timezone.utc), data_version=1)
    with pytest.raises(IntegrityError, match="ck_resources_approved_stamped"):
        make_pending(session, status="approved", **(stamps | {missing: None}))


def test_unknown_category_is_rejected(session):
    with pytest.raises(IntegrityError, match="ck_resources_category"):
        make_pending(session, category="grants")


def test_unknown_need_is_rejected(session):
    with pytest.raises(IntegrityError, match="ck_resources_relevance"):
        make_pending(session, relevance=["conference", "parking"])


def test_unknown_status_is_rejected(session):
    with pytest.raises(IntegrityError, match="ck_resources_status"):
        make_pending(session, status="live")


def test_only_one_pending_version_per_resource(session):
    make_pending(session)
    with pytest.raises(IntegrityError, match="uq_resources_one_pending"):
        make_pending(session, version=2)


def test_deadline_and_benefit_value_may_be_null(session):
    r = make_pending(session, deadline_label=None, benefit_value=None)
    assert r.deadline_label is None and r.benefit_value is None


def test_student_fact_unknown_is_a_missing_row_not_null(session):
    session.add(Student(id="s1"))
    session.flush()
    session.add(StudentFact(student_id="s1", field="level", value="grad"))
    session.add(StudentFact(student_id="s1", field="paid_gsg_fee", value=False))
    session.commit()
    rows = dict(session.execute(text("SELECT field, value FROM student_facts")).all())
    assert rows == {"level": "grad", "paid_gsg_fee": False}  # anything else is unknown
    session.add(StudentFact(student_id="s1", field="veteran", value=None))
    with pytest.raises(IntegrityError):
        session.commit()


@pytest.mark.parametrize("url", ["postgres://u:p@h:5432/db", "postgresql://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"])
def test_hosted_database_urls_use_the_psycopg_driver(url):
    from unclaimed.db import _normalize
    assert _normalize(url) == "postgresql+psycopg://u:p@h:5432/db"

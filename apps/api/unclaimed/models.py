"""ORM models. The migration in migrations/versions is the source of truth for constraints."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Resource(Base):
    """One version of a resource. Only status='approved' rows may reach students.

    A source change creates a new pending version; the approved version stays live
    until a human approves the new one (it then becomes 'superseded').
    """

    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    status: Mapped[str] = mapped_column(Text, default="pending")

    title: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    relevance: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)

    benefit_label: Mapped[str | None] = mapped_column(Text)
    benefit_value: Mapped[Decimal | None] = mapped_column(Numeric)  # only when an amount is known
    benefit_period: Mapped[str | None] = mapped_column(Text)

    # [{kind, text, field, op, value, evidence_quote, source_url}]. kind="rule" is evaluated
    # against a profile field; kind="office" is the office's judgment, shown but not evaluated.
    # Anything else is prose: the matcher treats it as unknown and approval refuses it (rules.py).
    eligibility: Mapped[list[dict]] = mapped_column(JSONB, default=list)

    deadline_label: Mapped[str | None] = mapped_column(Text)  # null = no published deadline
    academic_year: Mapped[str | None] = mapped_column(Text)
    where: Mapped[str | None] = mapped_column(Text)
    steps: Mapped[list[dict]] = mapped_column(JSONB, default=list)  # [{text, evidence_quote}]
    docs: Mapped[list[dict]] = mapped_column(JSONB, default=list)  # [{text, evidence_quote}]
    note: Mapped[str | None] = mapped_column(Text)
    # [{field, versions: [{source_url, value, quote}]}]: pages that disagree; students see every version.
    conflicts: Mapped[list[dict]] = mapped_column(JSONB, default=list)

    source_url: Mapped[str | None] = mapped_column(Text)
    evidence_quote: Mapped[str | None] = mapped_column(Text)
    last_verified: Mapped[date | None] = mapped_column(Date)

    # Review-only fields; never returned by the public API.
    owner_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_note: Mapped[str | None] = mapped_column(Text)
    flags: Mapped[str | None] = mapped_column(Text)
    proposed_fields: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    candidate_ref: Mapped[str | None] = mapped_column(Text)
    candidate_text: Mapped[str | None] = mapped_column(Text)

    approved_by: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    data_version: Mapped[int | None] = mapped_column(BigInteger)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Student(Base):
    """A pseudonymous card. No name, email or USC login is stored; deleting it deletes everything."""

    __tablename__ = "students"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    needs: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    demo_day: Mapped[int] = mapped_column(Integer, default=1)  # SIMULATED demo clock
    demo_persona: Mapped[str | None] = mapped_column(Text)  # set when loaded from data/demo_personas.json
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Claim(Base):
    """A claim the student started. Only the student marks it sent; later stages are simulated."""

    __tablename__ = "claims"

    student_id: Mapped[str] = mapped_column(Text, primary_key=True)
    resource_id: Mapped[str] = mapped_column(Text, primary_key=True)
    stage: Mapped[str] = mapped_column(Text, default="drafted")  # drafted | sent
    sent_day: Mapped[int | None] = mapped_column(Integer)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    followup: Mapped[dict | None] = mapped_column(JSONB)  # drafted by the Watcher; the student sends it
    outcome: Mapped[str | None] = mapped_column(Text)  # reported by the student: received | denied | waiting
    outcome_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    data_version: Mapped[int | None] = mapped_column(BigInteger)
    packet: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StudentFact(Base):
    """A self-reported eligibility fact. Tri-state: true/false (or a value) when a row
    exists, unknown when it does not. Unknown is never stored as false."""

    __tablename__ = "student_facts"

    student_id: Mapped[str] = mapped_column(Text, primary_key=True)  # pseudonymous id
    field: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[object] = mapped_column(JSONB)
    source: Mapped[str] = mapped_column(Text, default="student")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ReviewLog(Base):
    """Audit log of bulk review actions."""

    __tablename__ = "review_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    action: Mapped[str] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    details: Mapped[dict] = mapped_column(JSONB, default=dict)


class AgentRun(Base):
    """One agent run with its full trace (inputs, tool calls, outputs) for the trace UI."""

    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    kind: Mapped[str] = mapped_column(Text)  # claim | navigator
    student_id: Mapped[str | None] = mapped_column(Text)
    resource_id: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="running")
    mode: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    inputs: Mapped[dict] = mapped_column(JSONB, default=dict)
    trace: Mapped[list] = mapped_column(JSONB, default=list)
    output: Mapped[dict | None] = mapped_column(JSONB)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SourceCheck(Base):
    """A live re-read of a source page. Never changes approved data; mismatches go to the owner."""

    __tablename__ = "source_checks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    resource_id: Mapped[str] = mapped_column(Text)
    data_version: Mapped[int | None] = mapped_column(BigInteger)
    url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text)  # verified | changed | unreadable | unreachable | blocked
    detail: Mapped[str | None] = mapped_column(Text)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)


class PageSnapshot(Base):
    """Raw text of an allowlisted page, with its fetch date."""

    __tablename__ = "page_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    url: Mapped[str] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status_code: Mapped[int | None] = mapped_column(Integer)
    text: Mapped[str | None] = mapped_column(Text)
    text_hash: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)


class WatcherRun(Base):
    __tablename__ = "watcher_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    summary: Mapped[dict] = mapped_column(JSONB, default=dict)


class ResourceChange(Base):
    """What changed when an approved version replaced another. The only source of change alerts."""

    __tablename__ = "resource_changes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    resource_id: Mapped[str] = mapped_column(Text)
    from_version: Mapped[int] = mapped_column(Integer)
    to_version: Mapped[int] = mapped_column(Integer)
    to_data_version: Mapped[int] = mapped_column(BigInteger)
    approved_by: Mapped[str] = mapped_column(Text)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    changes: Mapped[list] = mapped_column(JSONB)

"""resources, student_facts, data_version sequence

Revision ID: 0001
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Frozen copies of unclaimed/vocab.py at the time of this migration.
CATEGORIES = (
    "cash", "scholarship", "legal", "career", "basics",
    "health", "jobs", "academic_support", "transportation", "support_office", "community", "international",
)
NEEDS = (
    "money", "conference", "research", "caregiver", "housing", "legal", "job", "food",
    "wellbeing", "accessibility", "academics", "transport", "community", "international",
)
STATUSES = ("pending", "approved", "rejected", "superseded")


def _in(values):
    return ", ".join(f"'{v}'" for v in values)


def upgrade():
    op.execute("CREATE SEQUENCE data_version_seq")

    op.create_table(
        "resources",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("version", sa.Integer, primary_key=True),
        sa.Column("status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("title", sa.Text),
        sa.Column("provider", sa.Text),
        sa.Column("category", sa.Text),
        sa.Column("relevance", ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("benefit_label", sa.Text),
        sa.Column("benefit_value", sa.Numeric),
        sa.Column("benefit_period", sa.Text),
        sa.Column("eligibility", JSONB, nullable=False, server_default="[]"),
        sa.Column("deadline_label", sa.Text),
        sa.Column("academic_year", sa.Text),
        sa.Column("where", sa.Text),
        sa.Column("steps", JSONB, nullable=False, server_default="[]"),
        sa.Column("docs", JSONB, nullable=False, server_default="[]"),
        sa.Column("note", sa.Text),
        sa.Column("source_url", sa.Text),
        sa.Column("evidence_quote", sa.Text),
        sa.Column("last_verified", sa.Date),
        sa.Column("owner_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("verification_note", sa.Text),
        sa.Column("flags", sa.Text),
        sa.Column("proposed_fields", ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("candidate_ref", sa.Text),
        sa.Column("candidate_text", sa.Text),
        sa.Column("approved_by", sa.Text),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("data_version", sa.BigInteger),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(f"status IN ({_in(STATUSES)})", name="ck_resources_status"),
        sa.CheckConstraint(f"category IS NULL OR category IN ({_in(CATEGORIES)})", name="ck_resources_category"),
        sa.CheckConstraint(f"relevance <@ ARRAY[{_in(NEEDS)}]::text[]", name="ck_resources_relevance"),
        sa.CheckConstraint("benefit_value IS NULL OR benefit_value >= 0", name="ck_resources_benefit_value"),
        # The approval rule, enforced by the database: an approved row is stamped and has its evidence.
        sa.CheckConstraint(
            "status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL"
            " AND data_version IS NOT NULL AND source_url IS NOT NULL AND evidence_quote IS NOT NULL)",
            name="ck_resources_approved_stamped",
        ),
    )
    # At most one live approved version and one pending version per resource.
    op.create_index("uq_resources_one_approved", "resources", ["id"], unique=True,
                    postgresql_where=sa.text("status = 'approved'"))
    op.create_index("uq_resources_one_pending", "resources", ["id"], unique=True,
                    postgresql_where=sa.text("status = 'pending'"))

    op.create_table(
        "student_facts",
        sa.Column("student_id", sa.Text, primary_key=True),
        sa.Column("field", sa.Text, primary_key=True),
        sa.Column("value", JSONB, nullable=False),
        sa.Column("source", sa.Text, nullable=False, server_default="student"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("source IN ('student')", name="ck_student_facts_source"),
        # Unknown is a missing row, never a stored null or false.
        sa.CheckConstraint("jsonb_typeof(value) <> 'null'", name="ck_student_facts_known"),
    )


def downgrade():
    op.drop_table("student_facts")
    op.drop_table("resources")
    op.execute("DROP SEQUENCE data_version_seq")

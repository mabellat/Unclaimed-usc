"""agent_runs (trace log for every agent run) and source_checks (live page re-checks)

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column("student_id", sa.Text, sa.ForeignKey("students.id", ondelete="CASCADE")),
        sa.Column("resource_id", sa.Text),
        sa.Column("status", sa.Text, nullable=False, server_default="running"),
        sa.Column("mode", sa.Text),  # "claude" or the labelled no-LLM fallback
        sa.Column("model", sa.Text),
        sa.Column("inputs", JSONB, nullable=False, server_default="{}"),
        sa.Column("trace", JSONB, nullable=False, server_default="[]"),
        sa.Column("output", JSONB),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("kind IN ('claim', 'navigator')", name="ck_agent_runs_kind"),
        sa.CheckConstraint("status IN ('running', 'done', 'failed', 'stopped')", name="ck_agent_runs_status"),
    )
    # A live fetch never changes approved data. A mismatch is recorded here for the owner to review.
    op.create_table(
        "source_checks",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("resource_id", sa.Text, nullable=False),
        sa.Column("data_version", sa.BigInteger),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False),
        sa.Column("detail", sa.Text),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.CheckConstraint("status IN ('verified', 'changed', 'unreadable', 'unreachable', 'blocked')", name="ck_source_checks_status"),
    )


def downgrade():
    op.drop_table("source_checks")
    op.drop_table("agent_runs")

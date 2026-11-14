"""Watcher: page snapshots, conflicts, approved change log, claim follow-ups and outcomes

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # Raw text of every allowlisted page the Watcher fetched, with its fetch date.
    op.create_table(
        "page_snapshots",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("url", sa.Text, nullable=False, index=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("status_code", sa.Integer),
        sa.Column("text", sa.Text),
        sa.Column("text_hash", sa.Text),
        sa.Column("error", sa.Text),
    )
    op.create_table(
        "watcher_runs",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("summary", JSONB, nullable=False, server_default="{}"),
    )
    # Pages that disagree about the same resource. Students see every version, with its source.
    op.add_column("resources", sa.Column("conflicts", JSONB, nullable=False, server_default="[]"))
    # What changed when an approved version replaced another. Students hear about it only from here.
    op.create_table(
        "resource_changes",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("resource_id", sa.Text, nullable=False, index=True),
        sa.Column("from_version", sa.Integer, nullable=False),
        sa.Column("to_version", sa.Integer, nullable=False),
        sa.Column("to_data_version", sa.BigInteger, nullable=False),
        sa.Column("approved_by", sa.Text, nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changes", JSONB, nullable=False),
    )
    op.add_column("claims", sa.Column("sent_at", sa.DateTime(timezone=True)))
    op.add_column("claims", sa.Column("followup", JSONB))
    op.add_column("claims", sa.Column("outcome", sa.Text))
    op.add_column("claims", sa.Column("outcome_at", sa.DateTime(timezone=True)))
    op.create_check_constraint("ck_claims_outcome", "claims", "outcome IS NULL OR outcome IN ('received', 'denied', 'waiting')")


def downgrade():
    op.drop_constraint("ck_claims_outcome", "claims")
    for c in ("outcome_at", "outcome", "followup", "sent_at"):
        op.drop_column("claims", c)
    op.drop_table("resource_changes")
    op.drop_column("resources", "conflicts")
    op.drop_table("watcher_runs")
    op.drop_table("page_snapshots")

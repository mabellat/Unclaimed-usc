"""students (pseudonymous card) and claims

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from unclaimed.vocab import NEEDS

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def _in(values):
    return ", ".join(f"'{v}'" for v in values)


def upgrade():
    # A card is a pseudonymous id. No name, email or USC login is ever stored.
    op.create_table(
        "students",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("needs", ARRAY(sa.Text), nullable=False, server_default="{}"),
        # SIMULATED demo clock (Day 1 / 7 / 30) that advances claim statuses.
        sa.Column("demo_day", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(f"needs <@ ARRAY[{_in(NEEDS)}]::text[]", name="ck_students_needs"),
        sa.CheckConstraint("demo_day IN (1, 7, 30)", name="ck_students_demo_day"),
    )
    # Facts saved before this migration have no card to belong to; there are none outside tests.
    op.execute("DELETE FROM student_facts")
    op.create_foreign_key("fk_student_facts_student", "student_facts", "students",
                          ["student_id"], ["id"], ondelete="CASCADE")
    op.create_table(
        "claims",
        sa.Column("student_id", sa.Text, sa.ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("resource_id", sa.Text, primary_key=True),
        # Only the student moves a claim from drafted to sent. Later stages are simulated from the demo clock.
        sa.Column("stage", sa.Text, nullable=False, server_default="drafted"),
        sa.Column("sent_day", sa.Integer),
        sa.Column("data_version", sa.BigInteger),
        sa.Column("packet", JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("stage IN ('drafted', 'sent')", name="ck_claims_stage"),
        sa.CheckConstraint("stage <> 'sent' OR sent_day IS NOT NULL", name="ck_claims_sent_day"),
    )


def downgrade():
    op.drop_table("claims")
    op.drop_constraint("fk_student_facts_student", "student_facts", type_="foreignkey")
    op.drop_table("students")

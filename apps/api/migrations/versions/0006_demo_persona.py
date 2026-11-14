"""students.demo_persona: which demo persona a card was loaded from (for cached demo runs)

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("students", sa.Column("demo_persona", sa.Text))


def downgrade():
    op.drop_column("students", "demo_persona")

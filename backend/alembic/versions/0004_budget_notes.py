"""add notes to budget envelopes

Revision ID: 0004_budget_notes
Revises: 0003_trip_fields
Create Date: 2025-12-01 12:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_budget_notes"
down_revision = "0003_trip_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("budget_envelopes") as batch_op:
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("budget_envelopes") as batch_op:
        batch_op.drop_column("notes")

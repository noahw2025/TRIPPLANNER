"""add trip budget personalization and event fields

Revision ID: 0003_trip_budget_trip_type_event_fields
Revises: 0002_add_location_coords
Create Date: 2025-12-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_trip_fields"
down_revision = "0002_add_location_coords"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("trips") as batch_op:
        batch_op.add_column(sa.Column("total_budget", sa.Float(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("currency", sa.String(), nullable=False, server_default="USD"))
        batch_op.add_column(sa.Column("party_size", sa.Integer(), nullable=False, server_default="1"))
        batch_op.add_column(sa.Column("price_sensitivity", sa.String(), nullable=False, server_default="balanced"))
        batch_op.add_column(sa.Column("trip_type", sa.String(), nullable=False, server_default="balanced"))

    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("category_type", sa.String(), nullable=False, server_default="other"))
        batch_op.add_column(sa.Column("is_refundable", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        batch_op.add_column(sa.Column("reservation_link", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("reservation_link")
        batch_op.drop_column("is_refundable")
        batch_op.drop_column("category_type")

    with op.batch_alter_table("trips") as batch_op:
        batch_op.drop_column("trip_type")
        batch_op.drop_column("price_sensitivity")
        batch_op.drop_column("party_size")
        batch_op.drop_column("currency")
        batch_op.drop_column("total_budget")

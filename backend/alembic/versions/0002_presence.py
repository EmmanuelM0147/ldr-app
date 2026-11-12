"""Presence flags for a couple."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_presence"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "presence",
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("free_to_talk", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_presence_couple_id", "presence", ["couple_id"])


def downgrade() -> None:
    op.drop_index("ix_presence_couple_id", table_name="presence")
    op.drop_table("presence")

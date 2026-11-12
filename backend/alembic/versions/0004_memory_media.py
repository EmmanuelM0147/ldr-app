"""Add optional media columns to memories."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_memory_media"
down_revision: str | None = "0003_visit_traveler"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("memories") as batch:
        batch.add_column(sa.Column("media_kind", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("media_content_type", sa.String(length=100), nullable=True))
        batch.add_column(sa.Column("media_filename", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("media_path", sa.String(length=512), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("memories") as batch:
        batch.drop_column("media_path")
        batch.drop_column("media_filename")
        batch.drop_column("media_content_type")
        batch.drop_column("media_kind")

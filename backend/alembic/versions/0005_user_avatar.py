"""Add optional avatar columns to users."""

from alembic import op
import sqlalchemy as sa

revision: str = "0005_user_avatar"
down_revision: str | None = "0004_memory_media"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("avatar_content_type", sa.String(length=100), nullable=True))
        batch.add_column(sa.Column("avatar_filename", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("avatar_path", sa.String(length=512), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("avatar_path")
        batch.drop_column("avatar_filename")
        batch.drop_column("avatar_content_type")

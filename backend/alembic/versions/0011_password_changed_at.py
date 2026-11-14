"""Track password_changed_at to invalidate older JWTs."""

from alembic import op
import sqlalchemy as sa

revision: str = "0011_password_changed_at"
down_revision: str | None = "0010_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_changed_at")

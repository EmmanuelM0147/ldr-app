"""Password reset tokens and rate-limit rows."""

from alembic import op
import sqlalchemy as sa

revision: str = "0008_password_reset"
down_revision: str | None = "0007_login_failures"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)

    op.create_table(
        "password_reset_failures",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("ip", sa.String(64), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_password_reset_failures_ip", "password_reset_failures", ["ip"])
    op.create_index("ix_password_reset_failures_email", "password_reset_failures", ["email"])
    op.create_index("ix_password_reset_failures_created_at", "password_reset_failures", ["created_at"])


def downgrade() -> None:
    op.drop_table("password_reset_failures")
    op.drop_table("password_reset_tokens")

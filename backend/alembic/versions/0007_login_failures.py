"""Track failed login/register attempts for rate limiting."""

from alembic import op
import sqlalchemy as sa

revision: str = "0007_login_failures"
down_revision: str | None = "0006_membership_seat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_failures",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("ip", sa.String(64), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_login_failures_ip", "login_failures", ["ip"])
    op.create_index("ix_login_failures_email", "login_failures", ["email"])
    op.create_index("ix_login_failures_created_at", "login_failures", ["created_at"])

    op.create_table(
        "register_failures",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("ip", sa.String(64), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_register_failures_ip", "register_failures", ["ip"])
    op.create_index("ix_register_failures_email", "register_failures", ["email"])
    op.create_index("ix_register_failures_created_at", "register_failures", ["created_at"])


def downgrade() -> None:
    op.drop_table("register_failures")
    op.drop_table("login_failures")

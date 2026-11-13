"""Per-couple daily AI request counter."""

from alembic import op
import sqlalchemy as sa

revision: str = "0009_ai_daily_usage"
down_revision: str | None = "0008_password_reset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_daily_usage",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "couple_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("couples.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("couple_id", "day", name="uq_ai_daily_usage_couple_day"),
    )
    op.create_index("ix_ai_daily_usage_couple_id", "ai_daily_usage", ["couple_id"])


def downgrade() -> None:
    op.drop_table("ai_daily_usage")

"""Initial SQLite schema for the couple space."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(40), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "couples",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("ai_opt_in", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "memberships",
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "invites",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("code_hash"),
    )
    op.create_index("ix_invites_couple_id", "invites", ["couple_id"])
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location", sa.String(120), nullable=True),
        sa.Column("notes", sa.String(2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_events_couple_id", "events", ["couple_id"])
    op.create_table(
        "visits",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(120), nullable=True),
        sa.Column("notes", sa.String(2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_visits_couple_id", "visits", ["couple_id"])
    op.create_table(
        "budgets",
        sa.Column("visit_id", sa.Uuid(as_uuid=True), sa.ForeignKey("visits.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("total_minor", sa.Integer(), nullable=False),
    )
    op.create_table(
        "budget_shares",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("visit_id", sa.Uuid(as_uuid=True), sa.ForeignKey("budgets.visit_id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
    )
    op.create_index("ix_budget_shares_visit_id", "budget_shares", ["visit_id"])
    op.create_table(
        "check_ins",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("mood", sa.String(16), nullable=False),
        sa.Column("note", sa.String(280), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "local_date"),
    )
    op.create_index("ix_check_ins_couple_id", "check_ins", ["couple_id"])
    op.create_table(
        "memories",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("couple_id", sa.Uuid(as_uuid=True), sa.ForeignKey("couples.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(80), nullable=True),
        sa.Column("body", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_memories_couple_id", "memories", ["couple_id"])
    op.create_table(
        "join_failures",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("ip", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_join_failures_ip", "join_failures", ["ip"])
    op.create_index("ix_join_failures_created_at", "join_failures", ["created_at"])


def downgrade() -> None:
    op.drop_table("join_failures")
    op.drop_table("memories")
    op.drop_table("check_ins")
    op.drop_table("budget_shares")
    op.drop_table("budgets")
    op.drop_table("visits")
    op.drop_table("events")
    op.drop_table("invites")
    op.drop_table("memberships")
    op.drop_table("couples")
    op.drop_table("users")

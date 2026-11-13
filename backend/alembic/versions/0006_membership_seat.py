"""Cap couple memberships at two via seat column."""

from alembic import op
import sqlalchemy as sa

revision: str = "0006_membership_seat"
down_revision: str | None = "0005_user_avatar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("memberships") as batch:
        batch.add_column(sa.Column("seat", sa.SmallInteger(), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT couple_id, user_id, joined_at FROM memberships ORDER BY couple_id, joined_at, user_id"
        )
    ).fetchall()
    seats: dict[object, int] = {}
    for couple_id, user_id, _joined_at in rows:
        next_seat = seats.get(couple_id, 0) + 1
        if next_seat > 2:
            raise RuntimeError(f"Couple {couple_id} already has more than two memberships")
        seats[couple_id] = next_seat
        connection.execute(
            sa.text("UPDATE memberships SET seat = :seat WHERE couple_id = :couple_id AND user_id = :user_id"),
            {"seat": next_seat, "couple_id": couple_id, "user_id": user_id},
        )

    with op.batch_alter_table("memberships") as batch:
        batch.alter_column("seat", existing_type=sa.SmallInteger(), nullable=False)
        batch.create_unique_constraint("uq_memberships_couple_seat", ["couple_id", "seat"])
        batch.create_check_constraint("ck_memberships_seat_range", "seat IN (1, 2)")


def downgrade() -> None:
    with op.batch_alter_table("memberships") as batch:
        batch.drop_constraint("ck_memberships_seat_range", type_="check")
        batch.drop_constraint("uq_memberships_couple_seat", type_="unique")
        batch.drop_column("seat")

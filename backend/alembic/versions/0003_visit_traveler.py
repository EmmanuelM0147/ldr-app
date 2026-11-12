"""Add traveler_user_id to visits."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_visit_traveler"
down_revision: str | None = "0002_presence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("visits") as batch:
        batch.add_column(sa.Column("traveler_user_id", sa.Uuid(as_uuid=True), nullable=True))
        batch.create_foreign_key(
            "fk_visits_traveler_user_id_users",
            "users",
            ["traveler_user_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("visits") as batch:
        batch.drop_constraint("fk_visits_traveler_user_id_users", type_="foreignkey")
        batch.drop_column("traveler_user_id")

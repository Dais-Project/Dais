"""Add CASCADE delete to schedules workspace foreign key.

Revision ID: 1c2d5a8b4f90
Revises: 6e8c6ec99a5c
Create Date: 2026-05-16 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1c2d5a8b4f90"
down_revision: Union[str, Sequence[str], None] = "6e8c6ec99a5c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("schedules", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("fk_schedules__workspace_id_workspaces"), type_="foreignkey")
        batch_op.create_foreign_key(None, "workspaces", ["_workspace_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("schedules", schema=None) as batch_op:
        batch_op.drop_constraint(None, type_="foreignkey")
        batch_op.create_foreign_key(batch_op.f("fk_schedules__workspace_id_workspaces"), "workspaces", ["_workspace_id"], ["id"])

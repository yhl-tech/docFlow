"""add billing fields: balance_cents, member_plan, member_expires_at

Revision ID: 001_add_billing_fields
Revises:
Create Date: 2026-03-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_add_billing_fields"
down_revision: Union[str, None] = None
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("balance_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("member_plan", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("member_expires_at", sa.DateTime(timezone=True), nullable=True))
    # 升级已有用户的免费配额：从 5 改为 6（仅影响 server_default，新注册用户已在模型层默认 6）
    op.execute("UPDATE users SET quota_total = 6 WHERE quota_total = 5")


def downgrade() -> None:
    op.drop_column("users", "member_expires_at")
    op.drop_column("users", "member_plan")
    op.drop_column("users", "balance_cents")

"""add folders table and soft delete fields

Revision ID: 002_add_folder_and_soft_delete
Revises: 001_add_billing_fields
Create Date: 2026-05-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_add_folder_and_soft_delete"
down_revision: Union[str, None] = "001_add_billing_fields"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "folders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("parent_id", sa.String(36), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_folders_user_id", "folders", ["user_id"])
    op.create_index("ix_folders_parent_id", "folders", ["parent_id"])

    op.add_column("documents", sa.Column("folder_id", sa.String(36), sa.ForeignKey("folders.id", ondelete="SET NULL"), nullable=True))
    op.add_column("documents", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("documents", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_documents_folder_id", "documents", ["folder_id"])
    op.create_index("ix_documents_is_deleted", "documents", ["is_deleted"])

    op.add_column("document_templates", sa.Column("is_public", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("document_templates", sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("document_templates", sa.Column("preview_image_url", sa.String(500), nullable=True))
    op.add_column("document_templates", sa.Column("tags", sa.JSON(), nullable=True, server_default="[]"))
    op.add_column("document_templates", sa.Column("rating_avg", sa.Float(), nullable=True))
    op.add_column("document_templates", sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_index("ix_documents_is_deleted", "documents")
    op.drop_index("ix_documents_folder_id", "documents")
    for col in ["folder_id", "is_deleted", "deleted_at"]:
        op.drop_column("documents", col)

    for col in ["is_public", "usage_count", "preview_image_url", "tags", "rating_avg", "rating_count"]:
        op.drop_column("document_templates", col)

    op.drop_index("ix_folders_parent_id", "folders")
    op.drop_index("ix_folders_user_id", "folders")
    op.drop_table("folders")

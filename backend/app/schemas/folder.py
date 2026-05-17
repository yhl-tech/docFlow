from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parent_id: Optional[str] = None


class DocumentMetaSchema(BaseModel):
    id: str
    title: str
    folder_id: Optional[str]
    updated_at: str
    word_count: int
    is_deleted: bool = False
    deleted_at: Optional[str] = None

    class Config:
        from_attributes = True


class FolderNodeSchema(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    sort_order: int
    children: list[FolderNodeSchema] = []
    documents: list[DocumentMetaSchema] = []

    class Config:
        from_attributes = True


class DocumentMoveBody(BaseModel):
    folder_id: Optional[str] = None

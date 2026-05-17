from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.folder import Folder


async def trash_document(db: AsyncSession, doc_id: str, user_id: str) -> None:
    doc = await _get_doc_or_404(db, doc_id, user_id)
    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()


async def restore_document(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
            Document.is_deleted == True,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在或未在回收站中", "code": "NOT_FOUND"})

    # 原文件夹已删除时，恢复到根目录
    if doc.folder_id:
        folder_exists = await db.get(Folder, doc.folder_id)
        if not folder_exists:
            doc.folder_id = None

    doc.is_deleted = False
    doc.deleted_at = None
    await db.flush()
    return doc


async def delete_permanent(db: AsyncSession, doc_id: str, user_id: str) -> None:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
            Document.is_deleted == True,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在或未在回收站中", "code": "NOT_FOUND"})
    await db.delete(doc)
    await db.flush()


async def empty_trash(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.is_deleted == True,
        )
    )
    docs = result.scalars().all()
    count = len(docs)
    for doc in docs:
        await db.delete(doc)
    await db.flush()
    return count


async def get_trash(db: AsyncSession, user_id: str) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id, Document.is_deleted == True)
        .order_by(Document.deleted_at.desc())
    )
    return list(result.scalars().all())


async def move_document(db: AsyncSession, doc_id: str, user_id: str, folder_id: Optional[str]) -> None:
    doc = await _get_doc_or_404(db, doc_id, user_id)
    if folder_id:
        folder = await db.get(Folder, folder_id)
        if not folder or folder.user_id != user_id:
            raise HTTPException(status_code=404, detail={"error": "目标文件夹不存在", "code": "NOT_FOUND"})
    doc.folder_id = folder_id
    await db.flush()


async def duplicate_document(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    orig = await _get_doc_or_404(db, doc_id, user_id)
    from app.models.document import Document as Doc
    copy = Doc(
        user_id=user_id,
        title=f"{orig.title} - 副本",
        content=orig.content,
        template=orig.template,
        template_binding_json=orig.template_binding_json,
        word_count=orig.word_count,
        folder_id=orig.folder_id,
    )
    db.add(copy)
    await db.flush()
    return copy


async def rename_document(db: AsyncSession, doc_id: str, user_id: str, title: str) -> Document:
    doc = await _get_doc_or_404(db, doc_id, user_id)
    doc.title = title.strip() or "未命名文档"
    await db.flush()
    return doc


async def search_documents(db: AsyncSession, user_id: str, q: str) -> list[dict]:
    if not q.strip():
        return []

    result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.is_deleted == False,
            or_(
                Document.title.ilike(f"%{q}%"),
                Document.content.ilike(f"%{q}%"),
            ),
        ).order_by(Document.updated_at.desc()).limit(50)
    )
    docs = result.scalars().all()

    # 获取文件夹信息构建路径
    folder_ids = list({d.folder_id for d in docs if d.folder_id})
    folder_names: dict[str, str] = {}
    if folder_ids:
        fr = await db.execute(select(Folder.id, Folder.name).where(Folder.id.in_(folder_ids)))
        folder_names = {row[0]: row[1] for row in fr.all()}

    return [
        {
            "id": d.id,
            "title": d.title,
            "folder_id": d.folder_id,
            "folder_name": folder_names.get(d.folder_id, "") if d.folder_id else "",
            "updated_at": d.updated_at.isoformat() if d.updated_at else "",
            "word_count": d.word_count,
        }
        for d in docs
    ]


async def _get_doc_or_404(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
            Document.is_deleted == False,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在", "code": "NOT_FOUND"})
    return doc

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.folder import Folder
from app.schemas.folder import FolderNodeSchema, DocumentMetaSchema


async def get_tree(db: AsyncSession, user_id: str) -> list[dict]:
    folders_result = await db.execute(
        select(Folder).where(Folder.user_id == user_id).order_by(Folder.sort_order, Folder.created_at)
    )
    folders = folders_result.scalars().all()

    docs_result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.is_deleted == False,
        ).order_by(Document.updated_at.desc())
    )
    docs = docs_result.scalars().all()

    return _build_tree(list(folders), list(docs))


async def create_folder(db: AsyncSession, user_id: str, name: str, parent_id: Optional[str]) -> Folder:
    if parent_id:
        await _validate_depth(db, parent_id)
        parent = await _get_folder_or_404(db, parent_id, user_id)
        _ = parent  # 确保父文件夹属于当前用户

    folder = Folder(user_id=user_id, name=name.strip(), parent_id=parent_id)
    db.add(folder)
    await db.flush()
    await db.refresh(folder)
    return folder


async def update_folder(db: AsyncSession, folder_id: str, user_id: str, name: Optional[str], parent_id: Optional[str]) -> Folder:
    folder = await _get_folder_or_404(db, folder_id, user_id)

    if name is not None:
        folder.name = name.strip()

    if parent_id is not None:
        if parent_id == folder_id:
            raise HTTPException(status_code=400, detail={"error": "文件夹不能移动到自身", "code": "INVALID_MOVE"})
        await _validate_depth(db, parent_id)
        folder.parent_id = parent_id

    await db.flush()
    await db.refresh(folder)
    return folder


async def delete_folder(db: AsyncSession, folder_id: str, user_id: str) -> None:
    await _get_folder_or_404(db, folder_id, user_id)

    # 收集所有子文件夹 id（含自身）
    all_folder_ids = await _collect_all_folder_ids(db, folder_id)

    # 软删除所有文档
    now = datetime.now(timezone.utc)
    await db.execute(
        update(Document)
        .where(Document.folder_id.in_(all_folder_ids))
        .values(is_deleted=True, deleted_at=now, folder_id=None)
    )

    # 删除所有子文件夹（从叶子到根，级联）
    # 由于 ON DELETE CASCADE，直接删除根文件夹即可
    folder = await db.get(Folder, folder_id)
    if folder:
        await db.delete(folder)

    await db.flush()


def _build_tree(folders: list[Folder], docs: list[Document]) -> list[dict]:
    folder_map: dict[str, dict] = {}
    for f in folders:
        folder_map[f.id] = {
            "id": f.id,
            "name": f.name,
            "parent_id": f.parent_id,
            "sort_order": f.sort_order,
            "children": [],
            "documents": [],
        }

    # 将文档分配到文件夹
    root_docs = []
    for d in docs:
        doc_dict = {
            "id": d.id,
            "title": d.title,
            "folder_id": d.folder_id,
            "updated_at": d.updated_at.isoformat() if d.updated_at else "",
            "word_count": d.word_count,
            "is_deleted": d.is_deleted,
            "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
        }
        if d.folder_id and d.folder_id in folder_map:
            folder_map[d.folder_id]["documents"].append(doc_dict)
        else:
            root_docs.append(doc_dict)

    # 构建文件夹树
    roots = []
    for f_id, f_dict in folder_map.items():
        parent_id = f_dict["parent_id"]
        if parent_id and parent_id in folder_map:
            folder_map[parent_id]["children"].append(f_dict)
        else:
            roots.append(f_dict)

    # 用包装结构区分文件夹和根级文档，避免前端混淆
    return [{"__type": "root", "folders": roots, "documents": root_docs}]


async def _get_folder_or_404(db: AsyncSession, folder_id: str, user_id: str) -> Folder:
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail={"error": "文件夹不存在", "code": "NOT_FOUND"})
    return folder


async def _validate_depth(db: AsyncSession, parent_id: str, max_depth: int = 3) -> None:
    depth = 0
    current_id: Optional[str] = parent_id
    while current_id:
        result = await db.execute(select(Folder.parent_id).where(Folder.id == current_id))
        row = result.first()
        if not row:
            break
        current_id = row[0]
        depth += 1
        if depth >= max_depth:
            raise HTTPException(
                status_code=400,
                detail={"error": f"文件夹最多嵌套 {max_depth} 层", "code": "MAX_DEPTH_EXCEEDED"},
            )


async def _collect_all_folder_ids(db: AsyncSession, root_id: str) -> list[str]:
    ids = [root_id]
    queue = [root_id]
    while queue:
        current = queue.pop()
        result = await db.execute(select(Folder.id).where(Folder.parent_id == current))
        child_ids = [row[0] for row in result.all()]
        ids.extend(child_ids)
        queue.extend(child_ids)
    return ids

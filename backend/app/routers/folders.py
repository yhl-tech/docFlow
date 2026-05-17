from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DB
from app.schemas.folder import FolderCreate, FolderUpdate, FolderNodeSchema
from app.services import folder_service

router = APIRouter()


@router.get("", summary="获取文件夹树")
async def get_tree(user: CurrentUser, db: DB) -> list[dict]:
    return await folder_service.get_tree(db, user.id)


@router.post("", status_code=201, summary="创建文件夹")
async def create_folder(body: FolderCreate, user: CurrentUser, db: DB):
    folder = await folder_service.create_folder(db, user.id, body.name, body.parent_id)
    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "sort_order": folder.sort_order,
        "children": [],
        "documents": [],
    }


@router.put("/{folder_id}", summary="重命名或移动文件夹")
async def update_folder(folder_id: str, body: FolderUpdate, user: CurrentUser, db: DB):
    folder = await folder_service.update_folder(db, folder_id, user.id, body.name, body.parent_id)
    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "sort_order": folder.sort_order,
    }


@router.delete("/{folder_id}", status_code=204, summary="删除文件夹（级联软删除内部文档）")
async def delete_folder(folder_id: str, user: CurrentUser, db: DB):
    await folder_service.delete_folder(db, folder_id, user.id)

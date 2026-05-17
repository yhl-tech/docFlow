"""document_service 单元测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from fastapi import HTTPException


# ──────────────────────────────────────────────────────────────────────────────
# 辅助工厂
# ──────────────────────────────────────────────────────────────────────────────

def _make_doc(id: str = "d1", user_id: str = "u1", title: str = "Doc",
              folder_id: str | None = None, content: str = "",
              word_count: int = 0, is_deleted: bool = False,
              deleted_at=None, updated_at=None):
    d = MagicMock()
    d.id = id
    d.user_id = user_id
    d.title = title
    d.folder_id = folder_id
    d.content = content
    d.word_count = word_count
    d.is_deleted = is_deleted
    d.deleted_at = deleted_at
    d.updated_at = updated_at or datetime(2026, 1, 1, tzinfo=timezone.utc)
    return d


def _make_folder(id: str = "f1", user_id: str = "u1", name: str = "Folder"):
    f = MagicMock()
    f.id = id
    f.user_id = user_id
    f.name = name
    return f


def _mock_db():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=value)
    return result


def _scalars_result(values: list):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all = MagicMock(return_value=values)
    result.scalars = MagicMock(return_value=scalars)
    return result


def _all_result(values: list):
    result = MagicMock()
    result.all = MagicMock(return_value=values)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# trash_document
# ──────────────────────────────────────────────────────────────────────────────

class TestTrashDocument:
    @pytest.mark.asyncio
    async def test_marks_document_as_deleted(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1")

        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        await document_service.trash_document(db, "d1", "u1")

        assert doc.is_deleted is True
        assert doc.deleted_at is not None
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_deleted_at_is_utc(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        await document_service.trash_document(db, "d1", "u1")
        assert doc.deleted_at.tzinfo is not None

    @pytest.mark.asyncio
    async def test_not_found_raises(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        monkeypatch.setattr(
            document_service, "_get_doc_or_404",
            AsyncMock(side_effect=HTTPException(status_code=404, detail={"code": "NOT_FOUND"}))
        )
        with pytest.raises(HTTPException) as exc:
            await document_service.trash_document(db, "ghost", "u1")
        assert exc.value.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# restore_document
# ──────────────────────────────────────────────────────────────────────────────

class TestRestoreDocument:
    @pytest.mark.asyncio
    async def test_restore_normal(self):
        from app.services.document_service import restore_document
        db = _mock_db()
        doc = _make_doc("d1", folder_id="f1", is_deleted=True)
        doc.is_deleted = True
        doc.deleted_at = datetime.now(timezone.utc)

        db.execute = AsyncMock(return_value=_scalar_result(doc))
        folder = _make_folder("f1")
        db.get = AsyncMock(return_value=folder)

        result = await restore_document(db, "d1", "u1")
        assert result.is_deleted is False
        assert result.deleted_at is None
        assert result.folder_id == "f1"  # 原文件夹存在，保持不变
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_restore_to_root_when_folder_deleted(self):
        """原文件夹已不存在，应恢复到根目录（folder_id=None）"""
        from app.services.document_service import restore_document
        db = _mock_db()
        doc = _make_doc("d1", folder_id="f1", is_deleted=True)

        db.execute = AsyncMock(return_value=_scalar_result(doc))
        db.get = AsyncMock(return_value=None)  # 文件夹已被删除

        result = await restore_document(db, "d1", "u1")
        assert result.folder_id is None
        assert result.is_deleted is False

    @pytest.mark.asyncio
    async def test_restore_doc_not_in_trash_raises(self):
        from app.services.document_service import restore_document
        db = _mock_db()
        db.execute = AsyncMock(return_value=_scalar_result(None))

        with pytest.raises(HTTPException) as exc:
            await restore_document(db, "d1", "u1")
        assert exc.value.status_code == 404
        assert exc.value.detail["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_restore_doc_without_folder_id(self):
        """原始文档无 folder_id，恢复后仍应在根目录"""
        from app.services.document_service import restore_document
        db = _mock_db()
        doc = _make_doc("d1", folder_id=None, is_deleted=True)

        db.execute = AsyncMock(return_value=_scalar_result(doc))

        result = await restore_document(db, "d1", "u1")
        assert result.folder_id is None
        assert result.is_deleted is False


# ──────────────────────────────────────────────────────────────────────────────
# delete_permanent
# ──────────────────────────────────────────────────────────────────────────────

class TestDeletePermanent:
    @pytest.mark.asyncio
    async def test_permanent_delete_calls_db_delete(self):
        from app.services.document_service import delete_permanent
        db = _mock_db()
        doc = _make_doc("d1", is_deleted=True)
        db.execute = AsyncMock(return_value=_scalar_result(doc))

        await delete_permanent(db, "d1", "u1")
        db.delete.assert_called_once_with(doc)
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_permanent_delete_not_in_trash_raises(self):
        from app.services.document_service import delete_permanent
        db = _mock_db()
        db.execute = AsyncMock(return_value=_scalar_result(None))

        with pytest.raises(HTTPException) as exc:
            await delete_permanent(db, "d1", "u1")
        assert exc.value.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# empty_trash
# ──────────────────────────────────────────────────────────────────────────────

class TestEmptyTrash:
    @pytest.mark.asyncio
    async def test_deletes_all_trash_docs(self):
        from app.services.document_service import empty_trash
        db = _mock_db()
        docs = [_make_doc(f"d{i}", is_deleted=True) for i in range(3)]
        db.execute = AsyncMock(return_value=_scalars_result(docs))

        count = await empty_trash(db, "u1")
        assert count == 3
        assert db.delete.call_count == 3
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_empty_trash_already_empty_returns_zero(self):
        from app.services.document_service import empty_trash
        db = _mock_db()
        db.execute = AsyncMock(return_value=_scalars_result([]))

        count = await empty_trash(db, "u1")
        assert count == 0
        db.delete.assert_not_called()


# ──────────────────────────────────────────────────────────────────────────────
# get_trash
# ──────────────────────────────────────────────────────────────────────────────

class TestGetTrash:
    @pytest.mark.asyncio
    async def test_returns_deleted_docs(self):
        from app.services.document_service import get_trash
        db = _mock_db()
        docs = [_make_doc("d1", is_deleted=True), _make_doc("d2", is_deleted=True)]
        db.execute = AsyncMock(return_value=_scalars_result(docs))

        result = await get_trash(db, "u1")
        assert len(result) == 2
        assert all(d.is_deleted for d in result)

    @pytest.mark.asyncio
    async def test_empty_trash_returns_empty_list(self):
        from app.services.document_service import get_trash
        db = _mock_db()
        db.execute = AsyncMock(return_value=_scalars_result([]))

        result = await get_trash(db, "u1")
        assert result == []


# ──────────────────────────────────────────────────────────────────────────────
# move_document
# ──────────────────────────────────────────────────────────────────────────────

class TestMoveDocument:
    @pytest.mark.asyncio
    async def test_move_to_folder(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1", folder_id=None)
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))
        folder = _make_folder("f1", user_id="u1")
        db.get = AsyncMock(return_value=folder)

        await document_service.move_document(db, "d1", "u1", folder_id="f1")
        assert doc.folder_id == "f1"
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_move_to_root(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1", folder_id="f1")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        await document_service.move_document(db, "d1", "u1", folder_id=None)
        assert doc.folder_id is None

    @pytest.mark.asyncio
    async def test_move_to_nonexistent_folder_raises(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))
        db.get = AsyncMock(return_value=None)  # 文件夹不存在

        with pytest.raises(HTTPException) as exc:
            await document_service.move_document(db, "d1", "u1", folder_id="ghost")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_move_to_other_users_folder_raises(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1", user_id="u1")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))
        other_folder = _make_folder("f1", user_id="u2")  # 属于 u2
        db.get = AsyncMock(return_value=other_folder)

        with pytest.raises(HTTPException) as exc:
            await document_service.move_document(db, "d1", "u1", folder_id="f1")
        assert exc.value.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# rename_document
# ──────────────────────────────────────────────────────────────────────────────

class TestRenameDocument:
    @pytest.mark.asyncio
    async def test_rename_normal(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1", title="Old Title")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        result = await document_service.rename_document(db, "d1", "u1", "New Title")
        assert result.title == "New Title"
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_rename_strips_whitespace(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        await document_service.rename_document(db, "d1", "u1", "  Padded  ")
        assert doc.title == "Padded"

    @pytest.mark.asyncio
    async def test_rename_empty_string_becomes_default(self, monkeypatch):
        from app.services import document_service
        db = _mock_db()
        doc = _make_doc("d1", title="Old")
        monkeypatch.setattr(document_service, "_get_doc_or_404", AsyncMock(return_value=doc))

        await document_service.rename_document(db, "d1", "u1", "")
        assert doc.title == "未命名文档"


# ──────────────────────────────────────────────────────────────────────────────
# search_documents
# ──────────────────────────────────────────────────────────────────────────────

class TestSearchDocuments:
    @pytest.mark.asyncio
    async def test_empty_query_returns_empty(self):
        from app.services.document_service import search_documents
        db = _mock_db()
        result = await search_documents(db, "u1", "")
        assert result == []
        db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_whitespace_only_query_returns_empty(self):
        from app.services.document_service import search_documents
        db = _mock_db()
        result = await search_documents(db, "u1", "   ")
        assert result == []

    @pytest.mark.asyncio
    async def test_search_returns_results_with_folder_info(self):
        from app.services.document_service import search_documents
        db = _mock_db()

        doc = _make_doc("d1", title="报告", folder_id="f1")
        doc.content = "内容"

        call_count = [0]

        async def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return _scalars_result([doc])
            # 第二次查询 folder names
            result = MagicMock()
            result.all = MagicMock(return_value=[("f1", "工作文件夹")])
            return result

        db.execute = AsyncMock(side_effect=side_effect)

        results = await search_documents(db, "u1", "报告")
        assert len(results) == 1
        assert results[0]["id"] == "d1"
        assert results[0]["folder_id"] == "f1"
        assert results[0]["folder_name"] == "工作文件夹"

    @pytest.mark.asyncio
    async def test_search_doc_without_folder(self):
        from app.services.document_service import search_documents
        db = _mock_db()

        doc = _make_doc("d1", title="无文件夹文档", folder_id=None)
        doc.content = ""

        async def side_effect(*args, **kwargs):
            return _scalars_result([doc])

        db.execute = AsyncMock(side_effect=side_effect)

        results = await search_documents(db, "u1", "无文件夹")
        assert results[0]["folder_id"] is None
        assert results[0]["folder_name"] == ""

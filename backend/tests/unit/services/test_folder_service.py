"""folder_service 单元测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime, timezone

from fastapi import HTTPException


# ──────────────────────────────────────────────────────────────────────────────
# 辅助工厂
# ──────────────────────────────────────────────────────────────────────────────

def _make_folder(id: str, user_id: str = "u1", name: str = "folder",
                 parent_id: str | None = None, sort_order: int = 0):
    f = MagicMock()
    f.id = id
    f.user_id = user_id
    f.name = name
    f.parent_id = parent_id
    f.sort_order = sort_order
    f.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    f.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return f


def _make_doc(id: str, user_id: str = "u1", title: str = "doc",
              folder_id: str | None = None, word_count: int = 0,
              is_deleted: bool = False, deleted_at=None, updated_at=None):
    d = MagicMock()
    d.id = id
    d.user_id = user_id
    d.title = title
    d.folder_id = folder_id
    d.word_count = word_count
    d.is_deleted = is_deleted
    d.deleted_at = deleted_at
    d.updated_at = updated_at or datetime(2026, 1, 1, tzinfo=timezone.utc)
    return d


def _mock_db():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _scalar_result(value):
    """返回 db.execute 结果的 scalar_one_or_none mock"""
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=value)
    return result


def _scalars_result(values: list):
    """返回 db.execute 结果的 scalars().all() mock"""
    result = MagicMock()
    scalars = MagicMock()
    scalars.all = MagicMock(return_value=values)
    result.scalars = MagicMock(return_value=scalars)
    return result


def _first_result(value):
    """返回 db.execute 结果的 .first() mock"""
    result = MagicMock()
    result.first = MagicMock(return_value=value)
    return result


def _all_result(values: list):
    result = MagicMock()
    result.all = MagicMock(return_value=values)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# _build_tree
# ──────────────────────────────────────────────────────────────────────────────

class TestBuildTree:
    """_build_tree 纯函数测试，不依赖 DB"""

    def test_empty(self):
        from app.services.folder_service import _build_tree
        result = _build_tree([], [])
        assert result == []

    def test_root_folders_only(self):
        from app.services.folder_service import _build_tree
        f1 = _make_folder("f1", name="A")
        f2 = _make_folder("f2", name="B")
        tree = _build_tree([f1, f2], [])
        assert len(tree) == 2
        assert {t["id"] for t in tree} == {"f1", "f2"}

    def test_nested_child_folder(self):
        from app.services.folder_service import _build_tree
        parent = _make_folder("p1", name="Parent")
        child = _make_folder("c1", name="Child", parent_id="p1")
        tree = _build_tree([parent, child], [])
        # 只有 parent 在根
        assert len(tree) == 1
        root = tree[0]
        assert root["id"] == "p1"
        assert len(root["children"]) == 1
        assert root["children"][0]["id"] == "c1"

    def test_document_assigned_to_folder(self):
        from app.services.folder_service import _build_tree
        f = _make_folder("f1")
        d = _make_doc("d1", folder_id="f1")
        tree = _build_tree([f], [d])
        assert tree[0]["documents"][0]["id"] == "d1"

    def test_root_document_no_folder(self):
        from app.services.folder_service import _build_tree
        d = _make_doc("d1", folder_id=None)
        tree = _build_tree([], [d])
        assert tree[0]["id"] == "d1"
        assert tree[0]["title"] == "doc"

    def test_document_orphan_folder_goes_to_root(self):
        """folder_id 指向不存在的文件夹，应该放到根级"""
        from app.services.folder_service import _build_tree
        d = _make_doc("d1", folder_id="nonexistent")
        tree = _build_tree([], [d])
        assert any(item.get("id") == "d1" for item in tree)

    def test_three_level_nesting(self):
        from app.services.folder_service import _build_tree
        root = _make_folder("r")
        mid = _make_folder("m", parent_id="r")
        leaf = _make_folder("l", parent_id="m")
        tree = _build_tree([root, mid, leaf], [])
        assert tree[0]["id"] == "r"
        assert tree[0]["children"][0]["id"] == "m"
        assert tree[0]["children"][0]["children"][0]["id"] == "l"


# ──────────────────────────────────────────────────────────────────────────────
# create_folder
# ──────────────────────────────────────────────────────────────────────────────

class TestCreateFolder:
    @pytest.mark.asyncio
    async def test_create_root_folder(self):
        from app.services.folder_service import create_folder
        db = _mock_db()

        created = _make_folder("new_id", name="新建文件夹")
        db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, "id", "new_id") or None)
        db.flush = AsyncMock()

        # 无父文件夹，不需要 _validate_depth
        folder = await create_folder(db, "u1", "新建文件夹", parent_id=None)
        db.add.assert_called_once()
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_child_folder_calls_validate(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()

        validate_mock = AsyncMock()
        monkeypatch.setattr(folder_service, "_validate_depth", validate_mock)

        parent = _make_folder("p1", user_id="u1")
        get_folder_mock = AsyncMock(return_value=parent)
        monkeypatch.setattr(folder_service, "_get_folder_or_404", get_folder_mock)

        await folder_service.create_folder(db, "u1", "Child", parent_id="p1")
        validate_mock.assert_called_once_with(db, "p1")

    @pytest.mark.asyncio
    async def test_name_is_stripped(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()

        monkeypatch.setattr(folder_service, "_validate_depth", AsyncMock())
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=_make_folder("p1")))

        captured = {}

        original_add = db.add

        def capture_add(obj):
            captured["folder"] = obj
            return original_add(obj)

        db.add = capture_add
        await folder_service.create_folder(db, "u1", "  trimmed  ", parent_id="p1")
        assert captured["folder"].name == "trimmed"


# ──────────────────────────────────────────────────────────────────────────────
# _validate_depth
# ──────────────────────────────────────────────────────────────────────────────

class TestValidateDepth:
    @pytest.mark.asyncio
    async def test_root_parent_passes(self):
        """父文件夹在根级（无自身父级），深度=1，应该通过"""
        from app.services.folder_service import _validate_depth
        db = _mock_db()
        # 第一次查：parent_id 行存在但 parent_id=None（即 parent_id 字段是 None）
        db.execute = AsyncMock(return_value=_first_result((None,)))
        await _validate_depth(db, "p1")  # 不应抛出

    @pytest.mark.asyncio
    async def test_depth_2_passes(self):
        from app.services.folder_service import _validate_depth
        db = _mock_db()
        # p1 -> p0 -> root(None)
        call_count = [0]

        async def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return _first_result(("p0",))  # p1 的父级是 p0
            return _first_result((None,))  # p0 的父级是 None

        db.execute = AsyncMock(side_effect=side_effect)
        await _validate_depth(db, "p1")  # depth=2, max=3，不应抛出

    @pytest.mark.asyncio
    async def test_depth_3_exceeds_raises(self):
        from app.services.folder_service import _validate_depth
        db = _mock_db()
        # 模拟三层: p1 -> p2 -> p3 -> None，从 p1 开始算深度
        parents = ["p2", "p3", None]
        idx = [0]

        async def side_effect(*args, **kwargs):
            val = parents[idx[0]]
            idx[0] += 1
            return _first_result((val,) if val is not None else (None,))

        db.execute = AsyncMock(side_effect=side_effect)
        with pytest.raises(HTTPException) as exc_info:
            await _validate_depth(db, "p1")
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["code"] == "MAX_DEPTH_EXCEEDED"

    @pytest.mark.asyncio
    async def test_nonexistent_parent_passes(self):
        """parent_id 指向不存在的文件夹，循环结束，不抛出"""
        from app.services.folder_service import _validate_depth
        db = _mock_db()
        db.execute = AsyncMock(return_value=_first_result(None))
        await _validate_depth(db, "ghost")  # 不应抛出


# ──────────────────────────────────────────────────────────────────────────────
# update_folder
# ──────────────────────────────────────────────────────────────────────────────

class TestUpdateFolder:
    @pytest.mark.asyncio
    async def test_rename_only(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        folder = _make_folder("f1", name="Old")
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=folder))

        await folder_service.update_folder(db, "f1", "u1", name="New", parent_id=None)
        assert folder.name == "New"
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_self_move_raises(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        folder = _make_folder("f1")
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=folder))

        with pytest.raises(HTTPException) as exc:
            await folder_service.update_folder(db, "f1", "u1", name=None, parent_id="f1")
        assert exc.value.detail["code"] == "INVALID_MOVE"

    @pytest.mark.asyncio
    async def test_move_calls_validate(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        folder = _make_folder("f1")
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=folder))
        validate_mock = AsyncMock()
        monkeypatch.setattr(folder_service, "_validate_depth", validate_mock)

        await folder_service.update_folder(db, "f1", "u1", name=None, parent_id="p2")
        validate_mock.assert_called_once_with(db, "p2")
        assert folder.parent_id == "p2"


# ──────────────────────────────────────────────────────────────────────────────
# delete_folder
# ──────────────────────────────────────────────────────────────────────────────

class TestDeleteFolder:
    @pytest.mark.asyncio
    async def test_delete_soft_deletes_docs(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        folder = _make_folder("f1")
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=folder))
        monkeypatch.setattr(folder_service, "_collect_all_folder_ids", AsyncMock(return_value=["f1"]))

        db.get = AsyncMock(return_value=folder)
        db.execute = AsyncMock()

        await folder_service.delete_folder(db, "f1", "u1")

        # execute 被调用一次（软删除 documents）
        db.execute.assert_called_once()
        # 文件夹被物理删除
        db.delete.assert_called_once_with(folder)
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_folder_not_found(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        monkeypatch.setattr(
            folder_service, "_get_folder_or_404",
            AsyncMock(side_effect=HTTPException(status_code=404, detail={"code": "NOT_FOUND"}))
        )
        with pytest.raises(HTTPException) as exc:
            await folder_service.delete_folder(db, "ghost", "u1")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_cascade_collects_children(self, monkeypatch):
        from app.services import folder_service
        db = _mock_db()
        folder = _make_folder("root")
        monkeypatch.setattr(folder_service, "_get_folder_or_404", AsyncMock(return_value=folder))

        collected = []

        async def fake_collect(db, root_id):
            collected.append(root_id)
            return [root_id, "child1", "child2"]

        monkeypatch.setattr(folder_service, "_collect_all_folder_ids", fake_collect)
        db.get = AsyncMock(return_value=folder)
        db.execute = AsyncMock()

        await folder_service.delete_folder(db, "root", "u1")
        assert "root" in collected


# ──────────────────────────────────────────────────────────────────────────────
# _collect_all_folder_ids
# ──────────────────────────────────────────────────────────────────────────────

class TestCollectAllFolderIds:
    @pytest.mark.asyncio
    async def test_leaf_folder_returns_only_itself(self):
        from app.services.folder_service import _collect_all_folder_ids
        db = _mock_db()
        db.execute = AsyncMock(return_value=_all_result([]))  # no children

        ids = await _collect_all_folder_ids(db, "f1")
        assert ids == ["f1"]

    @pytest.mark.asyncio
    async def test_collects_all_descendants(self):
        from app.services.folder_service import _collect_all_folder_ids
        db = _mock_db()
        call_count = [0]

        async def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return _all_result([("c1",), ("c2",)])  # root's children
            return _all_result([])  # c1 and c2 have no children

        db.execute = AsyncMock(side_effect=side_effect)
        ids = await _collect_all_folder_ids(db, "root")
        assert "root" in ids
        assert "c1" in ids
        assert "c2" in ids

"""测试 fixtures 和配置"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any

# 测试数据 fixtures


@pytest.fixture
def sample_markdown() -> str:
    """示例 Markdown 内容"""
    return """# 测试文档标题

## 一级标题

这是正文内容，包含一些描述性文字。

### 二级标题

- 列表项 1
- 列表项 2

## 二级标题 2

更多正文内容。
"""


@pytest.fixture
def sample_template_binding() -> dict[str, Any]:
    """示例模板绑定"""
    return {
        "templateId": "gov_doc_gbt9704",
        "appliedAt": "2026-05-02T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "document_title": {
                    "label": "公文标题",
                    "role": "document_title",
                    "fontFamily": "SimHei",
                    "fontSizePt": 22,
                    "bold": True,
                    "align": "center",
                },
                "body": {
                    "label": "正文",
                    "role": "body",
                    "fontFamily": "FangSong_GB2312",
                    "fontSizePt": 16,
                    "bold": False,
                    "align": "justify",
                    "lineHeight": 1.75,
                    "firstLineIndentChars": 2,
                },
                "heading_1": {
                    "label": "一级标题",
                    "role": "heading_1",
                    "fontFamily": "SimHei",
                    "fontSizePt": 16,
                    "bold": True,
                },
                "heading_2": {
                    "label": "二级标题",
                    "role": "heading_2",
                    "fontFamily": "KaiTi_GB2312",
                    "fontSizePt": 16,
                    "bold": True,
                },
                "date": {
                    "label": "日期",
                    "role": "date",
                    "fontFamily": "FangSong_GB2312",
                    "fontSizePt": 14,
                    "align": "right",
                },
            },
            "layout": {
                "paperSize": "A4",
                "marginTopMm": 37,
                "marginBottomMm": 35,
                "marginLeftMm": 28,
                "marginRightMm": 26,
                "defaultLineHeight": 1.75,
                "defaultParagraphSpacingBeforePt": 0,
                "defaultParagraphSpacingAfterPt": 0,
                "defaultFirstLineIndentChars": 2,
            },
        },
    }


@pytest.fixture
def sample_styles() -> dict[str, Any]:
    """示例样式配置"""
    return {
        "document_title": {
            "fontFamily": "SimHei",
            "fontSizePt": 22,
            "bold": True,
            "align": "center",
        },
        "body": {
            "fontFamily": "FangSong_GB2312",
            "fontSizePt": 16,
            "bold": False,
            "align": "justify",
            "lineHeight": 1.75,
            "firstLineIndentChars": 2,
        },
        "heading_1": {
            "fontFamily": "SimHei",
            "fontSizePt": 16,
            "bold": True,
        },
        "heading_2": {
            "fontFamily": "KaiTi_GB2312",
            "fontSizePt": 16,
            "bold": True,
        },
    }


@pytest.fixture
def sample_layout() -> dict[str, Any]:
    """示例布局配置"""
    return {
        "paperSize": "A4",
        "marginTopMm": 37,
        "marginBottomMm": 35,
        "marginLeftMm": 28,
        "marginRightMm": 26,
        "defaultLineHeight": 1.75,
        "defaultParagraphSpacingBeforePt": 0,
        "defaultParagraphSpacingAfterPt": 0,
        "defaultFirstLineIndentChars": 2,
    }


@pytest.fixture
def sample_template_config(sample_styles, sample_layout) -> dict[str, Any]:
    """示例完整模板配置"""
    return {
        "styles": sample_styles,
        "layout": sample_layout,
    }


@pytest.fixture
def mock_pandoc_available(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 可用"""
    async def mock_check(*args, **kwargs) -> bool:
        return True

    monkeypatch.setattr(
        "app.services.export_service.ExportService._check_tool",
        mock_check,
    )


@pytest.fixture
def mock_pandoc_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 不可用"""
    async def mock_check(*args, **kwargs) -> bool:
        return False

    monkeypatch.setattr(
        "app.services.export_service.ExportService._check_tool",
        mock_check,
    )


@pytest.fixture
def mock_pandoc_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 执行成功"""
    async def mock_run(*args, **kwargs):
        return AsyncMock(
            returncode=0,
            stdout=b"<!DOCTYPE html><html><body><p>Test content</p></body></html>",
            stderr=b"",
        )

    mock_result = AsyncMock()
    mock_result.returncode = 0
    mock_result.stdout = b"<!DOCTYPE html><html><body><p>Test content</p></body></html>"
    mock_result.stderr = b""

    async def mock_run_cmd(*args, **kwargs):
        return mock_result

    monkeypatch.setattr(
        "app.services.export_service.asyncio.create_subprocess_exec",
        mock_run_cmd,
    )


@pytest.fixture
def mock_pandoc_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 执行失败"""
    mock_result = AsyncMock()
    mock_result.returncode = 1
    mock_result.stdout = b""
    mock_result.stderr = b"Error: pandoc failed"

    async def mock_run_cmd(*args, **kwargs):
        return mock_result

    monkeypatch.setattr(
        "app.services.export_service.asyncio.create_subprocess_exec",
        mock_run_cmd,
    )

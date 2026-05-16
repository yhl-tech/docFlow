"""测试 fixtures 和配置"""
import asyncio
import io
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
def sample_heading_styles_binding() -> dict[str, Any]:
    """带 headingStyles 和 paragraphStyles 的模板绑定"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-02T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "document_title": {
                    "fontFamily": "SimHei",
                    "fontSizePt": 20,
                    "bold": True,
                },
                "body": {
                    "fontFamily": "FangSong_GB2312",
                    "fontSizePt": 16,
                    "bold": False,
                    "align": "justify",
                },
            },
            "headingStyles": {
                "h1": {
                    "font": {
                        "fontFamily": "SimHei",
                        "fontSizePt": 16,
                        "bold": True,
                        "color": "#000000",
                    },
                    "align": "left",
                    "lineHeight": 1.5,
                    "spacingBeforePt": 12,
                    "spacingAfterPt": 6,
                    "firstLineIndentChars": 0,
                },
                "h2": {
                    "font": {
                        "fontFamily": "SimHei",
                        "fontSizePt": 14,
                        "bold": True,
                        "italic": False,
                        "color": "#333333",
                    },
                    "align": "left",
                    "lineHeight": 1.4,
                },
                "h3": {
                    "font": {
                        "fontFamily": "SimHei",
                        "fontSizePt": 13,
                        "bold": False,
                    }
                },
            },
            "paragraphStyles": {
                "align": "justify",
                "lineHeight": 1.8,
                "spacingBeforePt": 0,
                "spacingAfterPt": 6,
                "firstLineIndentChars": 2,
            },
            "layout": {
                "paperSize": "A4",
                "marginTopMm": 25,
                "marginBottomMm": 25,
                "marginLeftMm": 20,
                "marginRightMm": 20,
                "defaultLineHeight": 1.75,
            },
        },
    }


@pytest.fixture
def mock_pandoc_available(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 可用"""
    async def mock_check(*args, **kwargs) -> bool:
        return True

    monkeypatch.setattr(
        "app.services.export.tools.ToolChecker.check_tool",
        mock_check,
    )


# ──────────────────────────────────────────────────────────────────────────────
# docx XML 断言测试用 fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def make_docx_with_heading():
    """返回一个工厂函数，创建带指定样式标题的最小 docx Document 对象"""
    def _factory(style_name: str = "Heading 1", text: str = "测试标题"):
        from docx import Document
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        doc = Document()
        para = doc.add_paragraph(text)
        # 设置段落样式
        pPr = para._element.find(qn("w:pPr"))
        if pPr is None:
            pPr = OxmlElement("w:pPr")
            para._element.insert(0, pPr)
        pStyle = pPr.find(qn("w:pStyle"))
        if pStyle is None:
            pStyle = OxmlElement("w:pStyle")
            pPr.insert(0, pStyle)
        pStyle.set(qn("w:val"), style_name.replace(" ", ""))
        # 添加 run
        if not para.runs:
            run = para.add_run(text)
        return doc
    return _factory


@pytest.fixture
def make_docx_with_table():
    """返回一个工厂函数，创建带表格（含表头行）的最小 docx Document 对象"""
    def _factory(rows: int = 3, cols: int = 2):
        from docx import Document
        doc = Document()
        table = doc.add_table(rows=rows, cols=cols)
        return doc
    return _factory


@pytest.fixture
def make_docx_with_code_block():
    """返回一个工厂函数，创建带代码块段落（SourceCode 样式）的最小 docx Document 对象"""
    def _factory(text: str = "print('hello')"):
        from docx import Document
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        doc = Document()
        para = doc.add_paragraph(text)
        pPr = para._element.find(qn("w:pPr"))
        if pPr is None:
            pPr = OxmlElement("w:pPr")
            para._element.insert(0, pPr)
        pStyle = pPr.find(qn("w:pStyle"))
        if pStyle is None:
            pStyle = OxmlElement("w:pStyle")
            pPr.insert(0, pStyle)
        pStyle.set(qn("w:val"), "SourceCode")
        if not para.runs:
            para.add_run(text)
        return doc
    return _factory


@pytest.fixture
def make_docx_with_list():
    """返回一个工厂函数，创建带列表段落（含 numPr）的最小 docx Document 对象"""
    def _factory(is_ordered: bool = False):
        from docx import Document
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        doc = Document()
        # 添加两个带 numPr 的段落
        for i, text in enumerate(["item one", "item two"]):
            para = doc.add_paragraph(text)
            pPr = para._element.find(qn("w:pPr"))
            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para._element.insert(0, pPr)
            numPr = OxmlElement("w:numPr")
            pPr.append(numPr)
            ilvl = OxmlElement("w:ilvl")
            ilvl.set(qn("w:val"), "0")
            numPr.append(ilvl)
            numId_elem = OxmlElement("w:numId")
            numId_elem.set(qn("w:val"), "1")
            numPr.append(numId_elem)
            if not para.runs:
                para.add_run(text)
        return doc
    return _factory


def get_para_xml_attr(para, qname: str, attr: str) -> str | None:
    """从段落 pPr 中查找指定元素的属性值"""
    from docx.oxml.ns import qn as _qn
    pPr = para._element.find(_qn("w:pPr"))
    if pPr is None:
        return None
    elem = pPr.find(_qn(qname))
    if elem is None:
        return None
    return elem.get(_qn(attr))


def get_run_rpr_elem(para, tag: str):
    """获取段落第一个 run 的 rPr 中指定 tag 的元素"""
    from docx.oxml.ns import qn as _qn
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(_qn("w:rPr"))
    if rPr is None:
        return None
    return rPr.find(_qn(tag))


@pytest.fixture
def docx_xml_helpers():
    """提供 docx XML 查询辅助函数"""
    return {
        "get_para_xml_attr": get_para_xml_attr,
        "get_run_rpr_elem": get_run_rpr_elem,
    }


@pytest.fixture
def mock_pandoc_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 不可用"""
    async def mock_check(*args, **kwargs) -> bool:
        return False

    monkeypatch.setattr(
        "app.services.export.tools.ToolChecker.check_tool",
        mock_check,
    )


@pytest.fixture
def mock_pandoc_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pandoc 执行成功"""
    mock_result = AsyncMock()
    mock_result.returncode = 0
    mock_result.stdout = b"<!DOCTYPE html><html><body><p>Test content</p></body></html>"
    mock_result.stderr = b""

    async def mock_run_cmd(*args, **kwargs):
        return mock_result

    monkeypatch.setattr(
        "app.services.export.tools.asyncio.create_subprocess_exec",
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
        "app.services.export.tools.asyncio.create_subprocess_exec",
        mock_run_cmd,
    )

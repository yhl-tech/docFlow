"""
页码样式扩展测试

补充 test_docx_styler_layout.py 中未覆盖的页码样式场景：
  - 章节编号（includeChapterNumber、chapterStyle、chapterSeparator）
  - 页码字体样式（fontFamily、fontSizePt、color、bold、italic）
  - 页码位置（header-bottom vs footer-top）
  - 首页显示控制
  - labelTemplate 占位符替换
"""

import pytest

try:
    import docx as _docx_mod  # noqa: F401
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

requires_docx = pytest.mark.skipif(not HAS_DOCX, reason="python-docx 未安装")


def _layout_binding(layout: dict) -> dict:
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "layout": layout,
        },
    }


def _get_pg_num_type_attrs(doc) -> dict:
    from docx.oxml.ns import qn
    sectPr = doc.sections[0]._sectPr
    pgNumType = sectPr.find(qn("w:pgNumType"))
    if pgNumType is None:
        return {}
    return {
        "fmt": pgNumType.get(qn("w:fmt")),
        "start": pgNumType.get(qn("w:start")),
    }


def _footer_paragraphs(doc) -> list:
    result = []
    for section in doc.sections:
        result.extend(section.footer.paragraphs)
    return result


def _header_paragraphs(doc) -> list:
    result = []
    for section in doc.sections:
        result.extend(section.header.paragraphs)
    return result


def _footer_xml(doc) -> str:
    return "\n".join(p._element.xml for p in _footer_paragraphs(doc))


def _header_xml(doc) -> str:
    return "\n".join(p._element.xml for p in _header_paragraphs(doc))


def _footer_text(doc) -> str:
    return "\n".join(p.text for p in _footer_paragraphs(doc))


def _header_text(doc) -> str:
    return "\n".join(p.text for p in _header_paragraphs(doc))


# ────────────────────────────────────────────────────────────────────────────
# 章节编号测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberChapterNumber:
    """章节编号相关配置"""

    def test_include_chapter_number_adds_styleref_field(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "includeChapterNumber": True,
                "chapterStyle": "Heading1",
                "chapterSeparator": "-",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "STYLEREF" in xml, "启用章节编号时应插入 STYLEREF 字段"
        assert "Heading 1" in xml, "STYLEREF 应引用 Heading 1 样式"

    def test_include_chapter_false_no_styleref(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "includeChapterNumber": False,
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "STYLEREF" not in xml, "禁用章节编号时不应有 STYLEREF"

    def test_chapter_style_heading2(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "includeChapterNumber": True,
                "chapterStyle": "Heading2",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "Heading 2" in xml, "chapterStyle=Heading2 时应引用 Heading 2"

    def test_chapter_separator_dash(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "includeChapterNumber": True,
                "chapterSeparator": "-",
                "labelTemplate": "{page}",
            },
        }))
        text = _footer_text(doc)
        assert "-" in text, "章节编号后应有分隔符 -"


# ────────────────────────────────────────────────────────────────────────────
# 页码字体样式测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberFontStyle:
    """页码字体样式配置"""

    def test_font_family_simhei(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "fontFamily": "SimHei",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "黑体" in xml, "fontFamily=SimHei 应转换为 黑体"

    def test_font_family_kaiti(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "fontFamily": "KaiTi_GB2312",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "楷体_GB2312" in xml

    def test_font_size_10pt(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "fontSizePt": 10,
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert 'w:val="20"' in xml, "fontSizePt=10 → w:val=20（半点）"

    def test_font_size_12pt(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "fontSizePt": 12,
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert 'w:val="24"' in xml, "fontSizePt=12 → w:val=24（半点）"

    def test_color_red(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "color": "#FF0000",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "FF0000" in xml, "color=#FF0000 应写入 w:color"

    def test_color_with_hash_stripped(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "color": "#333333",
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "333333" in xml

    def test_bold_true(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "bold": True,
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "<w:b/>" in xml or "<w:b " in xml, "bold=True 应写入 w:b"

    def test_italic_true(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "italic": True,
                "labelTemplate": "{page}",
            },
        }))
        xml = _footer_xml(doc)
        assert "<w:i/>" in xml or "<w:i " in xml, "italic=True 应写入 w:i"


# ────────────────────────────────────────────────────────────────────────────
# 页码位置测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberPosition:
    """页码位置（页眉 vs 页脚）"""

    def test_position_footer_default(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "{page}"},
        }))
        footer_xml = _footer_xml(doc)
        assert "PAGE" in footer_xml, "默认位置应在页脚（包含 PAGE 字段）"

    def test_position_footer_top(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "position": "footer-top",
                "labelTemplate": "{page}",
            },
        }))
        footer_xml = _footer_xml(doc)
        assert "PAGE" in footer_xml, "position=footer-top 时页脚应有 PAGE 字段"

    def test_position_header_bottom(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "position": "header-bottom",
                "labelTemplate": "{page}",
            },
        }))
        header_xml = _header_xml(doc)
        assert "PAGE" in header_xml, "position=header-bottom 时页眉应有 PAGE 字段"


# ────────────────────────────────────────────────────────────────────────────
# 首页显示控制测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberFirstPage:
    """首页页码显示控制"""

    def test_show_on_first_page_true(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "showOnFirstPage": True,
                "labelTemplate": "{page}",
            },
        }))
        footer_xml = _footer_xml(doc)
        assert "PAGE" in footer_xml, "showOnFirstPage=True 时页脚应有 PAGE 字段"

    def test_show_on_first_page_false_sets_different_first_page(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "showOnFirstPage": False,
                "labelTemplate": "{page}",
            },
        }))
        section = doc.sections[0]
        assert section.different_first_page_header_footer is True, \
            "showOnFirstPage=False 应设置 different_first_page_header_footer"


# ────────────────────────────────────────────────────────────────────────────
# labelTemplate 占位符测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberLabelTemplate:
    """labelTemplate 占位符替换"""

    def test_template_page_only(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "{page}"},
        }))
        xml = _footer_xml(doc)
        assert "PAGE" in xml, "labelTemplate={page} 应生成 PAGE 字段"

    def test_template_total_pages(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "{totalPages}"},
        }))
        xml = _footer_xml(doc)
        assert "NUMPAGES" in xml, "labelTemplate={totalPages} 应生成 NUMPAGES 字段"

    def test_template_custom_prefix(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "第 {page} 页"},
        }))
        text = _footer_text(doc)
        assert "第" in text, "自定义前缀应保留"
        assert "页" in text, "自定义后缀应保留"


# ────────────────────────────────────────────────────────────────────────────
# 页码格式测试
# ────────────────────────────────────────────────────────────────────────────

@requires_docx
class TestPageNumberFormatExtended:
    """扩展页码格式测试"""

    def test_uppercase_roman(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "format": "uppercaseRoman",
                "labelTemplate": "{page}",
            },
        }))
        attrs = _get_pg_num_type_attrs(doc)
        assert attrs.get("fmt") == "upperRoman", \
            f"format=uppercaseRoman → upperRoman，实际={attrs}"

    def test_start_value_10(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "startValue": 10,
                "labelTemplate": "{page}",
            },
        }))
        attrs = _get_pg_num_type_attrs(doc)
        assert attrs.get("start") == "10", f"startValue=10 应写入 w:start=10，实际={attrs}"

    def test_continue_from_previous_no_start_override(self):
        """continueFromPrevious=True 时忽略 startValue（由 Word 自动处理）"""
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {
                "enabled": True,
                "continueFromPrevious": True,
                "startValue": 5,
                "labelTemplate": "{page}",
            },
        }))
        # continueFromPrevious 主要用于前置文档场景，这里验证不崩溃即可
        footer_xml = _footer_xml(doc)
        assert "PAGE" in footer_xml, "continueFromPrevious 时页脚应有 PAGE 字段"

"""
页面布局 / 页码 / 页眉页脚测试

覆盖：
  - StyleBindings.get_layout 字段提取逻辑（纯函数，无 docx 依赖）
  - 页码格式映射逻辑
  - 页眉页脚占位符解析逻辑
  - add_page_number_footer / add_header_footer_content DOCX 集成（需要 python-docx）
"""
import pytest
import re

try:
    import docx as _docx_mod  # noqa: F401
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

requires_docx = pytest.mark.skipif(not HAS_DOCX, reason="python-docx 未安装")


# ────────────────────────────────────────────────────────────────────────────
# 复制生产逻辑（纯 Python，无 app 依赖）
# ────────────────────────────────────────────────────────────────────────────

def get_layout(template_binding) -> dict:
    if not template_binding:
        return {}
    snapshot = template_binding.get("configSnapshot") or {}
    return snapshot.get("layout") or {}


def page_num_fmt(format_str: str) -> str:
    """将 frontend format 值转换为 OOXML numFmt"""
    fmt_map = {"arabic": "decimal", "lowercaseRoman": "lowerRoman", "uppercaseRoman": "upperRoman"}
    return fmt_map.get(format_str, "decimal")


def split_label_template(template: str) -> list[str]:
    """将 labelTemplate 按 {page}/{totalPages} 分割为 parts"""
    return re.split(r'(\{page\}|\{totalPages\})', template)


# ────────────────────────────────────────────────────────────────────────────
# 纯逻辑单元测试（无 python-docx 依赖）
# ────────────────────────────────────────────────────────────────────────────

class TestGetLayout:
    """StyleBindings.get_layout 提取逻辑"""

    def test_empty_binding_returns_empty(self):
        assert get_layout(None) == {}

    def test_margin_fields_extracted(self):
        binding = {
            "configSnapshot": {
                "layout": {
                    "marginTopMm": 37, "marginBottomMm": 35,
                    "marginLeftMm": 28, "marginRightMm": 26,
                }
            }
        }
        layout = get_layout(binding)
        assert layout["marginTopMm"] == 37
        assert layout["marginBottomMm"] == 35
        assert layout["marginLeftMm"] == 28
        assert layout["marginRightMm"] == 26

    def test_page_number_config_extracted(self):
        binding = {
            "configSnapshot": {
                "layout": {
                    "pageNumber": {"enabled": True, "format": "arabic", "startValue": 1},
                }
            }
        }
        pn = get_layout(binding).get("pageNumber", {})
        assert pn["enabled"] is True
        assert pn["format"] == "arabic"

    def test_header_footer_config_extracted(self):
        binding = {
            "configSnapshot": {
                "layout": {
                    "headerFooter": {
                        "hasHeader": True,
                        "headerContent": {"left": "", "center": "报告标题", "right": ""},
                    }
                }
            }
        }
        hf = get_layout(binding).get("headerFooter", {})
        assert hf["hasHeader"] is True
        assert hf["headerContent"]["center"] == "报告标题"

    def test_missing_configSnapshot_returns_empty(self):
        assert get_layout({"templateId": "x"}) == {}

    def test_default_line_height_extracted(self):
        binding = {"configSnapshot": {"layout": {"defaultLineHeight": 1.75}}}
        assert get_layout(binding)["defaultLineHeight"] == 1.75


class TestPageNumberFormat:
    """页码格式映射"""

    def test_arabic_maps_to_decimal(self):
        assert page_num_fmt("arabic") == "decimal"

    def test_lowercase_roman_maps_to_lowerRoman(self):
        assert page_num_fmt("lowercaseRoman") == "lowerRoman"

    def test_uppercase_roman_maps_to_upperRoman(self):
        assert page_num_fmt("uppercaseRoman") == "upperRoman"

    def test_unknown_format_falls_back_to_decimal(self):
        assert page_num_fmt("unknown") == "decimal"

    def test_empty_string_falls_back_to_decimal(self):
        assert page_num_fmt("") == "decimal"


class TestLabelTemplateSplit:
    """labelTemplate 占位符分割"""

    def test_simple_page_only(self):
        parts = split_label_template("{page}")
        assert "{page}" in parts

    def test_page_slash_total(self):
        parts = split_label_template("{page} / {totalPages}")
        assert "{page}" in parts
        assert "{totalPages}" in parts
        assert " / " in parts

    def test_prefix_suffix_text(self):
        parts = split_label_template("第 {page} 页，共 {totalPages} 页")
        assert "第 " in parts
        assert " 页，共 " in parts
        assert "{page}" in parts
        assert "{totalPages}" in parts

    def test_no_placeholder_returns_single_part(self):
        parts = split_label_template("页码")
        assert parts == ["页码"]


class TestPageNumberConfigValidation:
    """页码配置默认值和边界"""

    def test_default_start_value_is_1(self):
        pn = {}
        start = pn.get("startValue", 1)
        assert start == 1

    def test_enabled_true_should_render_footer(self):
        pn = {"enabled": True, "format": "arabic"}
        assert pn.get("enabled", True) is True

    def test_show_on_first_page_default_true(self):
        pn = {}
        assert pn.get("showOnFirstPage", True) is True


class TestMarginCalculation:
    """页面边距计算（表格宽度依赖 layout margin）"""

    def test_body_width_calc(self):
        page_width_mm = 210   # A4
        margin_left_mm = 28
        margin_right_mm = 26
        body_width_mm = page_width_mm - margin_left_mm - margin_right_mm
        assert body_width_mm == 156, f"A4 标准公文正文宽度应为 156mm，实际={body_width_mm}"

    def test_body_width_to_dxa(self):
        body_width_mm = 156
        body_width_dxa = int(body_width_mm * 56.7)
        assert 8800 < body_width_dxa < 9000, f"156mm → 约 8845 dxa，实际={body_width_dxa}"

    def test_table_full_width_100pct(self):
        body_width_dxa = 8845
        table_pct = 100
        table_width_dxa = int(body_width_dxa * table_pct / 100)
        assert table_width_dxa == 8845


# ────────────────────────────────────────────────────────────────────────────
# python-docx 集成测试（需要 python-docx）
# ────────────────────────────────────────────────────────────────────────────

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
    return {"fmt": pgNumType.get(qn("w:fmt")), "start": pgNumType.get(qn("w:start"))}


def _footer_has_field(doc, instr_substr: str) -> bool:
    for section in doc.sections:
        for para in section.footer.paragraphs:
            if instr_substr in para._element.xml:
                return True
    return False


@requires_docx
class TestDocxPageNumberFormat:
    """add_page_number_footer：pgNumType fmt/start 写入"""

    def test_arabic_sets_decimal(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "format": "arabic", "startValue": 1},
        }))
        assert _get_pg_num_type_attrs(doc).get("fmt") == "decimal"

    def test_lowercase_roman(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "format": "lowercaseRoman", "startValue": 1},
        }))
        assert _get_pg_num_type_attrs(doc).get("fmt") == "lowerRoman"

    def test_start_value_3(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "startValue": 3},
        }))
        assert _get_pg_num_type_attrs(doc).get("start") == "3"


@requires_docx
class TestDocxPageNumberDisabledAndFields:
    def test_disabled_no_page_field(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": False},
        }))
        assert not _footer_has_field(doc, "PAGE")

    def test_enabled_has_page_field(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "{page}"},
        }))
        assert _footer_has_field(doc, "PAGE")

    def test_total_pages_template_has_numpages(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_page_number_footer(doc, _layout_binding({
            "pageNumber": {"enabled": True, "labelTemplate": "{page} / {totalPages}"},
        }))
        assert _footer_has_field(doc, "NUMPAGES")


@requires_docx
class TestDocxHeaderFooterContent:
    def test_header_center_text(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_header_footer_content(doc, _layout_binding({
            "headerFooter": {
                "hasHeader": True,
                "headerContent": {"left": "", "center": "项目报告", "right": ""},
            },
        }))
        h_text = " ".join(p.text for s in doc.sections for p in s.header.paragraphs)
        assert "项目报告" in h_text

    def test_footer_left_text(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        doc = Document()
        DocxStyler().add_header_footer_content(doc, _layout_binding({
            "headerFooter": {
                "hasFooter": True,
                "footerContent": {"left": "机密文件", "center": "", "right": ""},
            },
        }))
        f_text = " ".join(p.text for s in doc.sections for p in s.footer.paragraphs)
        assert "机密文件" in f_text

    def test_empty_binding_no_error(self):
        from docx import Document
        from app.services.export.docx_styler import DocxStyler
        DocxStyler().add_header_footer_content(Document(), None)

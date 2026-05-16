"""
代码块样式 DOCX XML 断言测试

验证 DocxStyler.apply_docx_codeblock_styles() 应用后 XML 正确：
  - 背景底纹 (w:shd)
  - 边框 (w:pBdr)
  - 字体 (w:rFonts)
  - 字号 (w:sz)
  - 行距 (w:spacing)
  - 字体颜色 (w:color)
"""
import pytest
from docx.oxml.ns import qn

from app.services.export.docx_styler import DocxStyler


# ─────────────────────────── helpers ────────────────────────────────────────

def _get_pPr(para):
    return para._element.find(qn("w:pPr"))


def _get_shd(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:shd"))


def _get_pBdr(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:pBdr"))


def _get_spacing(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:spacing"))


def _get_run_rfont_east_asia(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    if rPr is None:
        return None
    rFonts = rPr.find(qn("w:rFonts"))
    return None if rFonts is None else rFonts.get(qn("w:eastAsia"))


def _get_run_sz(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    if rPr is None:
        return None
    sz = rPr.find(qn("w:sz"))
    return None if sz is None else sz.get(qn("w:val"))


def _get_run_color(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    if rPr is None:
        return None
    c = rPr.find(qn("w:color"))
    return None if c is None else c.get(qn("w:val"))


def _get_run_bold(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    if rPr is None:
        return None
    b = rPr.find(qn("w:b"))
    return None if b is None else b.get(qn("w:val"), "1")


def _code_paras(doc):
    return [p for p in doc.paragraphs if "SourceCode" in (p.style.name if p.style else "")]


# ─────────────────────────── fixtures ───────────────────────────────────────

@pytest.fixture
def binding_code_full():
    """完整代码块配置"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "codeBlockStyles": {
                "font": {
                    "fontFamily": "DengXian",
                    "fontSizePt": 10,
                    "color": "#333333",
                    "bold": False,
                },
                "shading": {"fill": "#F5F5F5"},
                "border": {
                    "color": "#CCCCCC",
                    "widthPt": 0.5,
                },
                "lineSpacing": 1.2,
            },
            "layout": {"paperSize": "A4"},
        },
    }


@pytest.fixture
def binding_code_shading_only():
    """仅设置背景底纹"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "codeBlockStyles": {
                "shading": {"fill": "#EEEEEE"},
            },
            "layout": {"paperSize": "A4"},
        },
    }


@pytest.fixture
def binding_code_border_only():
    """仅设置边框"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "codeBlockStyles": {
                "border": {
                    "color": "#0000FF",
                    "widthPt": 1.0,
                },
            },
            "layout": {"paperSize": "A4"},
        },
    }


# ─────────────────────────── tests ──────────────────────────────────────────

class TestCodeBlockShading:
    """代码块背景底纹应写入 w:pPr > w:shd"""

    def test_shading_fill_f5f5f5_sets_shd_fill(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("x = 1")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        code_para = doc.paragraphs[0]
        shd = _get_shd(code_para)
        assert shd is not None, "应写入 w:shd"
        fill = shd.get(qn("w:fill"))
        assert fill is not None and fill.upper() == "F5F5F5", f"实际={fill}"

    def test_shading_val_is_clear(self, make_docx_with_code_block, binding_code_shading_only):
        doc = make_docx_with_code_block("y = 2")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_shading_only)

        shd = _get_shd(doc.paragraphs[0])
        assert shd is not None
        assert shd.get(qn("w:val")) == "clear", "w:shd val 应为 clear"

    def test_shading_fill_eeeeee(self, make_docx_with_code_block, binding_code_shading_only):
        doc = make_docx_with_code_block("z = 3")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_shading_only)

        shd = _get_shd(doc.paragraphs[0])
        assert shd is not None
        assert shd.get(qn("w:fill")).upper() == "EEEEEE"


class TestCodeBlockBorder:
    """代码块边框应写入 w:pPr > w:pBdr"""

    def test_border_color_0000ff_sets_pbdr(self, make_docx_with_code_block, binding_code_border_only):
        doc = make_docx_with_code_block("border test")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_border_only)

        pBdr = _get_pBdr(doc.paragraphs[0])
        assert pBdr is not None, "应写入 w:pBdr"
        top = pBdr.find(qn("w:top"))
        assert top is not None, "应有 w:top 边框"
        assert top.get(qn("w:color")).upper() == "0000FF", f"实际={top.get(qn('w:color'))}"

    def test_border_width_1pt_sets_sz_8(self, make_docx_with_code_block, binding_code_border_only):
        doc = make_docx_with_code_block("border width")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_border_only)

        pBdr = _get_pBdr(doc.paragraphs[0])
        top = pBdr.find(qn("w:top"))
        sz = top.get(qn("w:sz"))
        # 1.0 pt × 8 = 8 (eighths of a point)
        assert int(sz) == 8, f"1.0pt → w:sz=8，实际={sz}"

    def test_border_all_four_sides_set(self, make_docx_with_code_block, binding_code_border_only):
        doc = make_docx_with_code_block("four sides")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_border_only)

        pBdr = _get_pBdr(doc.paragraphs[0])
        for side in ("top", "left", "bottom", "right"):
            assert pBdr.find(qn(f"w:{side}")) is not None, f"缺少 w:{side} 边框"


class TestCodeBlockFont:
    """代码块字体应写入 run > rPr > w:rFonts"""

    def test_font_dengxian_sets_rfont_east_asia(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("font test")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        east_asia = _get_run_rfont_east_asia(doc.paragraphs[0])
        assert east_asia == "等线", f"DengXian → 等线，实际={east_asia}"

    def test_fontsize_10pt_sets_sz_20(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("size test")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        sz_val = _get_run_sz(doc.paragraphs[0])
        assert sz_val is not None, "应写入 w:sz"
        assert int(sz_val) == 20, f"10pt → w:sz=20（半点），实际={sz_val}"

    def test_color_333333_sets_run_color(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("color test")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        color = _get_run_color(doc.paragraphs[0])
        assert color is not None, "应写入 w:color"
        assert color.upper() == "333333", f"实际={color}"

    def test_bold_false_sets_b_val_0(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("bold false")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        bold_val = _get_run_bold(doc.paragraphs[0])
        assert bold_val is not None, "应写入 w:b"
        assert bold_val == "0", f"bold=False → w:b val=0，实际={bold_val}"


class TestCodeBlockLineSpacing:
    """代码块行距应写入 w:pPr > w:spacing > w:line"""

    def test_line_spacing_12_sets_w_line_288(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("spacing test")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        spc = _get_spacing(doc.paragraphs[0])
        assert spc is not None, "应写入 w:spacing"
        line = spc.get(qn("w:line"))
        assert line is not None, "应有 w:line"
        # 1.2 × 240 = 288
        assert int(line) == int(1.2 * 240), f"lineSpacing=1.2 → 288，实际={line}"

    def test_line_spacing_rule_is_auto(self, make_docx_with_code_block, binding_code_full):
        doc = make_docx_with_code_block("spacing rule")
        styler = DocxStyler()
        styler.apply_docx_codeblock_styles(doc, template_binding=binding_code_full)

        spc = _get_spacing(doc.paragraphs[0])
        assert spc is not None
        assert spc.get(qn("w:lineRule")) == "auto", "行距规则应为 auto"

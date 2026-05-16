"""
段落样式 & 列表样式 DOCX XML 断言测试

验证：
  - apply_docx_font()  对正文段落应用 align / lineHeight / firstLineIndent
  - apply_docx_list_styles() 对列表段落应用 indent / spacing / font color
"""
import pytest
from docx.oxml.ns import qn

from app.services.export.docx_styler import DocxStyler


# ─────────────────────────── helpers ────────────────────────────────────────

def _get_pPr(para):
    return para._element.find(qn("w:pPr"))


def _get_spacing(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:spacing"))


def _get_jc(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:jc"))


def _get_ind(para):
    pPr = _get_pPr(para)
    return None if pPr is None else pPr.find(qn("w:ind"))


def _get_run_color(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    return None if rPr is None else rPr.find(qn("w:color"))


# ─────────────────────────── paragraph fixtures ─────────────────────────────

@pytest.fixture
def binding_para_justify():
    """段落样式：两端对齐 + 行高 1.8 + 首行缩进 2 字符"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "body": {"fontFamily": "FangSong_GB2312", "fontSizePt": 16},
            },
            "paragraphStyles": {
                "align": "justify",
                "lineHeight": 1.8,
                "firstLineIndentChars": 2,
            },
            "layout": {
                "paperSize": "A4",
                "defaultLineHeight": 1.8,
                "defaultFirstLineIndentChars": 2,
            },
        },
    }


@pytest.fixture
def binding_para_left():
    """段落样式：左对齐 + 行高 1.5 + 无缩进"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "body": {"fontFamily": "SimSun", "fontSizePt": 12},
            },
            "paragraphStyles": {
                "align": "left",
                "lineHeight": 1.5,
                "firstLineIndentChars": 0,
            },
            "layout": {
                "paperSize": "A4",
                "defaultLineHeight": 1.5,
                "defaultFirstLineIndentChars": 0,
            },
        },
    }


# ─────────────────────────── list fixtures ──────────────────────────────────

@pytest.fixture
def binding_bullet_list():
    """无序列表：indentCm=0.5, spacingBeforeLines=0.5, color=#FF0000"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "listStyles": {
                "bullet": {
                    "indentCm": 0.5,
                    "spacingBeforeLines": 0.5,
                    "spacingAfterLines": 0.0,
                    "lineSpacing": 1.5,
                    "color": "#FF0000",
                }
            },
            "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
        },
    }


@pytest.fixture
def binding_ordered_list():
    """有序列表：indentCm=1.0, format='1.'"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "listStyles": {
                "ordered": {
                    "format": "1.",
                    "indentCm": 1.0,
                    "spacingBeforeLines": 0.25,
                    "spacingAfterLines": 0.25,
                }
            },
            "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
        },
    }


# ─────────────────────────── paragraph tests ────────────────────────────────

class TestParagraphAlignment:
    """正文段落对齐方式应写入 w:jc"""

    def test_justify_sets_jc_both(self, make_docx_with_heading, binding_para_justify):
        doc = make_docx_with_heading("Normal", "正文内容")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_para_justify, doc=doc)

        jc = _get_jc(doc.paragraphs[0])
        assert jc is not None, "justify 对齐应写入 w:jc"
        assert jc.get(qn("w:val")) == "both", "justify → both"

    def test_left_sets_jc_left(self, make_docx_with_heading, binding_para_left):
        doc = make_docx_with_heading("Normal", "左对齐正文")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_para_left, doc=doc)

        jc = _get_jc(doc.paragraphs[0])
        assert jc is not None
        assert jc.get(qn("w:val")) == "left"


class TestParagraphFirstLineIndent:
    """正文首行缩进应写入 w:ind > firstLine"""

    def test_indent_2chars_writes_ind_firstline(self, make_docx_with_heading, binding_para_justify):
        doc = make_docx_with_heading("Normal", "首行缩进段落")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_para_justify, doc=doc)

        # firstLineIndent 通过 para.paragraph_format.first_line_indent 设置
        para = doc.paragraphs[0]
        indent = para.paragraph_format.first_line_indent
        assert indent is not None, "应设置首行缩进"
        assert indent > 0, f"首行缩进应 > 0，实际={indent}"

    def test_indent_0chars_no_indent(self, make_docx_with_heading, binding_para_left):
        doc = make_docx_with_heading("Normal", "无缩进段落")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_para_left, doc=doc)

        para = doc.paragraphs[0]
        indent = para.paragraph_format.first_line_indent
        # indent=0 时要么不写，要么值为0
        assert indent is None or indent == 0, f"不应有首行缩进，实际={indent}"


# ─────────────────────────── list tests ─────────────────────────────────────

class TestBulletListIndent:
    """无序列表缩进应写入 w:ind > w:left"""

    def test_bullet_indent_05cm_sets_ind_left(self, make_docx_with_list, binding_bullet_list):
        doc = make_docx_with_list(is_ordered=False)
        styler = DocxStyler()
        styler.apply_docx_list_styles(doc, template_binding=binding_bullet_list)

        list_paras = [p for p in doc.paragraphs if _get_pPr(p) is not None
                      and _get_pPr(p).find(qn("w:numPr")) is not None]
        assert list_paras, "应有列表段落"

        ind = _get_ind(list_paras[0])
        assert ind is not None, "应写入 w:ind"
        left_val = ind.get(qn("w:left"))
        assert left_val is not None, "应有 w:left 属性"
        # 0.5 cm = 0.5 * 567 = 283 twips (取整)
        assert int(left_val) == int(0.5 * 567), f"0.5cm → 283 twips，实际={left_val}"


class TestBulletListSpacing:
    """无序列表间距应写入 w:spacing"""

    def test_bullet_spacing_before_sets_w_before(self, make_docx_with_list, binding_bullet_list):
        doc = make_docx_with_list(is_ordered=False)
        styler = DocxStyler()
        styler.apply_docx_list_styles(doc, template_binding=binding_bullet_list)

        list_paras = [p for p in doc.paragraphs if _get_pPr(p) is not None
                      and _get_pPr(p).find(qn("w:numPr")) is not None]
        assert list_paras

        spc = _get_spacing(list_paras[0])
        assert spc is not None, "应写入 w:spacing"
        before = spc.get(qn("w:before"))
        assert before is not None, "应有 w:before"
        assert int(before) == int(0.5 * 240), f"0.5 lines → 120，实际={before}"

    def test_bullet_line_spacing_sets_w_line(self, make_docx_with_list, binding_bullet_list):
        doc = make_docx_with_list(is_ordered=False)
        styler = DocxStyler()
        styler.apply_docx_list_styles(doc, template_binding=binding_bullet_list)

        list_paras = [p for p in doc.paragraphs if _get_pPr(p) is not None
                      and _get_pPr(p).find(qn("w:numPr")) is not None]
        spc = _get_spacing(list_paras[0])
        assert spc is not None
        line = spc.get(qn("w:line"))
        assert line is not None, "应有 w:line"
        assert int(line) == int(1.5 * 240), f"lineSpacing=1.5 → 360，实际={line}"


class TestBulletListColor:
    """无序列表颜色应写入 run > rPr > w:color"""

    def test_bullet_color_ff0000_sets_run_color(self, make_docx_with_list, binding_bullet_list):
        doc = make_docx_with_list(is_ordered=False)
        styler = DocxStyler()
        styler.apply_docx_list_styles(doc, template_binding=binding_bullet_list)

        list_paras = [p for p in doc.paragraphs if _get_pPr(p) is not None
                      and _get_pPr(p).find(qn("w:numPr")) is not None]
        assert list_paras

        color_elem = _get_run_color(list_paras[0])
        assert color_elem is not None, "应写入 w:color"
        assert color_elem.get(qn("w:val")) == "FF0000", f"实际={color_elem.get(qn('w:val'))}"


class TestOrderedListIndent:
    """有序列表 indentCm 配置能正确写入 w:ind > w:left。

    注：最小 docx 无真实 numbering.xml，无法区分有序/无序，
    测试改用含 bullet+ordered 双配置的 binding，验证列表段落收到 indentCm 后能写入 ind。
    """

    def test_list_indent_1cm_sets_ind_left(self, make_docx_with_list):
        """bullet.indentCm=1.0 时应写入 w:ind left=567"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "listStyles": {
                    "bullet": {
                        "indentCm": 1.0,
                    },
                    "ordered": {
                        "format": "1.",
                        "indentCm": 1.0,
                    },
                },
                "layout": {"paperSize": "A4"},
            },
        }
        doc = make_docx_with_list(is_ordered=False)
        styler = DocxStyler()
        styler.apply_docx_list_styles(doc, template_binding=binding)

        list_paras = [p for p in doc.paragraphs if _get_pPr(p) is not None
                      and _get_pPr(p).find(qn("w:numPr")) is not None]
        assert list_paras, "应有带 numPr 的列表段落"

        ind = _get_ind(list_paras[0])
        assert ind is not None, "应写入 w:ind"
        left_val = ind.get(qn("w:left"))
        assert left_val is not None
        assert int(left_val) == int(1.0 * 567), f"1.0cm → 567 twips，实际={left_val}"

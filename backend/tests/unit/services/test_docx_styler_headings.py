"""
标题样式 DOCX XML 断言测试

验证 DocxStyler.apply_docx_font() 应用标题样式配置后，
生成的 DOCX XML 包含正确的属性值。

测试策略：
  - 构造最小 docx 文档（含 Heading N 样式段落）
  - 调用 apply_docx_font 传入 template_binding
  - 直接读取 paragraph._element XML，断言关键属性
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


def _get_run_rFonts(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    return None if rPr is None else rPr.find(qn("w:rFonts"))


def _get_run_sz(para):
    if not para.runs:
        return None
    rPr = para.runs[0]._element.find(qn("w:rPr"))
    return None if rPr is None else rPr.find(qn("w:sz"))


# ─────────────────────────── fixtures ───────────────────────────────────────

@pytest.fixture
def binding_h1_align_center():
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "body": {"fontFamily": "SimSun", "fontSizePt": 12},
                "heading_1": {"fontFamily": "SimHei", "fontSizePt": 16, "bold": True},
            },
            "headingStyles": {
                "h1": {
                    "font": {"fontFamily": "SimHei", "fontSizePt": 16, "bold": True},
                    "align": "center",
                    "lineHeight": 1.5,
                    "spacingBeforePt": 12,
                    "spacingAfterPt": 6,
                },
            },
            "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
        },
    }


@pytest.fixture
def binding_h2_left():
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "body": {"fontFamily": "SimSun", "fontSizePt": 12},
                "heading_2": {"fontFamily": "KaiTi_GB2312", "fontSizePt": 14, "bold": True},
            },
            "headingStyles": {
                "h2": {
                    "font": {"fontFamily": "KaiTi_GB2312", "fontSizePt": 14},
                    "align": "left",
                    "lineHeight": 1.4,
                    "spacingBeforePt": 8,
                    "spacingAfterPt": 4,
                },
            },
            "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
        },
    }


@pytest.fixture
def binding_h3_justify():
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {
                "body": {"fontFamily": "SimSun", "fontSizePt": 12},
            },
            "headingStyles": {
                "h3": {
                    "font": {"fontFamily": "FangSong_GB2312", "fontSizePt": 13, "bold": False},
                    "align": "justify",
                    "lineHeight": 1.3,
                    "spacingBeforePt": 6,
                    "spacingAfterPt": 0,
                },
            },
            "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
        },
    }


# ─────────────────────────── tests ──────────────────────────────────────────

class TestHeadingAlignment:
    """标题对齐方式应写入 w:jc 元素"""

    def test_h1_align_center_sets_jc_center(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "一级标题示例")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        heading_para = doc.paragraphs[0]
        jc = _get_jc(heading_para)
        assert jc is not None, "应存在 w:jc 元素"
        assert jc.get(qn("w:val")) == "center", f"期望 center，实际 {jc.get(qn('w:val'))}"

    def test_h2_align_left_sets_jc_left(self, make_docx_with_heading, binding_h2_left):
        doc = make_docx_with_heading("Heading2", "二级标题示例")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h2_left, doc=doc)

        heading_para = doc.paragraphs[0]
        jc = _get_jc(heading_para)
        assert jc is not None, "应存在 w:jc 元素"
        assert jc.get(qn("w:val")) == "left"

    def test_h3_align_justify_sets_jc_both(self, make_docx_with_heading, binding_h3_justify):
        doc = make_docx_with_heading("Heading3", "三级标题示例")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h3_justify, doc=doc)

        heading_para = doc.paragraphs[0]
        jc = _get_jc(heading_para)
        assert jc is not None, "应存在 w:jc 元素"
        assert jc.get(qn("w:val")) == "both", "justify 应映射为 both"


class TestHeadingLineHeight:
    """标题行高应写入 w:spacing w:line"""

    def test_h1_line_height_15_sets_spacing_line_360(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "行高测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        spc = _get_spacing(doc.paragraphs[0])
        assert spc is not None, "应存在 w:spacing 元素"
        line_val = spc.get(qn("w:line"))
        assert line_val is not None, "应存在 w:line 属性"
        assert int(line_val) == 360, f"lineHeight=1.5 → w:line=360，实际={line_val}"

    def test_h2_line_height_14_sets_spacing_line_336(self, make_docx_with_heading, binding_h2_left):
        doc = make_docx_with_heading("Heading2", "行高测试H2")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h2_left, doc=doc)

        spc = _get_spacing(doc.paragraphs[0])
        assert spc is not None
        line_val = spc.get(qn("w:line"))
        assert int(line_val) == int(1.4 * 240), f"lineHeight=1.4 → w:line=336，实际={line_val}"


class TestHeadingSpacingBeforeAfter:
    """标题段前段后应写入 w:spacing w:before / w:after"""

    def test_h1_spacing_before_12pt_sets_before_240(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "段前测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        spc = _get_spacing(doc.paragraphs[0])
        assert spc is not None
        before_val = spc.get(qn("w:before"))
        assert before_val is not None, "应存在 w:before 属性"
        assert int(before_val) == 240, f"spacingBeforePt=12 → w:before=240，实际={before_val}"

    def test_h1_spacing_after_6pt_sets_after_120(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "段后测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        spc = _get_spacing(doc.paragraphs[0])
        after_val = spc.get(qn("w:after"))
        assert after_val is not None, "应存在 w:after 属性"
        assert int(after_val) == 120, f"spacingAfterPt=6 → w:after=120，实际={after_val}"

    def test_h3_spacing_after_0_sets_after_0(self, make_docx_with_heading, binding_h3_justify):
        doc = make_docx_with_heading("Heading3", "段后零值测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h3_justify, doc=doc)

        spc = _get_spacing(doc.paragraphs[0])
        after_val = spc.get(qn("w:after"))
        assert int(after_val) == 0, f"spacingAfterPt=0 → w:after=0，实际={after_val}"


class TestHeadingFont:
    """标题字体应写入 rPr > w:rFonts 的 eastAsia/ascii 属性"""

    def test_h1_font_simhei_sets_rfont_east_asia(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "字体测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        rFonts = _get_run_rFonts(doc.paragraphs[0])
        assert rFonts is not None, "应存在 w:rFonts 元素"
        east_asia = rFonts.get(qn("w:eastAsia"))
        assert east_asia == "黑体", f"SimHei → 黑体，实际={east_asia}"

    def test_h2_font_kaiti_sets_rfont(self, make_docx_with_heading, binding_h2_left):
        doc = make_docx_with_heading("Heading2", "字体测试H2")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h2_left, doc=doc)

        rFonts = _get_run_rFonts(doc.paragraphs[0])
        assert rFonts is not None
        east_asia = rFonts.get(qn("w:eastAsia"))
        assert east_asia == "楷体_GB2312", f"KaiTi_GB2312 → 楷体_GB2312，实际={east_asia}"


class TestHeadingFontSize:
    """标题字号应写入 rPr > w:sz，单位为半点（pt * 2）"""

    def test_h1_fontsize_16pt_sets_sz_32(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "字号测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        sz = _get_run_sz(doc.paragraphs[0])
        assert sz is not None, "应存在 w:sz 元素"
        sz_val = sz.get(qn("w:val"))
        assert int(sz_val) == 32, f"16pt → w:sz=32（半点），实际={sz_val}"

    def test_h2_fontsize_14pt_sets_sz_28(self, make_docx_with_heading, binding_h2_left):
        doc = make_docx_with_heading("Heading2", "字号测试H2")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h2_left, doc=doc)

        sz = _get_run_sz(doc.paragraphs[0])
        assert sz is not None
        assert int(sz.get(qn("w:val"))) == 28, "14pt → w:sz=28"


class TestHeadingColorBlack:
    """标题颜色应强制为纯黑（000000）"""

    def test_h1_color_forced_to_black(self, make_docx_with_heading, binding_h1_align_center):
        doc = make_docx_with_heading("Heading1", "颜色测试")
        styler = DocxStyler()
        styler.apply_docx_font("_", template_binding=binding_h1_align_center, doc=doc)

        if not doc.paragraphs[0].runs:
            pytest.skip("无 run，跳过颜色验证")
        rPr = doc.paragraphs[0].runs[0]._element.find(qn("w:rPr"))
        if rPr is None:
            pytest.skip("无 rPr")
        color_elem = rPr.find(qn("w:color"))
        assert color_elem is not None, "应存在 w:color 元素"
        assert color_elem.get(qn("w:val")) == "000000", "标题颜色应强制为黑色"


class TestHeadingFirstLineIndent:
    """标题首行缩进应写入 w:pPr > w:ind > firstLine（单位：twips = pt × 20）"""

    def test_h1_first_line_indent_2chars(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "headingStyles": {
                    "h1": {
                        "font": {"fontFamily": "SimHei", "fontSizePt": 16},
                        "firstLineIndentChars": 2,
                    },
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Heading1", "缩进测试")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        assert pPr is not None
        ind = pPr.find(qn("w:ind"))
        assert ind is not None, "应写入 w:ind"
        fl = ind.get(qn("w:firstLine"))
        assert fl is not None, "应有 w:firstLine 属性"
        # 2 chars × 16pt × 20 twips/pt = 640
        assert int(fl) == 640, f"2chars×16pt → 640 twips，实际={fl}"

    def test_h1_first_line_indent_0_no_firstline(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "headingStyles": {
                    "h1": {
                        "font": {"fontFamily": "SimHei", "fontSizePt": 16},
                        "firstLineIndentChars": 0,
                    },
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Heading1", "无缩进")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        if pPr is not None:
            ind = pPr.find(qn("w:ind"))
            if ind is not None:
                fl = ind.get(qn("w:firstLine"))
                assert fl is None or int(fl) == 0, "firstLineIndentChars=0 时 firstLine 应为 0 或不存在"


class TestHeadingOutlineLevel:
    """标题大纲级别应写入 w:pPr > w:outlineLvl"""

    def test_h1_outline_level_0(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "headingStyles": {
                    "h1": {
                        "font": {"fontFamily": "SimHei", "fontSizePt": 16},
                        "outlineLevel": 0,
                    },
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Heading1", "大纲级别测试")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        assert pPr is not None
        ol = pPr.find(qn("w:outlineLvl"))
        assert ol is not None, "应写入 w:outlineLvl"
        assert ol.get(qn("w:val")) == "0", f"outlineLevel=0 → w:val=0，实际={ol.get(qn('w:val'))}"

    def test_h2_outline_level_1(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "headingStyles": {
                    "h2": {
                        "font": {"fontFamily": "SimHei", "fontSizePt": 14},
                        "outlineLevel": 1,
                    },
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Heading2", "二级大纲")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        assert pPr is not None
        ol = pPr.find(qn("w:outlineLvl"))
        assert ol is not None, "应写入 w:outlineLvl"
        assert ol.get(qn("w:val")) == "1"


class TestParagraphSpacingDocx:
    """正文段落段前段后应写入 w:pPr > w:spacing"""

    def test_para_spacing_before_6pt_sets_before_120(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "paragraphStyles": {
                    "spacingBeforePt": 6,
                    "spacingAfterPt": 0,
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Normal", "段前段后测试")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        assert pPr is not None
        spc = pPr.find(qn("w:spacing"))
        assert spc is not None, "应写入 w:spacing"
        before = spc.get(qn("w:before"))
        assert before is not None, "应有 w:before"
        assert int(before) == 120, f"6pt → 120 twips，实际={before}"

    def test_para_spacing_after_12pt_sets_after_240(self, make_docx_with_heading):
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-16T00:00:00Z",
            "configSnapshot": {
                "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
                "paragraphStyles": {
                    "spacingBeforePt": 0,
                    "spacingAfterPt": 12,
                },
                "layout": {"paperSize": "A4", "defaultLineHeight": 1.5},
            },
        }
        doc = make_docx_with_heading("Normal", "段后测试")
        DocxStyler().apply_docx_font("_", template_binding=binding, doc=doc)

        pPr = doc.paragraphs[0]._element.find(qn("w:pPr"))
        assert pPr is not None
        spc = pPr.find(qn("w:spacing"))
        assert spc is not None
        after = spc.get(qn("w:after"))
        assert after is not None, "应有 w:after"
        assert int(after) == 240, f"12pt → 240 twips，实际={after}"

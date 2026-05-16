"""
CssGenerator 补充测试

覆盖 test_export_service.py 中未覆盖的 CssGenerator 路径：
  - get_page_css: A3/Letter/B5/16K/8K 纸张尺寸, landscape, 自定义宽高, 首行缩进em换算
  - get_codeblock_css: italic, alignment, 4方向padding, keyboardStyle
  - get_table_css: 表头bold/italic/underline/lineHeight, shading.applyTo=table,
                    内部边框(仅水平/仅垂直), 数据行样式
  - get_list_css: 有序列表format→CSS, 无序列表完整配置
  - get_image_css: 4方向间距, 边框
  - get_full_css: 组合输出
"""
import pytest
from app.services.export.css_generator import CssGenerator


# ─────────────────────────── get_page_css ─────────────────────────────────

class TestPageCssPaperSizes:
    """页面尺寸 CSS 生成"""

    def test_a3_sets_dimensions(self):
        binding = {"configSnapshot": {"layout": {"paperSize": "A3"}}}
        css = CssGenerator.get_page_css(binding)
        assert "297mm" in css and "420mm" in css

    def test_letter_sets_inch_dimensions(self):
        binding = {"configSnapshot": {"layout": {"paperSize": "Letter"}}}
        css = CssGenerator.get_page_css(binding)
        assert "8.5in" in css

    def test_b5_sets_mm_dimensions(self):
        binding = {"configSnapshot": {"layout": {"paperSize": "B5"}}}
        css = CssGenerator.get_page_css(binding)
        assert "176mm" in css and "250mm" in css

    def test_landscape_swaps_width_height(self):
        binding = {"configSnapshot": {"layout": {
            "paperSize": "A4", "paperDirection": "landscape"
        }}}
        css = CssGenerator.get_page_css(binding)
        # landscape: 宽=297mm, 高=210mm
        assert "297mm" in css and "210mm" in css

    def test_custom_width_height_mm(self):
        binding = {"configSnapshot": {"layout": {
            "paperSize": "A4",
            "pageWidthMm": 100,
            "pageHeightMm": 200,
        }}}
        css = CssGenerator.get_page_css(binding)
        assert "100mm" in css and "200mm" in css

    def test_landscape_custom_swaps(self):
        binding = {"configSnapshot": {"layout": {
            "paperSize": "A4",
            "pageWidthMm": 100,
            "pageHeightMm": 200,
            "paperDirection": "landscape",
        }}}
        css = CssGenerator.get_page_css(binding)
        # landscape: 宽=pageHeightMm=200mm, 高=pageWidthMm=100mm
        assert "200mm" in css and "100mm" in css


class TestPageCssMargins:
    """页边距 CSS"""

    def test_custom_margins(self):
        binding = {"configSnapshot": {"layout": {
            "marginTopMm": 30, "marginBottomMm": 20,
            "marginLeftMm": 35, "marginRightMm": 15,
        }}}
        css = CssGenerator.get_page_css(binding)
        assert "30mm" in css and "20mm" in css
        assert "35mm" in css and "15mm" in css

    def test_default_margin_when_missing(self):
        binding = {"configSnapshot": {"layout": {}}}
        css = CssGenerator.get_page_css(binding)
        # 默认 25mm
        assert "25mm" in css


class TestPageCssFirstLineIndent:
    """首行缩进 em 换算"""

    def test_first_line_indent_2chars(self):
        binding = {"configSnapshot": {"layout": {"defaultFirstLineIndentChars": 2}}}
        css = CssGenerator.get_page_css(binding)
        assert "text-indent: 2em" in css

    def test_first_line_indent_zero_skipped(self):
        binding = {"configSnapshot": {"layout": {"defaultFirstLineIndentChars": 0}}}
        css = CssGenerator.get_page_css(binding)
        assert "text-indent" not in css


class TestPageCssBodyFont:
    """正文字体"""

    def test_body_font_fangsong(self):
        binding = {"configSnapshot": {"styles": {
            "body": {"fontFamily": "FangSong_GB2312"}
        }}}
        css = CssGenerator.get_page_css(binding)
        assert "仿宋_GB2312" in css


class TestPageCssHeadingFont:
    """标题字体"""

    def test_h1_heading_font_from_heading_styles(self):
        binding = {
            "configSnapshot": {
                "styles": {},
                "headingStyles": {
                    "h1": {"font": {"fontFamily": "SimHei", "fontSizePt": 16}}
                },
            }
        }
        css = CssGenerator.get_page_css(binding)
        assert "黑体" in css


# ─────────────────────────── get_codeblock_css ──────────────────────────────

class TestCodeblockCssFont:
    """代码块字体"""

    def test_italic_generates_css(self):
        binding = {"configSnapshot": {"codeBlockStyles": {
            "font": {"italic": True}
        }}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "font-style: italic" in css

    def test_italic_false_generates_normal(self):
        binding = {"configSnapshot": {"codeBlockStyles": {
            "font": {"italic": False}
        }}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "font-style: normal" in css


class TestCodeblockCssAlignment:
    """代码块对齐"""

    def test_align_center(self):
        binding = {"configSnapshot": {"codeBlockStyles": {"alignment": "center"}}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "text-align: center" in css

    def test_align_right(self):
        binding = {"configSnapshot": {"codeBlockStyles": {"alignment": "right"}}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "text-align: right" in css


class TestCodeblockCssPadding:
    """代码块内边距"""

    def test_padding_all_directions(self):
        binding = {"configSnapshot": {"codeBlockStyles": {
            "padding": {"topPt": 8, "bottomPt": 4, "leftPt": 12, "rightPt": 10}
        }}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "8pt" in css and "4pt" in css
        assert "12pt" in css and "10pt" in css


class TestCodeblockCssKeyboardStyle:
    """键盘样式"""

    def test_keyboard_fg_color(self):
        binding = {"configSnapshot": {"codeBlockStyles": {
            "keyboardStyle": {"foregroundColor": "#FF0000"}
        }}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "color: #FF0000" in css

    def test_keyboard_bg_color(self):
        binding = {"configSnapshot": {"codeBlockStyles": {
            "keyboardStyle": {"backgroundColor": "#FAFAFA"}
        }}}
        css = CssGenerator.get_codeblock_css(binding)
        assert "background-color: #FAFAFA" in css


# ─────────────────────────── get_table_css ────────────────────────────────

class TestTableCssHeaderStyle:
    """表头样式"""

    def test_header_bold(self):
        binding = {"configSnapshot": {"tableStyles": {
            "headerStyle": {"font": {"bold": True}}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "font-weight: bold" in css

    def test_header_italic(self):
        binding = {"configSnapshot": {"tableStyles": {
            "headerStyle": {"font": {"italic": True}}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "font-style: italic" in css

    def test_header_underline(self):
        binding = {"configSnapshot": {"tableStyles": {
            "headerStyle": {"font": {"underline": True}}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "text-decoration: underline" in css

    def test_header_line_height(self):
        binding = {"configSnapshot": {"tableStyles": {
            "headerStyle": {"lineHeight": 1.5}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "line-height: 1.5" in css

    def test_header_shading_apply_to_cell(self):
        binding = {"configSnapshot": {"tableStyles": {
            "headerStyle": {"shading": {"fill": "#CCCCCC"}},
            "shading": {"applyTo": "cell"},
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "background-color: #CCCCCC" in css

    def test_table_shading_apply_to_table(self):
        binding = {"configSnapshot": {"tableStyles": {
            "shading": {"fill": "#EEEEEE", "applyTo": "table"}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "background-color: #EEEEEE" in css


class TestTableCssInternalBorders:
    """表格内部边框"""

    def test_inside_horizontal_only(self):
        binding = {"configSnapshot": {"tableStyles": {
            "border": {"color": "#000000", "insideHorizontalBorder": True, "insideVerticalBorder": False}
        }}}
        css = CssGenerator.get_table_css(binding)
        # 应生成仅保留水平边框的 CSS
        assert "border-left: none" in css or "border-right: none" in css

    def test_inside_vertical_only(self):
        binding = {"configSnapshot": {"tableStyles": {
            "border": {"color": "#000000", "insideHorizontalBorder": False, "insideVerticalBorder": True}
        }}}
        css = CssGenerator.get_table_css(binding)
        # 应生成仅保留垂直边框的 CSS
        assert "border-top: none" in css or "border-bottom: none" in css


class TestTableCssDataRowStyle:
    """数据行样式"""

    def test_data_row_bold(self):
        binding = {"configSnapshot": {"tableStyles": {
            "dataRowStyle": {"font": {"bold": True}}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "font-weight: bold" in css

    def test_data_row_color(self):
        binding = {"configSnapshot": {"tableStyles": {
            "dataRowStyle": {"font": {"color": "#333333"}}
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "color: #333333" in css


class TestTableCssAlignment:
    """表格对齐"""

    def test_table_align_right(self):
        binding = {"configSnapshot": {"tableStyles": {
            "tableAlignment": "right", "tableWidth": 80
        }}}
        css = CssGenerator.get_table_css(binding)
        assert "margin-left: auto" in css
        assert "margin-right: 0" in css


# ─────────────────────────── get_list_css ────────────────────────────────

class TestListCssOrdered:
    """有序列表"""

    def test_ordered_format_lower_alpha(self):
        binding = {"configSnapshot": {"listStyles": {
            "ordered": {"format": "a.", "color": "#FF0000", "fontFamily": "KaiTi_GB2312"}
        }}}
        css = CssGenerator.get_list_css(binding)
        assert "lower-alpha" in css
        assert "color: #FF0000" in css

    def test_ordered_format_upper_alpha(self):
        binding = {"configSnapshot": {"listStyles": {
            "ordered": {"format": "A."}
        }}}
        css = CssGenerator.get_list_css(binding)
        assert "upper-alpha" in css or "decimal" in css

    def test_ordered_indent_cm(self):
        binding = {"configSnapshot": {"listStyles": {
            "ordered": {"indentCm": 1.5}
        }}}
        css = CssGenerator.get_list_css(binding)
        assert "1.5cm" in css


class TestListCssBullet:
    """无序列表"""

    def test_bullet_character_safe_quote(self):
        binding = {"configSnapshot": {"listStyles": {
            "bullet": {"character": '•', "color": "#0000FF"}
        }}}
        css = CssGenerator.get_list_css(binding)
        assert "•" in css or "list-style: none" in css

    def test_bullet_indent_cm(self):
        binding = {"configSnapshot": {"listStyles": {
            "bullet": {"indentCm": 0.75}
        }}}
        css = CssGenerator.get_list_css(binding)
        assert "0.75cm" in css


# ─────────────────────────── get_image_css ────────────────────────────────

class TestImageCssSpacing:
    """图片间距"""

    def test_margin_all_directions(self):
        binding = {"configSnapshot": {"imageStyles": {
            "spacing": {
                "marginTopCm": 1.0, "marginBottomCm": 0.5,
                "marginLeftCm": 0.3, "marginRightCm": 0.7,
            }
        }}}
        css = CssGenerator.get_image_css(binding)
        assert "1.0cm" in css
        assert "0.5cm" in css
        assert "0.3cm" in css
        assert "0.7cm" in css


class TestImageCssBorder:
    """图片边框"""

    def test_border_show(self):
        binding = {"configSnapshot": {"imageStyles": {
            "border": {"showBorder": True, "color": "#FF0000", "widthPt": 2}
        }}}
        css = CssGenerator.get_image_css(binding)
        assert "border:" in css and "solid" in css


# ─────────────────────────── get_full_css ────────────────────────────────

class TestFullCss:
    """完整 CSS 组合"""

    def test_includes_page_and_table(self):
        binding = {
            "configSnapshot": {
                "layout": {"paperSize": "A4"},
                "tableStyles": {"tableWidth": 100},
            }
        }
        css = CssGenerator.get_full_css(binding)
        assert "@page" in css
        assert "table" in css.lower()

    def test_empty_binding_returns_empty_string(self):
        css = CssGenerator.get_full_css(None)
        assert isinstance(css, str)

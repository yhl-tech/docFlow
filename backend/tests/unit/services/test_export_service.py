"""导出服务单元测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any

from app.services.export_service import ExportService
from app.services.export.bindings import StyleBindings
from app.services.export.css_generator import CssGenerator


class TestExportServiceInit:
    """ExportService 初始化测试"""

    def test_service_has_export_method(self):
        """ExportService 应有 export 方法"""
        svc = ExportService()
        assert hasattr(svc, "export")
        assert callable(getattr(svc, "export"))

    def test_service_has_export_docx_method(self):
        """ExportService 应有 export_docx 方法"""
        svc = ExportService()
        assert hasattr(svc, "export_docx")
        assert callable(getattr(svc, "export_docx"))

    def test_service_has_export_pdf_method(self):
        """ExportService 应有 export_pdf 方法"""
        svc = ExportService()
        assert hasattr(svc, "export_pdf")
        assert callable(getattr(svc, "export_pdf"))


class TestBindingStyles:
    """TemplateBinding 样式提取测试"""

    def test_binding_styles_extracts_from_snapshot(self, sample_template_binding: dict[str, Any]):
        """TemplateBinding.configSnapshot.styles 应被正确提取"""
        styles = StyleBindings.get_styles(sample_template_binding)

        assert "body" in styles
        assert styles["body"]["fontFamily"] == "FangSong_GB2312"
        assert styles["body"]["fontSizePt"] == 16
        assert styles["heading_1"]["bold"] is True
        assert styles["heading_1"]["fontFamily"] == "SimHei"

    def test_binding_styles_fallback_to_empty(self):
        """无 snapshot 时应返回空字典"""
        styles = StyleBindings.get_styles(None)
        assert styles == {}

    def test_binding_styles_handles_partial_config(self):
        """部分配置应正确提取"""
        partial_binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "styles": {
                    "body": {"fontFamily": "SimHei", "fontSizePt": 18}
                },
                "layout": {},
            }
        }
        styles = StyleBindings.get_styles(partial_binding)

        assert styles["body"]["fontFamily"] == "SimHei"
        assert styles["body"]["fontSizePt"] == 18


class TestBindingLayout:
    """TemplateBinding 布局提取测试"""

    def test_binding_layout_extracts_from_snapshot(self, sample_template_binding: dict[str, Any]):
        """Layout 应从 snapshot 正确提取"""
        layout = StyleBindings.get_layout(sample_template_binding)

        assert layout["paperSize"] == "A4"
        assert layout["marginTopMm"] == 37
        assert layout["marginBottomMm"] == 35
        assert layout["marginLeftMm"] == 28
        assert layout["marginRightMm"] == 26

    def test_binding_layout_fallback_to_empty(self):
        """无 layout 时应返回空字典"""
        layout = StyleBindings.get_layout(None)
        assert layout == {}

    def test_binding_layout_partial_config(self):
        """部分布局配置应正确提取"""
        partial_binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "styles": {},
                "layout": {"paperSize": "B5", "marginTopMm": 30}
            }
        }
        layout = StyleBindings.get_layout(partial_binding)

        assert layout["paperSize"] == "B5"
        assert layout["marginTopMm"] == 30


class TestPageSize:
    """页面尺寸测试"""

    def test_get_page_size_from_param(self):
        """参数指定尺寸时应返回该尺寸"""
        result = StyleBindings.get_page_size("A4", None)
        assert result == "A4"

    def test_get_page_size_from_binding(self):
        """从绑定配置读取尺寸"""
        binding = {
            "configSnapshot": {
                "layout": {"paperSize": "Letter"}
            }
        }
        result = StyleBindings.get_page_size("default", binding)
        assert result == "Letter"

    def test_get_page_size_fallback_to_a4(self):
        """无配置时返回默认 A4"""
        result = StyleBindings.get_page_size("default", None)
        assert result == "A4"


class TestBindingHeadingStyles:
    """headingStyles 提取测试"""

    def test_binding_heading_styles_extracts_h1_to_h6(self, sample_heading_styles_binding: dict[str, Any]):
        """headingStyles.h1~h6 应被正确提取"""
        hs = StyleBindings.get_heading_styles(sample_heading_styles_binding)
        assert "h1" in hs
        assert hs["h1"]["font"]["fontFamily"] == "SimHei"
        assert hs["h1"]["font"]["fontSizePt"] == 16
        assert hs["h1"]["font"]["bold"] is True
        assert hs["h2"]["font"]["fontFamily"] == "SimHei"
        assert hs["h2"]["font"]["fontSizePt"] == 14

    def test_binding_heading_styles_fallback(self):
        """无 headingStyles 时返回空 dict"""
        assert StyleBindings.get_heading_styles(None) == {}
        assert StyleBindings.get_heading_styles({}) == {}

    def test_binding_heading_styles_partial_config(self):
        """仅配置 h1 时，h2~h6 不应存在"""
        partial_binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "headingStyles": {
                    "h1": {"font": {"fontFamily": "SimHei", "fontSizePt": 16}}
                }
            },
        }
        hs = StyleBindings.get_heading_styles(partial_binding)
        assert "h1" in hs
        assert "h2" not in hs


class TestBindingParagraphStyles:
    """paragraphStyles 提取测试"""

    def test_binding_paragraph_styles_extracts_align(self, sample_heading_styles_binding: dict[str, Any]):
        """paragraphStyles 应被正确提取"""
        ps = StyleBindings.get_paragraph_styles(sample_heading_styles_binding)
        assert ps["align"] == "justify"
        assert ps["lineHeight"] == 1.8
        assert ps["spacingBeforePt"] == 0

    def test_binding_paragraph_styles_fallback(self):
        """无 paragraphStyles 时返回空 dict"""
        assert StyleBindings.get_paragraph_styles(None) == {}


class TestTableBorderCssGeneration:
    """表格边框 CSS 生成测试"""

    def test_border_style_double_generates_correct_css(self):
        """tableStyles.border.style='double' 时，CSS 应包含 double 关键字"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "tableStyles": {
                    "border": {
                        "color": "#000000",
                        "widthPt": 1.0,
                        "style": "double",
                    }
                }
            },
        }
        css = CssGenerator.get_table_css(binding)
        # CSS 输出为 shorthand 格式：border: 1.0pt double #000000
        assert "double" in css
        assert "#000000" in css
        assert "1.0pt" in css

    def test_border_width_pt_generates_border_width(self):
        """tableStyles.border.widthPt 应生成对应宽度的 CSS"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "tableStyles": {
                    "border": {
                        "color": "#000000",
                        "widthPt": 2.0,
                    }
                }
            },
        }
        css = CssGenerator.get_table_css(binding)
        # CSS 输出为 shorthand 格式：border: 2.0pt solid #000000
        assert "2.0pt" in css

    def test_table_alignment_right_generates_correct_css(self):
        """tableAlignment='right' 时，CSS 应生成 margin-right: 0"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "tableStyles": {
                    "tableAlignment": "right",
                    "tableWidth": 50,
                }
            },
        }
        css = CssGenerator.get_table_css(binding)
        assert "margin-right: 0" in css
        assert "width: 50%" in css

    def test_table_alignment_center_generates_correct_css(self):
        """tableAlignment='center' 时，CSS 应生成 margin-left/right: auto"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "tableStyles": {
                    "tableAlignment": "center",
                }
            },
        }
        css = CssGenerator.get_table_css(binding)
        assert "margin-left: auto" in css
        assert "margin-right: auto" in css


class TestImageStyleCssGeneration:
    """图片样式 CSS 生成测试"""

    def test_border_width_pt_generates_css(self):
        """imageStyles.borderWidthPt 应生成对应 CSS"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "imageStyles": {
                    "border": {
                        "showBorder": True,
                        "color": "#FF0000",
                        "widthPt": 2,
                    }
                }
            },
        }
        css = CssGenerator.get_image_css(binding)
        assert "border: 2pt solid #FF0000" in css or "border:2pt solid #FF0000" in css

    def test_spacing_generates_css(self):
        """图片间距应生成 CSS"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "imageStyles": {
                    "spacing": {
                        "marginTopCm": 1,
                        "marginBottomCm": 0.5,
                    }
                }
            },
        }
        css = CssGenerator.get_image_css(binding)
        assert "margin: 1cm" in css


class TestCodeBlockCssGeneration:
    """代码块 CSS 生成测试"""

    def test_shading_fill_generates_background_color(self):
        """codeBlockStyles.shading.fill 应生成 background-color CSS"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "codeBlockStyles": {
                    "shading": {"fill": "#F5F5F5"}
                }
            },
        }
        css = CssGenerator.get_codeblock_css(binding)
        assert "background-color: #F5F5F5" in css or "background-color:#F5F5F5" in css

    def test_keyboard_style_generates_css(self):
        """codeBlockStyles.keyboardStyle 应生成正确 CSS"""
        binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "codeBlockStyles": {
                    "keyboardStyle": {
                        "foregroundColor": "#333333",
                        "backgroundColor": "#FAFAFA",
                    }
                }
            },
        }
        css = CssGenerator.get_codeblock_css(binding)
        assert "color: #333333" in css or "color:#333333" in css
        assert "background-color: #FAFAFA" in css or "background-color:#FAFAFA" in css


class TestFixEmptyTableCells:
    """_fix_empty_table_cells 集成链路测试"""

    def _fix(self, md: str) -> str:
        return ExportService._fix_empty_table_cells(md)

    def test_empty_header_row_filled_with_nbsp(self):
        """完全空的表头行应被 NBSP 填充，防止 pandoc 忽略该行"""
        md = "|  |  |  |\n| --- | --- | --- |\n|  | data |  |\n"
        result = self._fix(md)
        lines = result.split('\n')
        header = lines[0]
        assert '\xa0' in header, "空 header 单元格必须含 NBSP"

    def test_separator_row_not_modified(self):
        """分隔行不应被修改"""
        md = "|  |  |\n| --- | --- |\n|  |  |\n"
        result = self._fix(md)
        assert '| --- | --- |' in result

    def test_data_with_content_preserved(self):
        """有内容的单元格不应被修改"""
        md = "| a | b |\n| --- | --- |\n| hello | world |\n"
        result = self._fix(md)
        assert '| hello | world |' in result or 'hello' in result

    def test_nbsp_cleared_in_postprocess(self):
        """postprocess 阶段 NBSP 占位符应被清除，不出现在最终单元格内容中"""
        import tempfile, subprocess, os
        from docx import Document

        pandoc_candidates = [
            r"C:\Users\yuanhl\AppData\Local\Pandoc\pandoc.exe",
            r"C:\Program Files\Pandoc\pandoc.exe",
            "pandoc",
        ]
        pandoc_bin = next((p for p in pandoc_candidates if os.path.exists(p)), None)
        if pandoc_bin is None:
            import shutil
            pandoc_bin = shutil.which("pandoc")
        if pandoc_bin is None:
            pytest.skip("pandoc 未安装，跳过集成测试")

        md = "|  |  |  |  |  |  |\n| --- | --- | --- | --- | --- | --- |\n|  |  | DATA |  |  |  |\n|  |  |  |  |  |  |\n"
        fixed = self._fix(md)

        with tempfile.TemporaryDirectory() as d:
            inp = os.path.join(d, "input.md")
            out = os.path.join(d, "output.docx")
            with open(inp, "w", encoding="utf-8-sig") as f:
                f.write(fixed)
            subprocess.run(
                [pandoc_bin, "--from=markdown+raw_html", "--to=docx", "-o", out, inp],
                check=True, capture_output=True,
            )
            doc = Document(out)

            # 模拟 postprocess 中的 NBSP 清除逻辑
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            for run in para.runs:
                                if run.text == '\xa0':
                                    run.text = ''

            # 验证：所有单元格不含 NBSP，DATA 在正确位置
            data_found = False
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        assert '\xa0' not in cell.text, f"单元格仍含 NBSP: {repr(cell.text)}"
                        if 'DATA' in cell.text:
                            data_found = True
            assert data_found, "DATA 内容应出现在表格中"

    def test_row_count_preserved(self):
        """fix 后再经 pandoc 转换，行数应与原始 markdown 一致（header 不被忽略）"""
        import tempfile, subprocess, os
        from docx import Document

        pandoc_candidates = [
            r"C:\Users\yuanhl\AppData\Local\Pandoc\pandoc.exe",
            r"C:\Program Files\Pandoc\pandoc.exe",
            "pandoc",
        ]
        pandoc_bin = next((p for p in pandoc_candidates if os.path.exists(p)), None)
        if pandoc_bin is None:
            import shutil
            pandoc_bin = shutil.which("pandoc")
        if pandoc_bin is None:
            pytest.skip("pandoc 未安装，跳过集成测试")

        # 1 header row + 2 data rows = 3 rows total
        md = "|  |  |  |\n| --- | --- | --- |\n|  | cell |  |\n|  |  |  |\n"
        fixed = self._fix(md)

        with tempfile.TemporaryDirectory() as d:
            inp = os.path.join(d, "input.md")
            out = os.path.join(d, "output.docx")
            with open(inp, "w", encoding="utf-8-sig") as f:
                f.write(fixed)
            subprocess.run(
                [pandoc_bin, "--from=markdown+raw_html", "--to=docx", "-o", out, inp],
                check=True, capture_output=True,
            )
            doc = Document(out)
            assert doc.tables, "应生成至少一个表格"
            assert len(doc.tables[0].rows) == 3, f"期望3行，实际{len(doc.tables[0].rows)}行（空 header 行被 pandoc 忽略）"


class TestStyleBindings:
    """StyleBindings 工具方法测试"""

    def test_font_display_name(self):
        """字体 ID 应转换为显示名称"""
        assert StyleBindings.font_display_name("FangSong_GB2312") == "仿宋_GB2312"
        assert StyleBindings.font_display_name("SimHei") == "黑体"
        assert StyleBindings.font_display_name("KaiTi_GB2312") == "楷体_GB2312"
        assert StyleBindings.font_display_name(None) == "微软雅黑"
        assert StyleBindings.font_display_name("UnknownFont") == "UnknownFont"

    def test_get_template_id(self):
        """模板 ID 获取"""
        assert StyleBindings.get_template_id("custom", None) == "custom"
        binding = {"templateId": "from-binding"}
        assert StyleBindings.get_template_id("default", binding) == "from-binding"
        assert StyleBindings.get_template_id("default", None) == "default"

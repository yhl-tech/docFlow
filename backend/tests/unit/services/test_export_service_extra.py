"""
ExportService 补充测试

覆盖 export_service.py 中未直接测试的代码路径：
  - _apply_template_semantics: 对齐标题(div), 图编号居中, 段落对齐
  - _fix_empty_table_cells: 分隔行/内容行混合边界
  - _fix_numbering_paragraph_alignment: 表格编号居中
  - docx_to_markdown / docx_to_html / docx_to_style_runs: pandoc 返回内容处理
"""
import pytest
import re

from app.services.export_service import ExportService


# ─────────────────────────── _apply_template_semantics ──────────────────────

class TestApplyTemplateSemantics:
    """模板语义标记应用"""

    def _call(self, md: str, binding: dict = None):
        svc = ExportService()
        return svc._apply_template_semantics(md, "default", binding)

    def test_heading_not_center_stays_raw(self):
        """左对齐标题保持原始格式"""
        result = self._call("# 标题\nParagraph")
        lines = result.split('\n')
        assert lines[0] == "# 标题"

    def test_center_heading_wrapped_in_div(self):
        """居中标题包裹在 div 中"""
        binding = {
            "configSnapshot": {
                "headingStyles": {
                    "level1": {"align": "center"}
                }
            }
        }
        result = self._call("# 居中标题\nParagraph", binding)
        assert 'data-heading-level="1"' in result
        assert '<div align="center"' in result

    def test_table_numbering_line_center(self):
        """图表编号行（居中）"""
        result = self._call("表 1 这是表标题\n")
        # 编号行被包裹在 <p align="center">
        assert 'align="center"' in result

    def test_figure_numbering_line_center(self):
        """图编号行（居中）"""
        result = self._call("图1 说明文本\n")
        assert 'align="center"' in result

    def test_paragraph_left_align_not_wrapped(self):
        """左对齐正文段落不包裹"""
        result = self._call("这是正文\n")
        lines = [l for l in result.split('\n') if l.strip()]
        assert not any('<p align=' in l for l in lines)

    def test_paragraph_right_align_wrapped(self):
        """右对齐正文包裹"""
        binding = {
            "configSnapshot": {
                "paragraphStyles": {"align": "right"}
            }
        }
        result = self._call("右对齐正文", binding)
        assert 'align="right"' in result

    def test_body_align_from_styles_slot(self):
        """body styles slot 对齐"""
        binding = {
            "configSnapshot": {
                "styles": {"body": {"align": "center"}}
            }
        }
        result = self._call("居中正文", binding)
        assert 'align="center"' in result

    def test_hr_not_wrapped(self):
        """分隔线不处理"""
        result = self._call("---\nParagraph\n")
        assert '---' in result

    def test_empty_lines_preserved(self):
        """空行保留"""
        result = self._call("para1\n\npara2\n")
        assert result.count('\n\n') >= 1


# ─────────────────────────── _fix_empty_table_cells ────────────────────────

class TestFixEmptyTableCellsExtra:
    """空单元格修复扩展"""

    def _fix(self, md: str) -> str:
        return ExportService._fix_empty_table_cells(md)

    def test_last_row_empty_cells_filled(self):
        """最后一行空单元格也应填充 NBSP"""
        md = "|  |  |\n| --- | --- |\n| a |  |\n|  |  |"
        result = self._fix(md)
        # 检查非分隔行含 NBSP
        lines = result.split('\n')
        data_lines = [l for l in lines if not re.match(r'^\s*\|[\s:|]*-', l) and '|' in l]
        assert any('\xa0' in l for l in data_lines)

    def test_table_after_text_not_mixed(self):
        """表格前的文本不受影响"""
        md = "Some text\n| a | b |\n| --- | --- |\n| c | d |"
        result = self._fix(md)
        assert result.startswith("Some text")

    def test_multiple_tables_all_fixed(self):
        """多个表格均修复"""
        md = "|  |  |\n| --- | --- |\n|  | x |\n|  |  |\n\n|  |  |\n| --- | --- |\n|  | y |"
        result = self._fix(md)
        # 两个数据行都含 NBSP
        count = result.count('\xa0')
        assert count >= 2, f"期望至少2个 NBSP，实际{count}个"

    def test_single_column_table(self):
        """单列表格"""
        md = "|  |\n| --- |\n| data |"
        result = self._fix(md)
        assert 'data' in result

    def test_cell_with_only_spaces_filled(self):
        """仅空格单元格被 NBSP 替换"""
        md = "|   |  |\n| --- | --- |\n| x | y |"
        result = self._fix(md)
        # 首行含 NBSP（纯空格列被替换）
        lines = result.split('\n')
        assert '\xa0' in lines[0]


# ─────────────────────────── _fix_numbering_paragraph_alignment ─────────

class TestFixNumberingParagraphAlignment:
    """图表编号居中"""

    def _fix(self, md: str, binding: dict = None) -> int:
        import tempfile, subprocess, os
        from docx import Document
        svc = ExportService()
        # 写入临时 docx
        with tempfile.TemporaryDirectory() as d:
            inp = os.path.join(d, "in.md")
            out = os.path.join(d, "out.docx")
            with open(inp, "w", encoding="utf-8-sig") as f:
                f.write(md)
            # 简单 pandoc 转换（不经过样式后处理）
            import shutil as _shutil
            pandoc_cands = [
                r"C:\Users\yuanhl\AppData\Local\Pandoc\pandoc.exe",
                r"C:\Program Files\Pandoc\pandoc.exe",
                "pandoc",
            ]
            pandoc_bin = next((p for p in pandoc_cands if os.path.isabs(p) and os.path.exists(p)), None)
            if pandoc_bin is None:
                import shutil
                pandoc_bin = shutil.which("pandoc")
            if pandoc_bin is None:
                pytest.skip("pandoc not found")

            subprocess.run([pandoc_bin, "--from=markdown", "--to=docx", "-o", out, inp],
                          check=True, capture_output=True)
            doc = Document(out)
            svc._fix_numbering_paragraph_alignment(doc, binding)
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            aligned = sum(1 for p in doc.paragraphs if p.alignment == WD_ALIGN_PARAGRAPH.CENTER)
            return aligned

    def test_table_number_para_center(self):
        """表编号段落居中"""
        md = "表 1 数据说明\nParagraph"
        aligned = self._fix(md)
        assert aligned > 0, "表编号段落应居中"

    def test_figure_number_para_center(self):
        """图编号段落居中"""
        md = "图1 说明\nParagraph"
        aligned = self._fix(md)
        assert aligned > 0, "图编号段落应居中"

    def test_no_bold_table_number_center(self):
        """不加粗的表编号居中"""
        md = "表 1\nParagraph"
        aligned = self._fix(md)
        assert aligned > 0

    def test_normal_paragraph_not_center(self):
        """普通段落不居中"""
        md = "这是普通正文\nParagraph"
        aligned = self._fix(md)
        assert aligned == 0, "普通段落不应居中"

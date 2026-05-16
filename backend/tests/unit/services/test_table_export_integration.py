"""
表格导出全链路集成测试

覆盖链路：
  markdown（tiptap-markdown 格式）
  → _fix_empty_table_cells
  → pandoc → docx
  → _postprocess_docx（NBSP 清除）
  → 最终单元格内容验证

需要真实 pandoc 可执行文件，若未安装则跳过。
"""
import os
import re
import shutil
import subprocess
import tempfile

import pytest

PANDOC_CANDIDATES = [
    r"C:\Users\yuanhl\AppData\Local\Pandoc\pandoc.exe",
    r"C:\Program Files\Pandoc\pandoc.exe",
    "pandoc",
]


def find_pandoc() -> str | None:
    for p in PANDOC_CANDIDATES:
        if os.path.isabs(p) and os.path.exists(p):
            return p
    return shutil.which("pandoc")


PANDOC = find_pandoc()

try:
    import docx as _docx  # noqa: F401
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

requires_pandoc = pytest.mark.skipif(
    PANDOC is None or not HAS_DOCX,
    reason="pandoc 未安装" if PANDOC is None else "python-docx 未安装",
)


# ────────────────────────────────────────────────────────────────────────────
# 复制生产代码的两个函数，保持与 export_service.py 完全一致
# ────────────────────────────────────────────────────────────────────────────

def fix_empty_table_cells(markdown: str) -> str:
    NBSP = "\xa0"
    SEP_RE = re.compile(r"^\s*\|[\s:|]*-[\s\-:|]*\|\s*$")
    TABLE_RE = re.compile(r"^\s*\|")
    lines = markdown.split("\n")
    result = []
    for line in lines:
        if SEP_RE.match(line):
            result.append(line)
            continue
        if TABLE_RE.match(line):
            cells = line.strip().strip("|").split("|")
            filled = [c if c.strip() else f" {NBSP} " for c in cells]
            result.append("|" + "|".join(filled) + "|")
            continue
        result.append(line)
    return "\n".join(result)


def clear_nbsp_from_docx(doc) -> None:
    """模拟 _postprocess_docx 中的 NBSP 清除步骤"""
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    for run in para.runs:
                        if run.text == "\xa0":
                            run.text = ""


def pandoc_md_to_docx(md: str) -> "Document":
    """调用 pandoc 把 markdown 转为 docx，返回 python-docx Document"""
    from docx import Document

    with tempfile.TemporaryDirectory() as d:
        inp = os.path.join(d, "input.md")
        out = os.path.join(d, "output.docx")
        with open(inp, "w", encoding="utf-8-sig") as f:
            f.write(md)
        subprocess.run(
            [
                PANDOC,
                "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                "--to=docx",
                "-o",
                out,
                inp,
            ],
            check=True,
            capture_output=True,
        )
        return Document(out)


# ────────────────────────────────────────────────────────────────────────────
# 场景测试
# ────────────────────────────────────────────────────────────────────────────

class TestFixEmptyTableCellsUnit:
    """_fix_empty_table_cells 纯逻辑单元测试（无 pandoc）"""

    def test_empty_header_filled_with_nbsp(self):
        md = "|  |  |  |\n| --- | --- | --- |\n|  | data |  |\n"
        result = fix_empty_table_cells(md)
        lines = result.split("\n")
        assert "\xa0" in lines[0], "空 header 行应含 NBSP"

    def test_separator_row_unchanged(self):
        md = "|  |  |\n| --- | --- |\n|  |  |\n"
        result = fix_empty_table_cells(md)
        assert "| --- | --- |" in result

    def test_cell_with_content_not_modified(self):
        md = "| a | b |\n| --- | --- |\n| hello | world |\n"
        result = fix_empty_table_cells(md)
        assert "hello" in result and "world" in result

    def test_empty_row_not_treated_as_separator(self):
        """全空行 `| | | |` 不能被识别为分隔行"""
        SEP_RE = re.compile(r"^\s*\|[\s:|]*-[\s\-:|]*\|\s*$")
        assert not SEP_RE.match("|  |  |  |")
        assert not SEP_RE.match("| | | |")

    def test_nbsp_stripped_by_python_strip(self):
        """Python str.strip() 会去掉 NBSP（\\xa0 是空白字符）
        因此 fix 函数中用 c.strip() 判断单元格是否为空时，
        填充了 NBSP 的单元格（' \\xa0 '）.strip() 结果是 '\\xa0'，
        仍然非空，不会被二次填充 — 但这说明 NBSP 不是完全透明的。
        关键是：填充后 pandoc 能识别为非空行，postprocess 后清除即可。
        """
        nbsp = "\xa0"
        cell_already_filled = f" {nbsp} "
        # Python strip() 确实会去掉 NBSP，这是已知行为
        assert cell_already_filled.strip() == ""
        # 所以判断"单元格是否含有效内容"不能用 strip()，
        # 但 fix 函数在 pandoc 输入前运行，NBSP 填充后单元格对 pandoc 是非空的，
        # 这才是关键，与 Python strip 行为无关
        assert nbsp in cell_already_filled  # 填充后 NBSP 确实在字符串里

    def test_multirow_table(self):
        md = "\n".join([
            "|  |  |  |  |  |  |",
            "| --- | --- | --- | --- | --- | --- |",
            "|  |  | DATA |  |  |  |",
            "|  |  |  |  |  |  |",
            "",
        ])
        result = fix_empty_table_cells(md)
        lines = [l for l in result.split("\n") if l.strip().startswith("|")]
        # 分隔行原样
        sep = [l for l in lines if re.match(r"^\s*\|[\s:|]*-[\s\-:|]*\|\s*$", l)]
        assert len(sep) == 1
        # DATA 在正确位置
        data_line = [l for l in lines if "DATA" in l]
        assert len(data_line) == 1
        cells = data_line[0].strip().strip("|").split("|")
        assert cells[2].strip() == "DATA"


@requires_pandoc
class TestPandocTableIntegration:
    """真实调用 pandoc 的集成测试"""

    def test_empty_header_preserved_as_row(self):
        """fix 后 pandoc 应保留空 header 行，不忽略"""
        md = fix_empty_table_cells(
            "|  |  |  |\n| --- | --- | --- |\n|  | cell |  |\n|  |  |  |\n"
        )
        doc = pandoc_md_to_docx(md)
        assert doc.tables, "应生成表格"
        assert len(doc.tables[0].rows) == 3, (
            f"期望 3 行（1 header + 2 data），实际 {len(doc.tables[0].rows)} 行"
        )

    def test_data_cell_in_correct_position(self):
        """有内容的单元格在 fix + pandoc 后仍在正确列"""
        md = fix_empty_table_cells(
            "|  |  |  |  |  |  |\n"
            "| --- | --- | --- | --- | --- | --- |\n"
            "|  |  | DATA |  |  |  |\n"
        )
        doc = pandoc_md_to_docx(md)
        row1 = doc.tables[0].rows[1]
        texts = [c.text for c in row1.cells]
        assert any("DATA" in t for t in texts), f"DATA 应在数据行：{texts}"
        data_idx = next(i for i, t in enumerate(texts) if "DATA" in t)
        assert data_idx == 2, f"DATA 应在第 3 列（index 2），实际在 index {data_idx}"

    def test_nbsp_cleared_after_postprocess(self):
        """postprocess 清除 NBSP 后，所有单元格不含 \\xa0"""
        md = fix_empty_table_cells(
            "|  |  |  |  |  |  |\n"
            "| --- | --- | --- | --- | --- | --- |\n"
            "|  |  | DATA |  |  |  |\n"
            "|  |  |  |  |  |  |\n"
        )
        doc = pandoc_md_to_docx(md)
        clear_nbsp_from_docx(doc)

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    assert "\xa0" not in cell.text, (
                        f"清除后单元格仍含 NBSP：{repr(cell.text)}"
                    )

    def test_no_em_dash_in_cells(self):
        """最终单元格不含 em dash（—）"""
        md = fix_empty_table_cells(
            "|  |  |  |\n| --- | --- | --- |\n|  | data |  |\n"
        )
        doc = pandoc_md_to_docx(md)
        clear_nbsp_from_docx(doc)

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    assert "—" not in cell.text, (
                        f"单元格含 em dash：{repr(cell.text)}"
                    )
                    assert "—" not in cell.text

    def test_table_with_mixed_content(self):
        """表格有内容、空格混合时，内容不丢失、不错位"""
        md = fix_empty_table_cells(
            "| 姓名 | 年龄 | 备注 |\n"
            "| --- | --- | --- |\n"
            "|  | 25 |  |\n"
            "| 张三 |  | 无 |\n"
        )
        doc = pandoc_md_to_docx(md)
        clear_nbsp_from_docx(doc)

        rows = doc.tables[0].rows
        assert len(rows) == 3

        # header row
        header_texts = [c.text.strip() for c in rows[0].cells]
        assert "姓名" in header_texts
        assert "年龄" in header_texts
        assert "备注" in header_texts

        # data row 1: col1 空, col2=25, col3 空
        r1 = [c.text.strip() for c in rows[1].cells]
        assert r1[1] == "25"
        assert r1[0] == ""
        assert r1[2] == ""

        # data row 2: col1=张三, col2 空, col3=无
        r2 = [c.text.strip() for c in rows[2].cells]
        assert r2[0] == "张三"
        assert r2[1] == ""
        assert r2[2] == "无"

    def test_multiple_tables(self):
        """文档含多个表格时，每个表格都正确处理"""
        md = fix_empty_table_cells(
            "第一个表格\n\n"
            "|  | A |\n"
            "| --- | --- |\n"
            "|  | B |\n\n"
            "第二个表格\n\n"
            "| X |  |\n"
            "| --- | --- |\n"
            "| Y |  |\n"
        )
        doc = pandoc_md_to_docx(md)
        clear_nbsp_from_docx(doc)

        assert len(doc.tables) == 2, f"应有 2 个表格，实际 {len(doc.tables)}"
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    assert "—" not in cell.text
                    assert "\xa0" not in cell.text

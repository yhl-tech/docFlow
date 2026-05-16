"""
表格样式 DOCX XML 断言测试

验证 DocxStyler.apply_docx_table_styles() 应用后 XML 正确：
  - 单元格内边距 (w:tcMar)
  - 表头背景色 (w:shd)
  - 表头/数据行字体 (w:rFonts)
  - 行高 (w:trHeight)
"""
import pytest
from docx.oxml.ns import qn

from app.services.export.docx_styler import DocxStyler


# ─────────────────────────── helpers ────────────────────────────────────────

def _get_tcPr(cell):
    return cell._element.find(qn("w:tcPr"))


def _get_cell_shading(cell):
    tcPr = _get_tcPr(cell)
    return None if tcPr is None else tcPr.find(qn("w:shd"))


def _get_cell_margin_side(cell, side: str):
    tcPr = _get_tcPr(cell)
    if tcPr is None:
        return None
    mar = tcPr.find(qn("w:tcMar"))
    if mar is None:
        return None
    return mar.find(qn(f"w:{side}"))


def _get_row_height_rule(row):
    trPr = row._element.find(qn("w:trPr"))
    return None if trPr is None else trPr.find(qn("w:trHeight"))


def _get_run_font_eastasia(cell):
    for para in cell.paragraphs:
        for run in para.runs:
            rPr = run._element.find(qn("w:rPr"))
            if rPr is not None:
                rFonts = rPr.find(qn("w:rFonts"))
                if rFonts is not None:
                    return rFonts.get(qn("w:eastAsia"))
    return None


# ─────────────────────────── fixtures ───────────────────────────────────────

@pytest.fixture
def binding_table_full():
    """完整表格配置：表头背景、字体、单元格内边距、行高"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "tableStyles": {
                "headerStyle": {
                    "font": {"fontFamily": "SimHei", "fontSizePt": 12, "bold": True},
                    "shading": {"fill": "#003366"},
                    "align": "center",
                    "valign": "center",
                },
                "dataRowStyle": {
                    "font": {"fontFamily": "FangSong_GB2312", "fontSizePt": 11},
                    "align": "left",
                    "valign": "top",
                },
                "cellPadding": {
                    "top": 0.1,
                    "bottom": 0.1,
                    "left": 0.2,
                    "right": 0.2,
                },
                "rowHeight": {
                    "headerHeightCm": 1.0,
                    "dataRowHeightCm": 0.8,
                },
            },
            "layout": {"paperSize": "A4"},
        },
    }


@pytest.fixture
def binding_table_minimal():
    """最小表格配置：仅单元格内边距"""
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "tableStyles": {
                "cellPadding": {
                    "top": 0.14,
                    "bottom": 0.14,
                    "left": 0.0,
                    "right": 0.0,
                },
            },
            "layout": {"paperSize": "A4"},
        },
    }


# ─────────────────────────── tests ──────────────────────────────────────────

class TestTableCellPadding:
    """单元格内边距应写入 w:tcMar"""

    def test_cell_padding_top_sets_tcmar_top(self, make_docx_with_table, binding_table_minimal):
        doc = make_docx_with_table(rows=2, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_minimal)

        cell = doc.tables[0].rows[0].cells[0]
        top_elem = _get_cell_margin_side(cell, "top")
        assert top_elem is not None, "应写入 w:top 内边距"
        w_val = top_elem.get(qn("w:w"))
        assert w_val is not None
        # 0.14 cm → int(0.14 * 567) = 79
        assert int(w_val) == int(0.14 * 567), f"0.14cm → {int(0.14*567)} dxa，实际={w_val}"

    def test_cell_padding_left_sets_tcmar_left(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=2, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        cell = doc.tables[0].rows[0].cells[0]
        left_elem = _get_cell_margin_side(cell, "left")
        assert left_elem is not None, "应写入 w:left 内边距"
        w_val = left_elem.get(qn("w:w"))
        assert int(w_val) == int(0.2 * 567), f"0.2cm → {int(0.2*567)} dxa，实际={w_val}"

    def test_cell_padding_type_is_dxa(self, make_docx_with_table, binding_table_minimal):
        doc = make_docx_with_table(rows=2, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_minimal)

        cell = doc.tables[0].rows[0].cells[0]
        top_elem = _get_cell_margin_side(cell, "top")
        assert top_elem is not None
        assert top_elem.get(qn("w:type")) == "dxa", "内边距单位应为 dxa"


class TestTableHeaderShading:
    """表头行背景色应写入 w:shd"""

    def test_header_shading_fill_003366(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=3, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        header_cell = doc.tables[0].rows[0].cells[0]
        shd = _get_cell_shading(header_cell)
        assert shd is not None, "表头应写入 w:shd"
        fill = shd.get(qn("w:fill"))
        assert fill is not None and fill.upper() == "003366", f"实际={fill}"


class TestTableHeaderFont:
    """表头行字体应写入 w:rFonts"""

    def test_header_font_simhei_sets_rfont_east_asia(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=3, cols=2)
        # 在表头单元格中添加文本和 run
        for cell in doc.tables[0].rows[0].cells:
            cell.paragraphs[0].add_run("header")
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        header_cell = doc.tables[0].rows[0].cells[0]
        east_asia = _get_run_font_eastasia(header_cell)
        assert east_asia == "黑体", f"SimHei → 黑体，实际={east_asia}"


class TestTableDataRowFont:
    """数据行字体应写入 w:rFonts"""

    def test_data_row_font_fangsong_sets_rfont(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=3, cols=2)
        for row in doc.tables[0].rows[1:]:
            for cell in row.cells:
                cell.paragraphs[0].add_run("data")
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        data_cell = doc.tables[0].rows[1].cells[0]
        east_asia = _get_run_font_eastasia(data_cell)
        assert east_asia == "仿宋_GB2312", f"FangSong_GB2312 → 仿宋_GB2312，实际={east_asia}"


class TestTableRowHeight:
    """行高应写入 w:trHeight"""

    def test_header_row_height_1cm(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=3, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        header_row = doc.tables[0].rows[0]
        trH = _get_row_height_rule(header_row)
        assert trH is not None, "表头行应写入 w:trHeight"
        val = trH.get(qn("w:val"))
        assert val is not None
        # 1.0cm → int(1.0 * 567) = 567 dxa
        assert int(val) == int(1.0 * 567), f"1.0cm → 567 dxa，实际={val}"

    def test_data_row_height_08cm(self, make_docx_with_table, binding_table_full):
        doc = make_docx_with_table(rows=3, cols=2)
        styler = DocxStyler()
        styler.apply_docx_table_styles(doc, template_binding=binding_table_full)

        data_row = doc.tables[0].rows[1]
        trH = _get_row_height_rule(data_row)
        assert trH is not None, "数据行应写入 w:trHeight"
        val = trH.get(qn("w:val"))
        assert int(val) == int(0.8 * 567), f"0.8cm → {int(0.8*567)} dxa，实际={val}"

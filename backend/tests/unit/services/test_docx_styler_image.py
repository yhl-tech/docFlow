"""
图片样式 DOCX 全链路测试

测试策略：
  - 复制生产代码中的 recolor / size-limit / numbering 纯逻辑，做单元测试
  - 需要 python-docx 的集成测试通过 @requires_docx 跳过

覆盖链路：
  template_binding.imageStyles
  → apply_docx_image_styles（recolor / size / align）
  → apply_docx_image_numbering（题注）
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

def get_image_styles(template_binding) -> dict:
    if not template_binding:
        return {}
    snapshot = template_binding.get("configSnapshot") or {}
    return snapshot.get("imageStyles") or {}


def compute_new_extent(cx: int, cy: int, max_width_cm: float | None,
                       max_height_cm: float | None, keep_aspect: bool) -> tuple[int, int]:
    """maxLimit 模式：根据约束缩放 cx/cy（EMU 单位，1 cm = 914400 EMU）"""
    max_cx = int(max_width_cm * 914400) if max_width_cm else None
    max_cy = int(max_height_cm * 914400) if max_height_cm else None
    new_cx, new_cy = cx, cy
    if max_cx and cx > max_cx:
        scale = max_cx / cx
        new_cx = max_cx
        if keep_aspect:
            new_cy = int(cy * scale)
    if max_cy and new_cy > max_cy:
        scale = max_cy / new_cy
        new_cy = max_cy
        if keep_aspect:
            new_cx = int(new_cx * scale)
    return new_cx, new_cy


def generate_caption_text(prefix: str, index: int, suffix: str) -> str:
    return f"{prefix}{index}{suffix}"


def recolor_action(recolor: str) -> str:
    """返回 recolor 模式对应的 DrawingML 操作描述，用于断言"""
    if recolor == "grayscale":
        return "insert:a:grayscl"
    if recolor == "washout":
        return "insert:a:lum(70000,-70000)"
    return "noop"


# ────────────────────────────────────────────────────────────────────────────
# 单元测试（无 python-docx 依赖）
# ────────────────────────────────────────────────────────────────────────────

class TestImageStyleExtraction:
    """get_image_styles 提取逻辑"""

    def test_empty_binding_returns_empty(self):
        assert get_image_styles(None) == {}

    def test_image_styles_extracted(self):
        binding = {
            "configSnapshot": {
                "imageStyles": {"position": {"wrapType": "inline"}, "style": {"recolor": "grayscale"}},
            }
        }
        styles = get_image_styles(binding)
        assert styles["position"]["wrapType"] == "inline"
        assert styles["style"]["recolor"] == "grayscale"

    def test_missing_image_styles_returns_empty(self):
        binding = {"configSnapshot": {"styles": {}}}
        assert get_image_styles(binding) == {}


class TestImageSizeLimitLogic:
    """maxLimit 缩放逻辑（纯数学）"""

    def test_over_max_width_scaled_down(self):
        cx_orig = int(5 * 914400)
        cy_orig = int(3 * 914400)
        new_cx, new_cy = compute_new_extent(cx_orig, cy_orig, max_width_cm=3.0,
                                            max_height_cm=None, keep_aspect=True)
        assert new_cx == int(3.0 * 914400), "cx 应缩放到 3cm"
        expected_cy = int(cy_orig * (3.0 / 5.0))
        assert abs(new_cy - expected_cy) < 2, f"cy 应等比缩放，期望≈{expected_cy}，实际={new_cy}"

    def test_within_limit_not_scaled(self):
        cx_orig = int(5 * 914400)
        cy_orig = int(3 * 914400)
        new_cx, new_cy = compute_new_extent(cx_orig, cy_orig, max_width_cm=10.0,
                                            max_height_cm=None, keep_aspect=True)
        assert new_cx == cx_orig
        assert new_cy == cy_orig

    def test_keep_aspect_false_width_only(self):
        cx_orig = int(5 * 914400)
        cy_orig = int(3 * 914400)
        new_cx, new_cy = compute_new_extent(cx_orig, cy_orig, max_width_cm=2.0,
                                            max_height_cm=None, keep_aspect=False)
        assert new_cx == int(2.0 * 914400)
        assert new_cy == cy_orig  # 不保持比例，cy 不变

    def test_max_height_constrains_cy(self):
        cx_orig = int(5 * 914400)
        cy_orig = int(3 * 914400)
        new_cx, new_cy = compute_new_extent(cx_orig, cy_orig, max_width_cm=None,
                                            max_height_cm=1.0, keep_aspect=True)
        assert new_cy == int(1.0 * 914400)
        expected_cx = int(cx_orig * (1.0 / 3.0))
        assert abs(new_cx - expected_cx) < 2

    def test_both_constraints_most_restrictive_wins(self):
        cx_orig = int(5 * 914400)
        cy_orig = int(5 * 914400)  # 正方形
        # maxWidth=4cm, maxHeight=2cm → height 更严格
        new_cx, new_cy = compute_new_extent(cx_orig, cy_orig, max_width_cm=4.0,
                                            max_height_cm=2.0, keep_aspect=True)
        assert new_cy <= int(2.0 * 914400)
        assert new_cx <= int(4.0 * 914400)


class TestImageRecolorLogic:
    """recolor 模式映射"""

    def test_grayscale_maps_to_insert_grayscl(self):
        assert recolor_action("grayscale") == "insert:a:grayscl"

    def test_washout_maps_to_insert_lum(self):
        assert recolor_action("washout") == "insert:a:lum(70000,-70000)"

    def test_none_is_noop(self):
        assert recolor_action("none") == "noop"

    def test_unknown_is_noop(self):
        assert recolor_action("sepia") == "noop"  # sepia 未在此实现，安全回退


class TestImageCaptionLogic:
    """题注文字生成"""

    def test_default_prefix(self):
        assert generate_caption_text("图", 1, "") == "图1"

    def test_custom_prefix_suffix(self):
        assert generate_caption_text("Figure", 3, ".") == "Figure3."

    def test_multiple_images_sequential(self):
        captions = [generate_caption_text("图", i + 1, "") for i in range(3)]
        assert captions == ["图1", "图2", "图3"]


# ────────────────────────────────────────────────────────────────────────────
# python-docx 集成测试（需要 python-docx）
# ────────────────────────────────────────────────────────────────────────────

def _make_doc_with_image():
    from docx import Document
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from lxml import etree

    doc = Document()
    para = doc.add_paragraph()
    run = para.add_run()
    run_elem = run._element

    # WordProcessingML elements: python-docx OxmlElement handles prefix resolution
    drawing = OxmlElement("w:drawing")
    inline = OxmlElement("wp:inline")
    inline.set("distT", "0")
    inline.set("distB", "0")
    inline.set("distL", "0")
    inline.set("distR", "0")

    extent = OxmlElement("wp:extent")
    extent.set("cx", str(int(5 * 914400)))
    extent.set("cy", str(int(3 * 914400)))
    inline.append(extent)

    # DrawingML elements (a: / pic:): use lxml etree with Clark notation
    # since python-docx OxmlElement cannot parse {ns}tag notation
    A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
    PIC = "{http://schemas.openxmlformats.org/drawingml/2006/picture}"

    graphic = etree.SubElement(inline, f"{A}graphic")
    graphicData = etree.SubElement(graphic, f"{A}graphicData")
    graphicData.set("uri", "http://schemas.openxmlformats.org/drawingml/2006/picture")
    pic_pic = etree.SubElement(graphicData, f"{PIC}pic")
    blipFill = etree.SubElement(pic_pic, f"{PIC}blipFill")
    blip = etree.SubElement(blipFill, f"{A}blip")

    drawing.append(inline)
    run_elem.append(drawing)
    return doc


def _img_binding(image_styles: dict) -> dict:
    return {
        "templateId": "test",
        "appliedAt": "2026-05-16T00:00:00Z",
        "configSnapshot": {
            "styles": {"body": {"fontFamily": "SimSun", "fontSizePt": 12}},
            "imageStyles": image_styles,
            "layout": {"paperSize": "A4"},
        },
    }


@requires_docx
class TestDocxImageAlign:
    """水平对齐写入 paragraph.alignment"""

    def test_center_align(self):
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        DocxStyler().apply_docx_image_styles(doc, _img_binding({
            "position": {"wrapType": "inline", "horizontalAlign": "center"},
        }))
        assert doc.paragraphs[0].alignment == WD_ALIGN_PARAGRAPH.CENTER

    def test_right_align(self):
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        DocxStyler().apply_docx_image_styles(doc, _img_binding({
            "position": {"wrapType": "inline", "horizontalAlign": "right"},
        }))
        assert doc.paragraphs[0].alignment == WD_ALIGN_PARAGRAPH.RIGHT


@requires_docx
class TestDocxImageRecolor:
    """recolor 应写入 a:blip 子元素"""

    A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

    def _blip(self, doc):
        from docx.oxml.ns import qn
        run_elem = doc.paragraphs[0].runs[0]._element
        drawing = run_elem.find(qn("w:drawing"))
        inline = drawing.find(qn("wp:inline"))
        return inline.find(f".//{{{self.A_NS}}}blip")

    def test_grayscale_inserts_grayscl(self):
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        DocxStyler().apply_docx_image_styles(doc, _img_binding({
            "position": {"wrapType": "inline"},
            "style": {"recolor": "grayscale"},
        }))
        blip = self._blip(doc)
        assert blip is not None
        assert blip.find(f"{{{self.A_NS}}}grayscl") is not None

    def test_washout_inserts_lum(self):
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        DocxStyler().apply_docx_image_styles(doc, _img_binding({
            "position": {"wrapType": "inline"},
            "style": {"recolor": "washout"},
        }))
        blip = self._blip(doc)
        lum = blip.find(f"{{{self.A_NS}}}lum")
        assert lum is not None
        assert lum.get("bright") == "70000"
        assert lum.get("contrast") == "-70000"


@requires_docx
class TestDocxImageNumbering:
    """题注编号集成"""

    def test_enabled_inserts_caption(self):
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        DocxStyler().apply_docx_image_numbering(doc, _img_binding({
            "numbering": {"enabled": True, "prefix": "图", "suffix": "", "align": "center"},
        }))
        assert any("图1" in p.text for p in doc.paragraphs)

    def test_disabled_no_caption(self):
        from app.services.export.docx_styler import DocxStyler
        doc = _make_doc_with_image()
        count = len(doc.paragraphs)
        DocxStyler().apply_docx_image_numbering(doc, _img_binding({"numbering": {"enabled": False}}))
        assert len(doc.paragraphs) == count

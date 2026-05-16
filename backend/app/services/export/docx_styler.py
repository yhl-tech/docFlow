"""
DOCX 样式应用模块

负责在 pandoc 生成 docx 后进行样式后处理：
- 字体设置（中英文、CJK 字体）
- 图片样式（对齐、边框、间距、文字环绕）
- 页眉页脚
- 页码
"""

from typing import Any, Optional

from app.core.logging import get_logger

_log = get_logger(__name__)


class DocxStyler:
    """DOCX 样式应用器"""

    # Word 样式 ID 映射
    WORD_STYLE_ID_MAP: dict[str, str] = {
        "Heading1": "Heading 1",
        "Heading2": "Heading 2",
        "Heading3": "Heading 3",
        "Heading4": "Heading 4",
        "Heading5": "Heading 5",
        "Heading6": "Heading 6",
        "Title": "Title",
        "Subtitle": "Subtitle",
    }

    # 字体 ID 到显示名称映射
    FONT_ID_TO_NAME: dict[str, str] = {
        "FangSong_GB2312": "仿宋_GB2312",
        "FangSong": "仿宋",
        "STFangsong": "华文仿宋",
        "SimHei": "黑体",
        "HuaWenHeiTi": "华文黑体",
        "Microsoft YaHei": "微软雅黑",
        "DengXian": "等线",
        "KaiTi_GB2312": "楷体_GB2312",
        "KaiTi": "楷体",
        "STKaiti": "华文楷体",
        "FZXiaoBiaoSong": "方正小标宋",
        "SimSun": "宋体",
        "NSimSun": "新宋体",
        "STSong": "华文宋体",
        "STZhongsong": "华文中宋",
    }

    @staticmethod
    def font_display_name(font_id: str | None, fallback: str = "微软雅黑") -> str:
        """将字体 ID 转换为显示名称"""
        if not font_id:
            return fallback
        return DocxStyler.FONT_ID_TO_NAME.get(font_id, font_id)

    # ------------------------------------------------------------------ #
    #  工具方法
    # ------------------------------------------------------------------ #

    @staticmethod
    def _set_rpr_color_black(rPr_elem) -> None:
        """将 w:rPr 文字颜色设为纯黑"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        for c in list(rPr_elem):
            if c.tag == qn("w:color"):
                rPr_elem.remove(c)
        color_elem = OxmlElement("w:color")
        color_elem.set(qn("w:val"), "000000")
        rPr_elem.append(color_elem)

    # ------------------------------------------------------------------ #
    #  字体应用
    # ------------------------------------------------------------------ #

    def apply_docx_font(
        self,
        docx_path: str,
        cjk_font: str = "Microsoft YaHei",
        template_binding: Optional[dict[str, Any]] = None,
        doc=None,
    ) -> None:
        """
        Post-process pandoc 生成的 docx，将默认字体设置为指定字体，
        并将标题与正文颜色统一为黑色。
        可以传入已有的 doc 对象以避免重复加载文件。
        """
        try:
            from docx import Document
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
            from docx.shared import Pt
        except ImportError:
            _log.warning("python-docx 未安装，跳过字体设置")
            return

        from app.services.export.bindings import StyleBindings

        try:
            if doc is None:
                doc = Document(docx_path)
            styles_cfg = StyleBindings.get_styles(template_binding)
            layout_cfg = StyleBindings.get_layout(template_binding)

            body_cfg = styles_cfg.get("body", {})
            title_cfg = styles_cfg.get("document_title", {})
            subtitle_cfg = styles_cfg.get("document_subtitle", {})
            heading1_cfg = styles_cfg.get("heading_1", {})
            heading2_cfg = styles_cfg.get("heading_2", {})
            heading3_cfg = styles_cfg.get("heading_3", {})
            heading4_cfg = styles_cfg.get("heading_4", {})
            heading5_cfg = styles_cfg.get("heading_5", {})

            # 合并 headingStyles（键名为 h1/h2/.../h6，与前端 TemplateConfig.headingStyles 一致）
            hs_cfg = StyleBindings.get_heading_styles(template_binding)

            def _merge_hs(base: dict, hs: dict) -> dict:
                """将 HeadingStyleConfig 合并到 styles slot，font 子字段展平"""
                font = hs.get("font") or {}
                merged = {**base}
                if font.get("fontFamily"):
                    merged["fontFamily"] = font["fontFamily"]
                if font.get("fontSizePt"):
                    merged["fontSizePt"] = font["fontSizePt"]
                if font.get("bold") is not None:
                    merged["bold"] = font["bold"]
                if font.get("italic") is not None:
                    merged["italic"] = font["italic"]
                if font.get("color"):
                    merged["color"] = font["color"]
                # 顶层字段直接覆盖
                for k in ("align", "lineHeight", "spacingBeforePt", "spacingAfterPt",
                          "firstLineIndentChars", "leftIndentChars", "outlineLevel"):
                    if hs.get(k) is not None:
                        merged[k] = hs[k]
                return merged

            if hs_cfg.get("h1"):
                heading1_cfg = _merge_hs(heading1_cfg, hs_cfg["h1"])
            if hs_cfg.get("h2"):
                heading2_cfg = _merge_hs(heading2_cfg, hs_cfg["h2"])
            if hs_cfg.get("h3"):
                heading3_cfg = _merge_hs(heading3_cfg, hs_cfg["h3"])
            if hs_cfg.get("h4"):
                heading4_cfg = _merge_hs(heading4_cfg, hs_cfg["h4"])
            if hs_cfg.get("h5"):
                heading5_cfg = _merge_hs(heading5_cfg, hs_cfg["h5"])
            heading6_cfg = hs_cfg.get("h6", {})

            default_cjk_font = self.font_display_name(body_cfg.get("fontFamily"), cjk_font)
            default_body_size = body_cfg.get("fontSizePt", 12)
            default_line_height = layout_cfg.get("defaultLineHeight") or body_cfg.get("lineHeight", 1.75)
            default_first_indent = layout_cfg.get("defaultFirstLineIndentChars")
            if default_first_indent is None:
                default_first_indent = body_cfg.get("firstLineIndentChars", 0)

            # 正文对齐（paragraphStyles 优先，其次 body styles slot）
            para_styles_cfg = StyleBindings.get_paragraph_styles(template_binding)
            default_body_align = para_styles_cfg.get("align") or body_cfg.get("align")
            _body_align_map = {"left": "left", "center": "center", "right": "right", "justify": "both"}
            # 正文段落段前段后（paragraphStyles 优先，其次 layout 默认值）
            default_para_before = para_styles_cfg.get("spacingBeforePt") if para_styles_cfg.get("spacingBeforePt") is not None \
                else layout_cfg.get("defaultParagraphSpacingBeforePt")
            default_para_after = para_styles_cfg.get("spacingAfterPt") if para_styles_cfg.get("spacingAfterPt") is not None \
                else layout_cfg.get("defaultParagraphSpacingAfterPt")

            # 样式字体映射
            _style_font_map: dict[str, str] = {
                "Normal": default_cjk_font,
                "Subtitle": self.font_display_name(subtitle_cfg.get("fontFamily"), default_cjk_font),
                "Title": self.font_display_name(title_cfg.get("fontFamily"), default_cjk_font),
                "Heading 1": self.font_display_name(heading1_cfg.get("fontFamily"), default_cjk_font),
                "Heading 2": self.font_display_name(heading2_cfg.get("fontFamily"), default_cjk_font),
                "Heading 3": self.font_display_name(heading3_cfg.get("fontFamily"), default_cjk_font),
                "Heading 4": self.font_display_name(heading4_cfg.get("fontFamily"), default_cjk_font),
                "Heading 5": self.font_display_name(heading5_cfg.get("fontFamily"), default_cjk_font),
            }

            # 英文单独字体配置
            english_font_cfg = {}
            if template_binding:
                cfg = template_binding.get("configSnapshot") or {}
                english_font_cfg = cfg.get("englishFont") or {}
            use_english_font = english_font_cfg.get("useSeparateFont", False)
            english_font_family = english_font_cfg.get("fontFamily", "Times New Roman")

            def _to_bool(val, default=False):
                if val is None:
                    return default
                if isinstance(val, bool):
                    return val
                if isinstance(val, str):
                    return val.lower() in ("true", "1", "yes", "on")
                return bool(val)

            _style_bold_map: dict[str, bool] = {
                "Normal": _to_bool(body_cfg.get("bold"), False),
                "Subtitle": _to_bool(subtitle_cfg.get("bold"), False),
                "Title": _to_bool(title_cfg.get("bold"), False),
                "Heading 1": _to_bool(heading1_cfg.get("bold"), True),
                "Heading 2": _to_bool(heading2_cfg.get("bold"), True),
                "Heading 3": _to_bool(heading3_cfg.get("bold"), False),
                "Heading 4": _to_bool(heading4_cfg.get("bold"), False),
                "Heading 5": _to_bool(heading5_cfg.get("bold"), False),
                "Heading 6": _to_bool((heading6_cfg.get("font") or {}).get("bold", False), False),
            }
            _style_size_map: dict[str, float] = {
                "Normal": float(default_body_size),
                "Subtitle": float(subtitle_cfg.get("fontSizePt", default_body_size)),
                "Title": float(title_cfg.get("fontSizePt", default_body_size)),
                "Heading 1": float(heading1_cfg.get("fontSizePt", default_body_size)),
                "Heading 2": float(heading2_cfg.get("fontSizePt", default_body_size)),
                "Heading 3": float(heading3_cfg.get("fontSizePt", default_body_size)),
                "Heading 4": float(heading4_cfg.get("fontSizePt", default_body_size)),
                "Heading 5": float(heading5_cfg.get("fontSizePt", default_body_size)),
            }

            def _para_style_name(run_elem) -> str:
                parent = run_elem.getparent()
                para = parent if (parent is not None and parent.tag == qn("w:p")) else (
                    parent.getparent() if parent is not None else None
                )
                if para is None or para.tag != qn("w:p"):
                    return "Normal"
                pPr = para.find(qn("w:pPr"))
                if pPr is None:
                    return "Normal"
                pStyle = pPr.find(qn("w:pStyle"))
                if pStyle is None:
                    return "Normal"
                style_id = pStyle.get(qn("w:val"), "")
                return self.WORD_STYLE_ID_MAP.get(style_id, "Normal")

            def set_font_properties(rPr_elem, east_asia: str, ascii: str = None, h_ansi: str = None, bold: bool = None, italic: bool = None, color: str = None):
                rFonts_elem = rPr_elem.find(qn("w:rFonts"))
                if rFonts_elem is None:
                    rFonts_elem = OxmlElement("w:rFonts")
                    rPr_elem.insert(0, rFonts_elem)
                rFonts_elem.set(qn("w:eastAsia"), east_asia)
                if ascii:
                    rFonts_elem.set(qn("w:ascii"), ascii)
                if h_ansi:
                    rFonts_elem.set(qn("w:hAnsi"), h_ansi)

                if bold is not None:
                    for tag_name in ("w:b", "w:bCs"):
                        elem = rPr_elem.find(qn(tag_name))
                        if elem is None:
                            elem = OxmlElement(tag_name)
                            rPr_elem.append(elem)
                        elem.set(qn("w:val"), "1" if bold else "0")

                if italic is not None:
                    for tag_name in ("w:i", "w:iCs"):
                        elem = rPr_elem.find(qn(tag_name))
                        if elem is None:
                            elem = OxmlElement(tag_name)
                            rPr_elem.append(elem)
                        elem.set(qn("w:val"), "1" if italic else "0")

                if color:
                    elem = rPr_elem.find(qn("w:color"))
                    if elem is None:
                        elem = OxmlElement("w:color")
                        rPr_elem.append(elem)
                    elem.set(qn("w:val"), color.lstrip("#"))

            # 设置文档默认字体（docDefaults）
            rPr_default = doc.styles.element.find(qn("w:docDefaults"))
            if rPr_default is not None:
                rPr_child = rPr_default.find(qn("w:rPrDefault"))
                if rPr_child is not None:
                    rPr_run = rPr_child.find(qn("w:rPr"))
                    if rPr_run is not None:
                        set_font_properties(rPr_run, default_cjk_font, "Times New Roman")
                        sz = rPr_run.find(qn("w:sz"))
                        if sz is None:
                            sz = OxmlElement("w:sz")
                            rPr_run.append(sz)
                        sz.set(qn("w:val"), str(int(default_body_size * 2)))
                        self._set_rpr_color_black(rPr_run)

            # 设置 Normal 样式
            normal_style = doc.styles["Normal"]
            if normal_style:
                rPr_normal = normal_style.element.find(qn("w:rPr"))
                if rPr_normal is not None:
                    set_font_properties(rPr_normal, default_cjk_font, "Times New Roman")
                    self._set_rpr_color_black(rPr_normal)

            # 处理所有 run
            for para in doc.paragraphs:
                for run in para.runs:
                    run_elem = run._element
                    rPr = run_elem.find(qn("w:rPr"))
                    if rPr is None:
                        rPr = OxmlElement("w:rPr")
                        run_elem.insert(0, rPr)

                    style_name = _para_style_name(run_elem)
                    font = _style_font_map.get(style_name, default_cjk_font)
                    ascii_font = english_font_family if use_english_font else font

                    set_font_properties(
                        rPr,
                        east_asia=font,
                        ascii=ascii_font,
                        h_ansi=ascii_font,
                        bold=_style_bold_map.get(style_name),
                        color="000000",
                    )

                    # 设置字号
                    size_pt = _style_size_map.get(style_name, default_body_size)
                    sz = rPr.find(qn("w:sz"))
                    if sz is None:
                        sz = OxmlElement("w:sz")
                        rPr.append(sz)
                    sz.set(qn("w:val"), str(int(size_pt * 2)))

                    # 设置行高
                    spacing = para.paragraph_format.line_spacing
                    if spacing is None:
                        spacing = default_line_height
                    if isinstance(spacing, (int, float)):
                        para.paragraph_format.line_spacing = spacing

                    # 正文段落对齐
                    if style_name == "Normal" and default_body_align:
                        ooxml_body_align = _body_align_map.get(default_body_align)
                        if ooxml_body_align:
                            pPr_b = para._element.find(qn("w:pPr"))
                            if pPr_b is None:
                                pPr_b = OxmlElement("w:pPr")
                                para._element.insert(0, pPr_b)
                            jc_b = pPr_b.find(qn("w:jc"))
                            if jc_b is None:
                                jc_b = OxmlElement("w:jc")
                                pPr_b.append(jc_b)
                            jc_b.set(qn("w:val"), ooxml_body_align)

                    # 设置首行缩进（仅对正文段落，标题段落不加首行缩进）
                    if not style_name.startswith("Heading") and style_name not in ("Title", "Subtitle"):
                        first_line_indent = para.paragraph_format.first_line_indent
                        if first_line_indent is None or first_line_indent == 0:
                            chars = default_first_indent
                            if chars > 0:
                                # 1字符 = 当前字号pt值，Pt() 接受磅值
                                para.paragraph_format.first_line_indent = Pt(chars * size_pt)

                    # 正文段落段前段后（仅 Normal 段落，标题已单独处理）
                    if style_name == "Normal" and (default_para_before is not None or default_para_after is not None):
                        pPr_s = para._element.find(qn("w:pPr"))
                        if pPr_s is None:
                            pPr_s = OxmlElement("w:pPr")
                            para._element.insert(0, pPr_s)
                        spc_s = pPr_s.find(qn("w:spacing"))
                        if spc_s is None:
                            spc_s = OxmlElement("w:spacing")
                            pPr_s.append(spc_s)
                        if default_para_before is not None:
                            spc_s.set(qn("w:before"), str(int(float(default_para_before) * 20)))
                        if default_para_after is not None:
                            spc_s.set(qn("w:after"), str(int(float(default_para_after) * 20)))

                    # 标题额外处理：颜色、对齐、行高、段前段后
                    if style_name.startswith("Heading"):
                        self._set_rpr_color_black(rPr)
                        level_map = {
                            "Heading 1": heading1_cfg,
                            "Heading 2": heading2_cfg,
                            "Heading 3": heading3_cfg,
                            "Heading 4": heading4_cfg,
                            "Heading 5": heading5_cfg,
                        }
                        h_cfg = level_map.get(style_name, {})
                        # 对齐
                        h_align = h_cfg.get("align")
                        if h_align:
                            align_map = {"left": "left", "center": "center", "right": "right", "justify": "both"}
                            ooxml_align = align_map.get(h_align)
                            if ooxml_align:
                                pPr_a = para._element.find(qn("w:pPr"))
                                if pPr_a is None:
                                    from docx.oxml import OxmlElement as _Ox
                                    pPr_a = _Ox("w:pPr")
                                    para._element.insert(0, pPr_a)
                                jc = pPr_a.find(qn("w:jc"))
                                if jc is None:
                                    from docx.oxml import OxmlElement as _Ox
                                    jc = _Ox("w:jc")
                                    pPr_a.append(jc)
                                jc.set(qn("w:val"), ooxml_align)
                        # 行高
                        h_line_height = h_cfg.get("lineHeight")
                        if h_line_height:
                            pPr = para._element.find(qn("w:pPr"))
                            if pPr is None:
                                from docx.oxml import OxmlElement as _Ox
                                pPr = _Ox("w:pPr")
                                para._element.insert(0, pPr)
                            spc = pPr.find(qn("w:spacing"))
                            if spc is None:
                                from docx.oxml import OxmlElement as _Ox
                                spc = _Ox("w:spacing")
                                pPr.append(spc)
                            spc.set(qn("w:line"), str(int(float(h_line_height) * 240)))
                            spc.set(qn("w:lineRule"), "auto")
                        # 段前段后
                        h_before = h_cfg.get("spacingBeforePt")
                        h_after = h_cfg.get("spacingAfterPt")
                        if h_before is not None or h_after is not None:
                            pPr = para._element.find(qn("w:pPr"))
                            if pPr is None:
                                from docx.oxml import OxmlElement as _Ox
                                pPr = _Ox("w:pPr")
                                para._element.insert(0, pPr)
                            spc = pPr.find(qn("w:spacing"))
                            if spc is None:
                                from docx.oxml import OxmlElement as _Ox
                                spc = _Ox("w:spacing")
                                pPr.append(spc)
                            if h_before is not None:
                                spc.set(qn("w:before"), str(int(float(h_before) * 20)))
                            if h_after is not None:
                                spc.set(qn("w:after"), str(int(float(h_after) * 20)))
                        # 首行缩进
                        h_first_indent = h_cfg.get("firstLineIndentChars")
                        if h_first_indent is not None:
                            h_size_pt = _style_size_map.get(style_name, default_body_size)
                            pPr = para._element.find(qn("w:pPr"))
                            if pPr is None:
                                from docx.oxml import OxmlElement as _Ox
                                pPr = _Ox("w:pPr")
                                para._element.insert(0, pPr)
                            ind = pPr.find(qn("w:ind"))
                            if ind is None:
                                from docx.oxml import OxmlElement as _Ox
                                ind = _Ox("w:ind")
                                pPr.append(ind)
                            ind.set(qn("w:firstLine"), str(int(float(h_first_indent) * h_size_pt * 20)))
                        # 左缩进
                        h_left_indent = h_cfg.get("leftIndentChars")
                        if h_left_indent is not None:
                            h_size_pt = _style_size_map.get(style_name, default_body_size)
                            pPr = para._element.find(qn("w:pPr"))
                            if pPr is None:
                                from docx.oxml import OxmlElement as _Ox
                                pPr = _Ox("w:pPr")
                                para._element.insert(0, pPr)
                            ind = pPr.find(qn("w:ind"))
                            if ind is None:
                                from docx.oxml import OxmlElement as _Ox
                                ind = _Ox("w:ind")
                                pPr.append(ind)
                            ind.set(qn("w:left"), str(int(float(h_left_indent) * h_size_pt * 20)))
                        # 大纲级别
                        h_outline = h_cfg.get("outlineLevel")
                        if h_outline is not None:
                            pPr = para._element.find(qn("w:pPr"))
                            if pPr is None:
                                from docx.oxml import OxmlElement as _Ox
                                pPr = _Ox("w:pPr")
                                para._element.insert(0, pPr)
                            ol_elem = pPr.find(qn("w:outlineLvl"))
                            if ol_elem is None:
                                from docx.oxml import OxmlElement as _Ox
                                ol_elem = _Ox("w:outlineLvl")
                                pPr.append(ol_elem)
                            ol_elem.set(qn("w:val"), str(int(h_outline)))

            _log.info("字体样式应用完成")
        except Exception as e:
            _log.error(f"字体样式应用失败: {e}")

    # ------------------------------------------------------------------ #
    #  表格样式应用
    # ------------------------------------------------------------------ #

    def apply_docx_table_styles(self, doc, template_binding=None) -> None:
        """应用表格样式：字体、颜色、背景色、单元格内边距、行高"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
            from docx.shared import Pt, RGBColor, Cm
        except ImportError:
            _log.warning("python-docx 未安装，跳过表格样式")
            return

        from app.services.export.bindings import StyleBindings
        ts = StyleBindings.get_table_styles(template_binding)
        if not ts:
            return

        header_cfg = ts.get("headerStyle", {})
        data_cfg = ts.get("dataRowStyle", {})
        cell_pad = ts.get("cellPadding", {})
        global_font = ts.get("font", {})  # 表格全局默认字体（回退用）
        header_font = {**global_font, **header_cfg.get("font", {})}
        data_font = {**global_font, **data_cfg.get("font", {})}

        def _cm_to_dxa(cm_val: float) -> int:
            return int(cm_val * 567)

        def _hex_color(color_str: str) -> str:
            return (color_str or "").lstrip("#").upper() or None

        def _set_cell_shading(tc_elem, fill_hex: str):
            shd = tc_elem.find(qn("w:tcPr"))
            if shd is None:
                shd = OxmlElement("w:tcPr")
                tc_elem.insert(0, shd)
            shd_elem = shd.find(qn("w:shd"))
            if shd_elem is None:
                shd_elem = OxmlElement("w:shd")
                shd.append(shd_elem)
            shd_elem.set(qn("w:val"), "clear")
            shd_elem.set(qn("w:color"), "auto")
            shd_elem.set(qn("w:fill"), fill_hex.upper())

        def _set_cell_padding(tc_elem, top_cm: float, right_cm: float, bottom_cm: float, left_cm: float):
            tcPr = tc_elem.find(qn("w:tcPr"))
            if tcPr is None:
                tcPr = OxmlElement("w:tcPr")
                tc_elem.insert(0, tcPr)
            mar = tcPr.find(qn("w:tcMar"))
            if mar is None:
                mar = OxmlElement("w:tcMar")
                tcPr.append(mar)
            for side, val_cm in [("top", top_cm), ("right", right_cm), ("bottom", bottom_cm), ("left", left_cm)]:
                side_elem = mar.find(qn(f"w:{side}"))
                if side_elem is None:
                    side_elem = OxmlElement(f"w:{side}")
                    mar.append(side_elem)
                side_elem.set(qn("w:w"), str(_cm_to_dxa(val_cm)))
                side_elem.set(qn("w:type"), "dxa")

        def _set_run_font_style(rPr_elem, font_cfg: dict):
            font_id = font_cfg.get("fontFamily")
            if font_id:
                font_name = self.font_display_name(font_id)
                rFonts = rPr_elem.find(qn("w:rFonts"))
                if rFonts is None:
                    rFonts = OxmlElement("w:rFonts")
                    rPr_elem.insert(0, rFonts)
                rFonts.set(qn("w:eastAsia"), font_name)
                rFonts.set(qn("w:ascii"), font_name)
                rFonts.set(qn("w:hAnsi"), font_name)

            size_pt = font_cfg.get("fontSizePt")
            if size_pt:
                sz = rPr_elem.find(qn("w:sz"))
                if sz is None:
                    sz = OxmlElement("w:sz")
                    rPr_elem.append(sz)
                sz.set(qn("w:val"), str(int(float(size_pt) * 2)))

            color_hex = _hex_color(font_cfg.get("color", ""))
            if color_hex:
                c_elem = rPr_elem.find(qn("w:color"))
                if c_elem is None:
                    c_elem = OxmlElement("w:color")
                    rPr_elem.append(c_elem)
                c_elem.set(qn("w:val"), color_hex)

            bold = font_cfg.get("bold")
            if bold is not None:
                for tag in ("w:b", "w:bCs"):
                    e = rPr_elem.find(qn(tag))
                    if e is None:
                        e = OxmlElement(tag)
                        rPr_elem.append(e)
                    e.set(qn("w:val"), "1" if bold else "0")

            italic = font_cfg.get("italic")
            if italic is not None:
                for tag in ("w:i", "w:iCs"):
                    e = rPr_elem.find(qn(tag))
                    if e is None:
                        e = OxmlElement(tag)
                        rPr_elem.append(e)
                    e.set(qn("w:val"), "1" if italic else "0")

            underline = font_cfg.get("underline")
            if underline is not None:
                u_elem = rPr_elem.find(qn("w:u"))
                if u_elem is None:
                    u_elem = OxmlElement("w:u")
                    rPr_elem.append(u_elem)
                u_elem.set(qn("w:val"), "single" if underline else "none")

        table_options = ts.get("options", {})
        opt_repeat_header = table_options.get("repeatHeaderRow", True)
        opt_allow_split = table_options.get("allowSplitTable", False)
        opt_specify_format = table_options.get("specifyFormat", False)
        opt_use_theme = table_options.get("useThemeFormat", False)
        opt_use_alignment = table_options.get("useAlignment", False)

        pad_top = float(cell_pad.get("top", 0.14))
        pad_bottom = float(cell_pad.get("bottom", 0.14))
        pad_left = float(cell_pad.get("left", 0.0))
        pad_right = float(cell_pad.get("right", 0.0))

        header_bg = _hex_color(header_cfg.get("shading", {}).get("fill", ""))
        data_bg = _hex_color(data_cfg.get("shading", {}).get("fill", ""))

        header_align = header_cfg.get("align", "")
        data_align = data_cfg.get("align", "")
        header_valign = header_cfg.get("valign", "")
        data_valign = data_cfg.get("valign", "")

        row_height_cfg = ts.get("rowHeight", {})
        header_height_cm = float(row_height_cfg.get("headerHeightCm", 0))
        data_row_height_cm = float(row_height_cfg.get("dataRowHeightCm", 0))

        border_cfg = ts.get("border", {})

        # 从配置获取表格宽度百分比和对齐方式
        table_width_pct = float(ts.get("tableWidth", 100))
        table_align = ts.get("tableAlignment", "left")

        from app.services.export.bindings import StyleBindings
        layout = StyleBindings.get_layout(template_binding)
        margin_left_mm = float(layout.get("marginLeftMm", 25))
        margin_right_mm = float(layout.get("marginRightMm", 25))
        page_width_mm = float(layout.get("pageWidthMm", 210))
        body_width_mm = page_width_mm - margin_left_mm - margin_right_mm
        body_width_dxa = int(body_width_mm * 56.7)
        table_width_dxa = int(body_width_dxa * table_width_pct / 100)

        def _border_val(style: str) -> str:
            style_map = {"single": "single", "double": "double", "dashed": "dashed",
                         "dotted": "dotted", "none": "none", "solid": "single"}
            return style_map.get(style, "single")

        def _set_table_borders(tbl_elem, border_cfg: dict):
            """设置表格边框（w:tblBorders）"""
            preset = border_cfg.get("preset", "all")
            b_color = _hex_color(border_cfg.get("color", "#000000")) or "000000"
            b_width_pt = float(border_cfg.get("widthPt", 0.5))
            b_width_eighths = max(1, int(b_width_pt * 8))
            b_style = _border_val(border_cfg.get("style", "single"))

            # preset 转换为各边开关
            if preset == "none":
                sides = {}
            elif preset == "outline":
                sides = {"top": True, "left": True, "bottom": True, "right": True,
                         "insideH": False, "insideV": False}
            elif preset == "inside":
                sides = {"top": False, "left": False, "bottom": False, "right": False,
                         "insideH": True, "insideV": True}
            elif preset == "grid":
                sides = {"top": True, "left": True, "bottom": True, "right": True,
                         "insideH": True, "insideV": True}
            else:  # "all" 或其他，读取独立配置
                sides = {
                    "top": border_cfg.get("topBorder", True),
                    "left": border_cfg.get("leftBorder", True),
                    "bottom": border_cfg.get("bottomBorder", True),
                    "right": border_cfg.get("rightBorder", True),
                    "insideH": border_cfg.get("insideHorizontalBorder", True),
                    "insideV": border_cfg.get("insideVerticalBorder", True),
                }

            if not sides:
                return

            tblPr = tbl_elem.find(qn("w:tblPr"))
            if tblPr is None:
                tblPr = OxmlElement("w:tblPr")
                tbl_elem.insert(0, tblPr)
            borders_elem = tblPr.find(qn("w:tblBorders"))
            if borders_elem is None:
                borders_elem = OxmlElement("w:tblBorders")
                tblPr.append(borders_elem)

            side_tag_map = {
                "top": "w:top", "left": "w:left", "bottom": "w:bottom", "right": "w:right",
                "insideH": "w:insideH", "insideV": "w:insideV",
            }
            for side_key, enabled in sides.items():
                tag = side_tag_map[side_key]
                elem = borders_elem.find(qn(tag))
                if elem is None:
                    elem = OxmlElement(tag)
                    borders_elem.append(elem)
                if enabled:
                    elem.set(qn("w:val"), b_style)
                    elem.set(qn("w:sz"), str(b_width_eighths))
                    elem.set(qn("w:color"), b_color)
                else:
                    elem.set(qn("w:val"), "none")

        def _set_table_width(tbl_elem, width_dxa: int, align: str):
            tblPr = tbl_elem.find(qn("w:tblPr"))
            if tblPr is None:
                tblPr = OxmlElement("w:tblPr")
                tbl_elem.insert(0, tblPr)
            tblW = tblPr.find(qn("w:tblW"))
            if tblW is None:
                tblW = OxmlElement("w:tblW")
                tblPr.append(tblW)
            tblW.set(qn("w:w"), str(width_dxa))
            tblW.set(qn("w:type"), "dxa")
            jc = tblPr.find(qn("w:jc"))
            if jc is None:
                jc = OxmlElement("w:jc")
                tblPr.append(jc)
            jc.set(qn("w:val"), {"left": "left", "center": "center", "right": "right"}.get(align, "left"))

        def _set_table_cell_width(tc_elem, col_count: int, table_width_dxa: int):
            if col_count <= 0:
                return
            col_width = table_width_dxa // col_count
            tcPr = tc_elem.find(qn("w:tcPr"))
            if tcPr is None:
                tcPr = OxmlElement("w:tcPr")
                tc_elem.insert(0, tcPr)
            tcW = tcPr.find(qn("w:tcW"))
            if tcW is None:
                tcW = OxmlElement("w:tcW")
                tcPr.append(tcW)
            gridSpan = tcPr.find(qn("w:gridSpan"))
            span = int(gridSpan.get(qn("w:val"), 1)) if gridSpan is not None else 1
            tcW.set(qn("w:w"), str(col_width * span))
            tcW.set(qn("w:type"), "dxa")

        def _set_cell_valign(tc_elem, valign: str):
            if not valign:
                return
            valign_map = {"top": "top", "center": "center", "bottom": "bottom", "middle": "center"}
            ooxml_val = valign_map.get(valign, "center")
            tcPr = tc_elem.find(qn("w:tcPr"))
            if tcPr is None:
                tcPr = OxmlElement("w:tcPr")
                tc_elem.insert(0, tcPr)
            vAlign = tcPr.find(qn("w:vAlign"))
            if vAlign is None:
                vAlign = OxmlElement("w:vAlign")
                tcPr.append(vAlign)
            vAlign.set(qn("w:val"), ooxml_val)

        def _set_para_align(para_elem, align: str):
            if not align:
                return
            align_map = {"left": "left", "center": "center", "right": "right", "justify": "both"}
            ooxml_val = align_map.get(align)
            if not ooxml_val:
                return
            pPr = para_elem.find(qn("w:pPr"))
            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para_elem.insert(0, pPr)
            jc = pPr.find(qn("w:jc"))
            if jc is None:
                jc = OxmlElement("w:jc")
                pPr.append(jc)
            jc.set(qn("w:val"), ooxml_val)

        def _set_row_height(tr_elem, height_cm: float):
            if height_cm <= 0:
                return
            height_dxa = _cm_to_dxa(height_cm)
            trPr = tr_elem.find(qn("w:trPr"))
            if trPr is None:
                trPr = OxmlElement("w:trPr")
                tr_elem.insert(0, trPr)
            trHeight = trPr.find(qn("w:trHeight"))
            if trHeight is None:
                trHeight = OxmlElement("w:trHeight")
                trPr.append(trHeight)
            trHeight.set(qn("w:val"), str(height_dxa))
            trHeight.set(qn("w:hRule"), "atLeast")

        def _set_tbl_look(tbl_elem, specify_format: bool, use_theme: bool, use_alignment: bool):
            """设置 w:tblLook 标志位"""
            tblPr = tbl_elem.find(qn("w:tblPr"))
            if tblPr is None:
                tblPr = OxmlElement("w:tblPr")
                tbl_elem.insert(0, tblPr)
            look = tblPr.find(qn("w:tblLook"))
            if look is None:
                look = OxmlElement("w:tblLook")
                tblPr.append(look)
            # w:tblLook val 是 4位十六进制标志：
            # 0x0020 = firstRow, 0x0040 = lastRow, 0x0080 = firstCol, 0x0100 = lastCol
            # 0x0200 = noHBand, 0x0400 = noVBand
            # specifyFormat → 保留默认标志 0x04A0（firstRow+noHBand+noVBand）
            # useTheme → 清除 val，让 Word 使用主题
            if use_theme:
                look.set(qn("w:val"), "0000")
            elif specify_format:
                look.set(qn("w:val"), "04A0")
            # useAlignment → 设置 w:tblCellSpacing 为 0（对齐模式）
            if use_alignment:
                spacing_elem = tblPr.find(qn("w:tblCellSpacing"))
                if spacing_elem is None:
                    spacing_elem = OxmlElement("w:tblCellSpacing")
                    tblPr.append(spacing_elem)
                spacing_elem.set(qn("w:w"), "0")
                spacing_elem.set(qn("w:type"), "dxa")

        for table in doc.tables:
            _set_table_width(table._tbl, table_width_dxa, table_align)
            _set_table_borders(table._tbl, border_cfg)
            _set_tbl_look(table._tbl, opt_specify_format, opt_use_theme, opt_use_alignment)

            try:
                tbl_grid = table._tbl.find(qn("w:tblGrid"))
                if tbl_grid is not None:
                    grid_cols = tbl_grid.findall(qn("w:gridCol"))
                    col_count = len(grid_cols)
                    if col_count > 0:
                        col_width_dxa = table_width_dxa // col_count
                        for gc in grid_cols:
                            gc.set(qn("w:w"), str(col_width_dxa))
                else:
                    col_count = len(table.columns)
            except Exception:
                col_count = len(table.rows[0].cells) if table.rows else 0

            for row_idx, row in enumerate(table.rows):
                is_header = row_idx == 0
                cur_font = header_font if is_header else data_font
                cur_bg = header_bg if is_header else data_bg
                cur_align = header_align if is_header else data_align
                cur_valign = header_valign if is_header else data_valign
                cur_height_cm = header_height_cm if is_header else data_row_height_cm

                _set_row_height(row._tr, cur_height_cm)

                # repeatHeaderRow：在表头行的 trPr 中设置 w:tblHeader
                if is_header:
                    trPr = row._tr.find(qn("w:trPr"))
                    if trPr is None:
                        trPr = OxmlElement("w:trPr")
                        row._tr.insert(0, trPr)
                    tbl_header = trPr.find(qn("w:tblHeader"))
                    if opt_repeat_header:
                        if tbl_header is None:
                            tbl_header = OxmlElement("w:tblHeader")
                            trPr.append(tbl_header)
                    else:
                        if tbl_header is not None:
                            trPr.remove(tbl_header)

                # allowSplitTable（cantSplit 是其反义）：控制行是否可跨页断开
                trPr = row._tr.find(qn("w:trPr"))
                if trPr is None:
                    trPr = OxmlElement("w:trPr")
                    row._tr.insert(0, trPr)
                cant_split = trPr.find(qn("w:cantSplit"))
                if not opt_allow_split:
                    # 不允许拆分 → cantSplit = true
                    if cant_split is None:
                        cant_split = OxmlElement("w:cantSplit")
                        trPr.append(cant_split)
                    cant_split.set(qn("w:val"), "1")
                else:
                    # 允许拆分 → 移除 cantSplit 或设为 false
                    if cant_split is not None:
                        trPr.remove(cant_split)

                for cell in row.cells:
                    tc = cell._tc
                    if col_count > 0:
                        _set_table_cell_width(tc, col_count, table_width_dxa)
                    if cur_bg:
                        _set_cell_shading(tc, cur_bg)
                    _set_cell_padding(tc, pad_top, pad_right, pad_bottom, pad_left)
                    _set_cell_valign(tc, cur_valign)
                    for para in cell.paragraphs:
                        _set_para_align(para._element, cur_align)
                        for run in para.runs:
                            rPr = run._element.find(qn("w:rPr"))
                            if rPr is None:
                                rPr = OxmlElement("w:rPr")
                                run._element.insert(0, rPr)
                            _set_run_font_style(rPr, cur_font)

        _log.info("表格样式应用完成")

    # ------------------------------------------------------------------ #
    #  题注编号插入（表格 / 图片）
    # ------------------------------------------------------------------ #

    def apply_docx_table_numbering(self, doc, template_binding=None) -> None:
        """在每个表格前插入题注段落（当 tableStyles.tableNumbering.enabled=True）"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
        except ImportError:
            return

        from app.services.export.bindings import StyleBindings

        table_styles = StyleBindings.get_table_styles(template_binding)
        numbering_cfg = (table_styles or {}).get("tableNumbering", {})
        if not numbering_cfg.get("enabled"):
            return

        prefix = numbering_cfg.get("prefix", "表") or "表"
        suffix = numbering_cfg.get("suffix", "") or ""
        align = numbering_cfg.get("align", "center") or "center"
        start_number = int(numbering_cfg.get("startNumber", 1) or 1)
        # style: 'number'/'arabic' → 阿拉伯数字，'roman' → 罗马数字（大写）
        numbering_style = numbering_cfg.get("style", "number") or "number"
        align_map = {"left": "left", "center": "center", "right": "right"}
        ooxml_align = align_map.get(align, "center")

        def _format_number(n: int) -> str:
            if numbering_style == "roman":
                # 简单罗马数字转换（1-39 已足够覆盖文档场景）
                roman_map = [(10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
                result, val = "", n
                for num, sym in roman_map:
                    while val >= num:
                        result += sym
                        val -= num
                return result
            return str(n)

        # 从后往前插入，避免索引偏移
        table_count = len(doc.tables)
        for idx in range(table_count - 1, -1, -1):
            tbl = doc.tables[idx]._tbl
            tbl_parent = tbl.getparent()
            tbl_idx = list(tbl_parent).index(tbl)
            # 构建题注段落 XML（序号 = 起始值 + 正向顺序偏移）
            seq_num = start_number + (table_count - 1 - idx)
            caption_text = f"{prefix}{_format_number(seq_num)}{suffix}"
            p_elem = OxmlElement("w:p")
            pPr = OxmlElement("w:pPr")
            jc = OxmlElement("w:jc")
            jc.set(qn("w:val"), ooxml_align)
            pPr.append(jc)
            p_elem.append(pPr)
            r_elem = OxmlElement("w:r")
            t_elem = OxmlElement("w:t")
            t_elem.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            t_elem.text = caption_text
            r_elem.append(t_elem)
            p_elem.append(r_elem)
            # 插入到表格之前
            tbl_parent.insert(tbl_idx, p_elem)

        _log.info("表格题注编号插入完成")

    def apply_docx_image_numbering(self, doc, template_binding=None) -> None:
        """在每张图片所在段落后插入题注段落（当 imageStyles.numbering.enabled=True）"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
        except ImportError:
            return

        from app.services.export.bindings import StyleBindings

        image_styles = StyleBindings.get_image_styles(template_binding)
        numbering_cfg = (image_styles or {}).get("numbering", {})
        if not numbering_cfg.get("enabled"):
            return

        prefix = numbering_cfg.get("prefix", "图") or "图"
        suffix = numbering_cfg.get("suffix", "") or ""
        align = numbering_cfg.get("align", "center") or "center"
        align_map = {"left": "left", "center": "center", "right": "right"}
        ooxml_align = align_map.get(align, "center")

        # 收集含图片的段落（从后往前处理，避免索引变化）
        img_paras = []
        for para in doc.paragraphs:
            for run in para.runs:
                if run._element.find(qn("w:drawing")) is not None:
                    img_paras.append(para)
                    break

        for img_idx, para in enumerate(reversed(img_paras)):
            caption_text = f"{prefix}{len(img_paras) - img_idx}{suffix}"
            para_elem = para._element
            para_parent = para_elem.getparent()
            para_pos = list(para_parent).index(para_elem)
            # 构建题注段落
            p_elem = OxmlElement("w:p")
            pPr = OxmlElement("w:pPr")
            jc = OxmlElement("w:jc")
            jc.set(qn("w:val"), ooxml_align)
            pPr.append(jc)
            p_elem.append(pPr)
            r_elem = OxmlElement("w:r")
            t_elem = OxmlElement("w:t")
            t_elem.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            t_elem.text = caption_text
            r_elem.append(t_elem)
            p_elem.append(r_elem)
            # 插入到图片段落之后
            para_parent.insert(para_pos + 1, p_elem)

        _log.info("图片题注编号插入完成")

    # ------------------------------------------------------------------ #
    #  图片样式应用
    # ------------------------------------------------------------------ #

    def convert_inline_to_anchor(self, drawing, inline, wrap_type: str, horizontal_align: str, spacing: dict, border_cfg: dict) -> None:
        """将 wp:inline 图片转换为 wp:anchor 浮动图片（drawing 为 w:drawing 元素）"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn

        anchor = OxmlElement("wp:anchor")
        for child in list(inline):
            anchor.append(child)

        dist_left_emu = int((spacing.get("marginLeftCm", 0.2) or 0.2) * 914400)
        dist_right_emu = int((spacing.get("marginRightCm", 0.2) or 0.2) * 914400)
        dist_top_emu = int((spacing.get("marginTopCm", 0) or 0) * 914400)
        dist_bottom_emu = int((spacing.get("marginBottomCm", 0.21) or 0.21) * 914400)

        anchor.set("distl", str(dist_left_emu))
        anchor.set("distT", str(dist_top_emu))
        anchor.set("distR", str(dist_right_emu))
        anchor.set("distB", str(dist_bottom_emu))
        anchor.set("simplePos", "0")
        anchor.set("relativeHeight", "251658240")
        anchor.set("behindDoc", "0")
        anchor.set("locked", "0")
        anchor.set("layoutInCell", "1")
        anchor.set("allowOverlap", "1")

        docIds = OxmlElement("wp:docIds")
        docId = OxmlElement("wp:docId")
        docId.set("val", "1")
        docIds.append(docId)
        anchor.append(docIds)

        simplePos = OxmlElement("wp:simplePos")
        simplePos.set("x", "0")
        simplePos.set("y", "0")
        anchor.append(simplePos)

        positionH = OxmlElement("wp:positionH")
        positionH.set("relativeFrom", "margin")
        alignH = OxmlElement("wp:align")
        alignH.text = "center" if horizontal_align == "center" else ("right" if horizontal_align == "right" else "left")
        positionH.append(alignH)
        anchor.append(positionH)

        positionV = OxmlElement("wp:positionV")
        positionV.set("relativeFrom", "paragraph")
        alignV = OxmlElement("wp:align")
        alignV.text = "top"
        positionV.append(alignV)
        anchor.append(positionV)

        wrap = OxmlElement("wp:wrap")
        wrap_type_map = {"square": "square", "tight": "tight", "through": "through", "topAndBottom": "topAndBottom", "behind": "none", "inFront": "none"}
        wrap.set("type", wrap_type_map.get(wrap_type, "square"))
        anchor.append(wrap)

        effectExtent = OxmlElement("wp:effectExtent")
        effectExtent.set("l", str(dist_left_emu))
        effectExtent.set("t", str(dist_top_emu))
        effectExtent.set("r", str(dist_right_emu))
        effectExtent.set("b", str(dist_bottom_emu))
        anchor.append(effectExtent)

        inline.getparent().replace(inline, anchor)

    def apply_anchor_styles(self, anchor, wrap_type: str, horizontal_align: str, spacing: dict, border_cfg: dict) -> None:
        """处理浮动图片（wp:anchor）的样式"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn

        behindDoc = anchor.find(qn("wp:behindDoc"))
        if behindDoc is not None:
            behindDoc.set("val", "1" if wrap_type == "behind" else "0")

        positionH = anchor.find(qn("wp:positionH"))
        if positionH is None:
            positionH = OxmlElement("wp:positionH")
            anchor.append(positionH)
        positionH.set("relativeFrom", "margin")

        posH_elem = positionH.find(qn("wp:align"))
        if posH_elem is None:
            posH_elem = OxmlElement("wp:align")
            positionH.append(posH_elem)
        posH_elem.text = "center" if horizontal_align == "center" else ("right" if horizontal_align == "right" else "left")

        positionV = anchor.find(qn("wp:positionV"))
        if positionV is None:
            positionV = OxmlElement("wp:positionV")
            anchor.append(positionV)
        positionV.set("relativeFrom", "paragraph")

        posV_elem = positionV.find(qn("wp:align"))
        if posV_elem is None:
            posV_elem = OxmlElement("wp:align")
            positionV.append(posV_elem)
        posV_elem.text = "top"

        wrap = anchor.find(qn("wp:wrap"))
        if wrap is None:
            wrap = OxmlElement("wp:wrap")
            anchor.append(wrap)
        wrap_type_map = {"square": "square", "tight": "tight", "through": "through", "topAndBottom": "topAndBottom", "behind": "none", "inFront": "none", "inline": "inline"}
        wrap.set("type", wrap_type_map.get(wrap_type, "inline"))

        dist_left_emu = int((spacing.get("marginLeftCm", 0.2) or 0.2) * 914400)
        dist_right_emu = int((spacing.get("marginRightCm", 0.2) or 0.2) * 914400)
        dist_top_emu = int((spacing.get("marginTopCm", 0) or 0) * 914400)
        dist_bottom_emu = int((spacing.get("marginBottomCm", 0.21) or 0.21) * 914400)

        anchor.set("distl", str(dist_left_emu))
        anchor.set("distT", str(dist_top_emu))
        anchor.set("distR", str(dist_right_emu))
        anchor.set("distB", str(dist_bottom_emu))

        effectExtent = anchor.find(qn("wp:effectExtent"))
        if effectExtent is None:
            effectExtent = OxmlElement("wp:effectExtent")
            anchor.append(effectExtent)
        effectExtent.set("l", str(dist_left_emu))
        effectExtent.set("r", str(dist_right_emu))
        effectExtent.set("t", str(dist_top_emu))
        effectExtent.set("b", str(dist_bottom_emu))

        docPr = anchor.find(qn("wp:docPr"))
        if docPr is not None and border_cfg.get("showBorder"):
            border_color = border_cfg.get("color", "#000000")
            border_width = border_cfg.get("borderWidthPt", border_cfg.get("widthPt", 0.75))
            docPr.set("strokeColor", border_color.lstrip("#"))
            docPr.set("strokeWeight", f"{border_width}pt")

    def apply_inline_styles(self, inline, wrap_type: str, spacing: dict, border_cfg: dict) -> None:
        """处理内联图片（wp:inline）的样式"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn

        extent = inline.find(qn("wp:extent"))
        if extent is not None:
            cx = extent.get("cx")
            cy = extent.get("cy")
            if cx and cy:
                extent.set("cx", cx)
                extent.set("cy", cy)

        docPr = inline.find(qn("wp:docPr"))
        if docPr is not None and border_cfg.get("showBorder"):
            border_color = border_cfg.get("color", "#000000")
            border_width = border_cfg.get("borderWidthPt", border_cfg.get("widthPt", 0.75))
            docPr.set("strokeColor", border_color.lstrip("#"))
            docPr.set("strokeWeight", f"{border_width}pt")

    # ------------------------------------------------------------------ #
    #  列表样式应用
    # ------------------------------------------------------------------ #

    def apply_docx_list_styles(self, doc, template_binding=None) -> None:
        """应用列表样式：缩进、行间距、字体颜色"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
            from docx.shared import Cm, Pt
        except ImportError:
            _log.warning("python-docx 未安装，跳过列表样式")
            return

        from app.services.export.bindings import StyleBindings

        list_styles = StyleBindings.get_list_styles(template_binding)
        if not list_styles:
            return

        bullet_cfg = list_styles.get("bullet", {})
        ordered_cfg = list_styles.get("ordered", {})

        # 有序列表格式 → numFmt 映射
        ordered_format_map = {
            "1.": "decimal",
            "2.": "decimal",
            "3.": "decimal",
            "a.": "lowerLetter",
            "A.": "upperLetter",
            "(1)": "decimal",
            "一.": "ideographTraditional",
            "一、": "ideographTraditional",
            "第": "ideographTraditional",
        }

        def _pt_to_dxa(pt_val: float) -> int:
            return int(pt_val * 20)

        def _cm_to_twip(cm_val: float) -> int:
            return int(cm_val * 567)

        def _set_para_indent(para_elem, indent_twip: int):
            pPr = para_elem.find(qn("w:pPr"))
            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para_elem.insert(0, pPr)
            ind = pPr.find(qn("w:ind"))
            if ind is None:
                ind = OxmlElement("w:ind")
                pPr.append(ind)
            ind.set(qn("w:left"), str(indent_twip))

        def _set_para_spacing(para_elem, before_lines=None, after_lines=None, line_spacing=None):
            pPr = para_elem.find(qn("w:pPr"))
            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para_elem.insert(0, pPr)
            spc = pPr.find(qn("w:spacing"))
            if spc is None:
                spc = OxmlElement("w:spacing")
                pPr.append(spc)
            if before_lines is not None:
                spc.set(qn("w:before"), str(int(before_lines * 240)))
            if after_lines is not None:
                spc.set(qn("w:after"), str(int(after_lines * 240)))
            if line_spacing is not None:
                spc.set(qn("w:line"), str(int(line_spacing * 240)))
                spc.set(qn("w:lineRule"), "auto")

        def _set_run_color(rPr_elem, color_hex: str):
            color_val = color_hex.lstrip("#").upper()
            c_elem = rPr_elem.find(qn("w:color"))
            if c_elem is None:
                c_elem = OxmlElement("w:color")
                rPr_elem.append(c_elem)
            c_elem.set(qn("w:val"), color_val)

        def _get_numId(para_elem):
            pPr = para_elem.find(qn("w:pPr"))
            if pPr is None:
                return None, None
            numPr = pPr.find(qn("w:numPr"))
            if numPr is None:
                return None, None
            numId_elem = numPr.find(qn("w:numId"))
            ilvl_elem = numPr.find(qn("w:ilvl"))
            numId = numId_elem.get(qn("w:val")) if numId_elem is not None else None
            ilvl = ilvl_elem.get(qn("w:val"), "0") if ilvl_elem is not None else "0"
            return numId, ilvl

        # 有序列表格式应用到 numbering.xml（一次性处理，修改 abstractNum 级别）
        ordered_num_fmt = ordered_format_map.get(ordered_cfg.get("format", ""), None) if ordered_cfg else None
        if ordered_num_fmt:
            try:
                numbering_part = doc.part.numbering_part
                if numbering_part is not None:
                    abstract_nums = numbering_part._element.findall(qn("w:abstractNum"))
                    for an in abstract_nums:
                        lvl_elems = an.findall(qn("w:lvl"))
                        for lvl in lvl_elems:
                            numFmt = lvl.find(qn("w:numFmt"))
                            if numFmt is not None:
                                fmt_val = numFmt.get(qn("w:val"), "")
                                if fmt_val not in ("bullet", "none", ""):
                                    numFmt.set(qn("w:val"), ordered_num_fmt)
            except Exception:
                pass

        # 无序列表符号写入 numbering.xml lvlText（bullet.character）
        bullet_char = bullet_cfg.get("character") if bullet_cfg else None
        if bullet_char:
            try:
                numbering_part = doc.part.numbering_part
                if numbering_part is not None:
                    abstract_nums = numbering_part._element.findall(qn("w:abstractNum"))
                    for an in abstract_nums:
                        lvl_elems = an.findall(qn("w:lvl"))
                        for lvl in lvl_elems:
                            numFmt = lvl.find(qn("w:numFmt"))
                            if numFmt is not None and numFmt.get(qn("w:val"), "") == "bullet":
                                lvl_text = lvl.find(qn("w:lvlText"))
                                if lvl_text is None:
                                    lvl_text = OxmlElement("w:lvlText")
                                    lvl.append(lvl_text)
                                lvl_text.set(qn("w:val"), bullet_char)
            except Exception:
                pass

        # 识别列表段落，pandoc 生成的列表均带 w:numPr
        for para in doc.paragraphs:
            numId, ilvl = _get_numId(para._element)
            if numId is None:
                continue

            # 通过 numbering.xml 判断是有序还是无序列表
            is_ordered = False
            try:
                numbering_part = doc.part.numbering_part
                if numbering_part is not None:
                    num_elems = numbering_part._element.findall(qn("w:num"))
                    for num_elem in num_elems:
                        if num_elem.get(qn("w:numId")) == numId:
                            abstractNumId_elem = num_elem.find(qn("w:abstractNumId"))
                            if abstractNumId_elem is not None:
                                abstract_id = abstractNumId_elem.get(qn("w:val"))
                                abstract_nums = numbering_part._element.findall(qn("w:abstractNum"))
                                for an in abstract_nums:
                                    if an.get(qn("w:abstractNumId")) == abstract_id:
                                        lvl_elems = an.findall(qn("w:lvl"))
                                        for lvl in lvl_elems:
                                            if lvl.get(qn("w:ilvl")) == ilvl:
                                                numFmt = lvl.find(qn("w:numFmt"))
                                                if numFmt is not None:
                                                    fmt_val = numFmt.get(qn("w:val"), "")
                                                    is_ordered = fmt_val not in ("bullet", "none", "")
                                                break
                                        break
                            break
            except Exception:
                pass

            cfg = ordered_cfg if is_ordered else bullet_cfg
            if not cfg:
                continue

            indent_cm = cfg.get("indentCm")
            if indent_cm:
                _set_para_indent(para._element, _cm_to_twip(float(indent_cm)))

            _set_para_spacing(
                para._element,
                before_lines=cfg.get("spacingBeforeLines"),
                after_lines=cfg.get("spacingAfterLines"),
                line_spacing=cfg.get("lineSpacing"),
            )

            color = cfg.get("color")
            font_id = cfg.get("fontFamily")
            font_name = self.font_display_name(font_id) if font_id else None

            for run in para.runs:
                rPr = run._element.find(qn("w:rPr"))
                if rPr is None:
                    rPr = OxmlElement("w:rPr")
                    run._element.insert(0, rPr)
                if color:
                    _set_run_color(rPr, color)
                if font_name:
                    rFonts = rPr.find(qn("w:rFonts"))
                    if rFonts is None:
                        rFonts = OxmlElement("w:rFonts")
                        rPr.insert(0, rFonts)
                    rFonts.set(qn("w:eastAsia"), font_name)

        _log.info("列表样式应用完成")

    # ------------------------------------------------------------------ #
    #  代码块样式应用
    # ------------------------------------------------------------------ #

    def apply_docx_codeblock_styles(self, doc, template_binding=None) -> None:
        """应用代码块样式：字体、颜色、背景色、边框、行距、内边距"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
            from docx.shared import Pt, RGBColor
        except ImportError:
            _log.warning("python-docx 未安装，跳过代码块样式")
            return

        from app.services.export.bindings import StyleBindings

        code_styles = StyleBindings.get_codeblock_styles(template_binding)
        if not code_styles:
            return

        font_cfg = code_styles.get("font", {})
        padding_cfg = code_styles.get("padding", {})
        shading_cfg = code_styles.get("shading", {})
        border_cfg = code_styles.get("border", {})
        line_spacing = code_styles.get("lineSpacing")

        font_id = font_cfg.get("fontFamily")
        font_name = self.font_display_name(font_id) if font_id else None
        font_size_pt = font_cfg.get("fontSizePt")
        font_color = font_cfg.get("color")
        font_bold = font_cfg.get("bold")
        font_italic = font_cfg.get("italic")
        bg_fill = shading_cfg.get("fill")

        # 键盘样式（kbd 元素 → 内联 run 底纹 + 颜色）
        keyboard_cfg = code_styles.get("keyboardStyle", {})
        kbd_fg_color = keyboard_cfg.get("foregroundColor")
        kbd_bg_color = keyboard_cfg.get("backgroundColor")
        # 行号配置
        line_number_cfg = code_styles.get("lineNumber", {})
        line_number_show = line_number_cfg.get("show", False)
        line_number_color = line_number_cfg.get("color")

        def _hex(color_str: str) -> str:
            return (color_str or "").lstrip("#").upper() or None

        def _set_para_shading(pPr_elem, fill_hex: str):
            shd = pPr_elem.find(qn("w:shd"))
            if shd is None:
                shd = OxmlElement("w:shd")
                pPr_elem.append(shd)
            shd.set(qn("w:val"), "clear")
            shd.set(qn("w:color"), "auto")
            shd.set(qn("w:fill"), fill_hex.upper())

        def _set_para_spacing(pPr_elem, line_spacing_val: float):
            spc = pPr_elem.find(qn("w:spacing"))
            if spc is None:
                spc = OxmlElement("w:spacing")
                pPr_elem.append(spc)
            spc.set(qn("w:line"), str(int(line_spacing_val * 240)))
            spc.set(qn("w:lineRule"), "auto")

        def _set_para_border(pPr_elem, border_cfg_: dict):
            color_hex = _hex(border_cfg_.get("color", "#000000")) or "000000"
            width_pt = float(border_cfg_.get("widthPt", 0.5))
            width_eighths = max(1, int(width_pt * 8))
            pb = pPr_elem.find(qn("w:pBdr"))
            if pb is None:
                pb = OxmlElement("w:pBdr")
                pPr_elem.append(pb)
            for side in ("top", "left", "bottom", "right"):
                side_elem = pb.find(qn(f"w:{side}"))
                if side_elem is None:
                    side_elem = OxmlElement(f"w:{side}")
                    pb.append(side_elem)
                side_elem.set(qn("w:val"), "single")
                side_elem.set(qn("w:sz"), str(width_eighths))
                side_elem.set(qn("w:color"), color_hex)
                side_elem.set(qn("w:space"), "4")

        # pandoc 生成的代码块段落样式名为 "SourceCode" 或 "VerbatimChar"，或父段落带 w:pStyle SourceCode
        CODE_STYLE_IDS = {"SourceCode", "VerbatimChar", "Code", "Preformatted Text"}

        for para in doc.paragraphs:
            pPr = para._element.find(qn("w:pPr"))
            style_id = ""
            if pPr is not None:
                pStyle = pPr.find(qn("w:pStyle"))
                if pStyle is not None:
                    style_id = pStyle.get(qn("w:val"), "")

            if style_id not in CODE_STYLE_IDS:
                continue

            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para._element.insert(0, pPr)

            if bg_fill:
                fill_hex = _hex(bg_fill)
                if fill_hex:
                    _set_para_shading(pPr, fill_hex)

            if line_spacing:
                _set_para_spacing(pPr, float(line_spacing))

            if border_cfg.get("color") or border_cfg.get("widthPt"):
                _set_para_border(pPr, border_cfg)

            for run in para.runs:
                run_elem = run._element
                rPr = run_elem.find(qn("w:rPr"))
                if rPr is None:
                    rPr = OxmlElement("w:rPr")
                    run_elem.insert(0, rPr)

                if font_name:
                    rFonts = rPr.find(qn("w:rFonts"))
                    if rFonts is None:
                        rFonts = OxmlElement("w:rFonts")
                        rPr.insert(0, rFonts)
                    rFonts.set(qn("w:eastAsia"), font_name)
                    rFonts.set(qn("w:ascii"), font_name)
                    rFonts.set(qn("w:hAnsi"), font_name)

                if font_size_pt:
                    sz = rPr.find(qn("w:sz"))
                    if sz is None:
                        sz = OxmlElement("w:sz")
                        rPr.append(sz)
                    sz.set(qn("w:val"), str(int(float(font_size_pt) * 2)))

                if font_color:
                    color_hex = _hex(font_color)
                    if color_hex:
                        c_elem = rPr.find(qn("w:color"))
                        if c_elem is None:
                            c_elem = OxmlElement("w:color")
                            rPr.append(c_elem)
                        c_elem.set(qn("w:val"), color_hex)

                if font_bold is not None:
                    for tag in ("w:b", "w:bCs"):
                        e = rPr.find(qn(tag))
                        if e is None:
                            e = OxmlElement(tag)
                            rPr.append(e)
                        e.set(qn("w:val"), "1" if font_bold else "0")

                if font_italic is not None:
                    for tag in ("w:i", "w:iCs"):
                        e = rPr.find(qn(tag))
                        if e is None:
                            e = OxmlElement(tag)
                            rPr.append(e)
                        e.set(qn("w:val"), "1" if font_italic else "0")

        # 行号和键盘样式：通过 run 级 rPr 处理
        # Word 无原生行号机制，通过在每行首 run 前插入行号 run 实现
        # 键盘样式（kbd）：匹配 run 内容以 `` ` `` 包裹或带特殊标记的内联代码，应用底纹
        if kbd_fg_color or kbd_bg_color:
            # 对代码块段落内的 run 应用键盘底纹（整块代码块按 kbd 样式处理）
            for para in doc.paragraphs:
                pPr = para._element.find(qn("w:pPr"))
                style_id = ""
                if pPr is not None:
                    pStyle = pPr.find(qn("w:pStyle"))
                    if pStyle is not None:
                        style_id = pStyle.get(qn("w:val"), "")
                if style_id not in CODE_STYLE_IDS:
                    continue
                for run in para.runs:
                    rPr = run._element.find(qn("w:rPr"))
                    if rPr is None:
                        rPr = OxmlElement("w:rPr")
                        run._element.insert(0, rPr)
                    if kbd_bg_color:
                        kbd_bg_hex = _hex(kbd_bg_color)
                        if kbd_bg_hex:
                            shd = rPr.find(qn("w:shd"))
                            if shd is None:
                                shd = OxmlElement("w:shd")
                                rPr.append(shd)
                            shd.set(qn("w:val"), "clear")
                            shd.set(qn("w:color"), "auto")
                            shd.set(qn("w:fill"), kbd_bg_hex)
                    if kbd_fg_color:
                        kbd_fg_hex = _hex(kbd_fg_color)
                        if kbd_fg_hex:
                            c_elem = rPr.find(qn("w:color"))
                            if c_elem is None:
                                c_elem = OxmlElement("w:color")
                                rPr.append(c_elem)
                            c_elem.set(qn("w:val"), kbd_fg_hex)

        # 行号：在代码块每段前插入行号文本 run（line_number_show=True）
        if line_number_show:
            line_num = 1
            for para in doc.paragraphs:
                pPr = para._element.find(qn("w:pPr"))
                style_id = ""
                if pPr is not None:
                    pStyle = pPr.find(qn("w:pStyle"))
                    if pStyle is not None:
                        style_id = pStyle.get(qn("w:val"), "")
                if style_id not in CODE_STYLE_IDS:
                    continue
                # 在段落最前面插入行号 run
                from lxml import etree
                num_run = OxmlElement("w:r")
                num_rPr = OxmlElement("w:rPr")
                if line_number_color:
                    ln_hex = _hex(line_number_color)
                    if ln_hex:
                        ln_color = OxmlElement("w:color")
                        ln_color.set(qn("w:val"), ln_hex)
                        num_rPr.append(ln_color)
                num_run.insert(0, num_rPr)
                num_t = OxmlElement("w:t")
                num_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
                num_t.text = f"{line_num:>4}  "
                num_run.append(num_t)
                para._element.insert(1 if para._element[0].tag == qn("w:pPr") else 0, num_run)
                line_num += 1

        _log.info("代码块样式应用完成")

    def apply_docx_image_styles(self, doc, template_binding: Optional[dict[str, Any]]) -> None:
        """为 Word 文档中的图片应用模板样式配置"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        from app.services.export.bindings import StyleBindings

        image_styles = StyleBindings.get_image_styles(template_binding)
        if not image_styles:
            _log.debug("无图片样式配置，跳过")
            return

        position = image_styles.get("position") or {}
        border_cfg = image_styles.get("border") or {}
        spacing = image_styles.get("spacing") or {}
        wrap_type = position.get("wrapType", "inline")
        horizontal_align = position.get("horizontalAlign")

        # 图片尺寸模式
        size_mode = position.get("sizeMode", "original")
        max_width_cm = position.get("maxWidthCm")
        max_height_cm = position.get("maxHeightCm")
        keep_aspect = position.get("keepAspectRatio", True)

        # 图片效果（亮度/对比度 + 颜色重置）
        style_cfg = image_styles.get("style") or {}
        brightness = style_cfg.get("brightness", 0)  # -100 ~ 100
        contrast = style_cfg.get("contrast", 0)      # -100 ~ 100
        # 颜色重置预设：grayscale/washout/sepia → OOXML a:lum 调整
        recolor = style_cfg.get("recolor", "none") or "none"

        needs_float = wrap_type not in ("inline", "topAndBottom")

        for para in doc.paragraphs:
            for run in para.runs:
                run_elem = run._element
                # 正确路径：w:r > w:drawing > wp:inline/wp:anchor（> a:graphic 在更深处）
                drawing = run_elem.find(qn("w:drawing"))
                if drawing is None:
                    continue

                inline = drawing.find(qn("wp:inline"))
                anchor = drawing.find(qn("wp:anchor"))
                if inline is None and anchor is None:
                    continue

                if horizontal_align == "center":
                    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif horizontal_align == "right":
                    para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

                if needs_float and inline is not None:
                    # convert_inline_to_anchor 需要 graphic 和 inline；graphic 在 inline 内
                    graphic = inline.find(qn("a:graphic"))
                    if graphic is None:
                        # 尝试深层查找
                        from lxml import etree
                        graphic = inline.find(".//{http://schemas.openxmlformats.org/drawingml/2006/main}graphic")
                    if graphic is not None:
                        self.convert_inline_to_anchor(drawing, inline, wrap_type, horizontal_align, spacing, border_cfg)
                    anchor = drawing.find(qn("wp:anchor"))
                    if anchor is not None:
                        self.apply_anchor_styles(anchor, wrap_type, horizontal_align, spacing, border_cfg)
                elif anchor is not None:
                    self.apply_anchor_styles(anchor, wrap_type, horizontal_align, spacing, border_cfg)
                elif inline is not None:
                    self.apply_inline_styles(inline, wrap_type, spacing, border_cfg)

                # 图片亮度/对比度（操作 a:blipFill > a:blip 的 lum/cont 属性）
                if brightness != 0 or contrast != 0:
                    target = anchor if anchor is not None else inline
                    if target is not None:
                        # a:blip 在 wp:inline/anchor > a:graphic > a:graphicData > pic:pic > pic:blipFill > a:blip
                        NSMAP = {
                            "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
                            "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
                        }
                        blip = target.find(".//{http://schemas.openxmlformats.org/drawingml/2006/main}blip")
                        if blip is not None:
                            # OOXML lum/cont 值范围 -100000 到 100000（对应 -100% ~ 100%）
                            lum_val = int(brightness * 1000)
                            cont_val = int(contrast * 1000)
                            lum_mod_ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}lumMod"
                            lum_off_ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}lumOff"
                            # 亮度用 a:lum 元素
                            lum_ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}lum"
                            from lxml import etree
                            lum_elem = blip.find(lum_ns)
                            if lum_elem is None and lum_val != 0:
                                lum_elem = etree.SubElement(blip, lum_ns)
                            if lum_elem is not None:
                                lum_elem.set("bright", str(max(0, 100000 + lum_val)))
                                lum_elem.set("contrast", str(max(0, 100000 + cont_val)))

                # 颜色重置（recolor）：通过 a:grayscl / a:lum 实现灰度/冲淡效果
                if recolor and recolor != "none":
                    target = anchor if anchor is not None else inline
                    if target is not None:
                        blip = target.find(".//{http://schemas.openxmlformats.org/drawingml/2006/main}blip")
                        if blip is not None:
                            from lxml import etree
                            a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
                            if recolor == "grayscale":
                                # a:grayscl 元素实现灰度
                                grayscl_tag = f"{{{a_ns}}}grayscl"
                                if blip.find(grayscl_tag) is None:
                                    etree.SubElement(blip, grayscl_tag)
                            elif recolor == "washout":
                                # a:lum bright=70000, contrast=-70000 实现冲淡
                                lum_tag = f"{{{a_ns}}}lum"
                                lum_elem = blip.find(lum_tag)
                                if lum_elem is None:
                                    lum_elem = etree.SubElement(blip, lum_tag)
                                lum_elem.set("bright", "70000")
                                lum_elem.set("contrast", "-70000")

                # 图片尺寸限制（maxLimit 模式）
                if size_mode == "maxLimit" and (max_width_cm or max_height_cm):
                    target = anchor if anchor is not None else inline
                    if target is not None:
                        extent = target.find(qn("wp:extent"))
                        if extent is not None:
                            cx = int(extent.get("cx", 0))  # EMU
                            cy = int(extent.get("cy", 0))
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
                            extent.set("cx", str(new_cx))
                            extent.set("cy", str(new_cy))

    # ------------------------------------------------------------------ #
    #  页眉页脚和页码
    # ------------------------------------------------------------------ #

    def add_page_number_footer(self, doc, template_binding: Optional[dict[str, Any]] = None) -> None:
        """添加页码（支持位置、格式、起始值、首页显示等配置）"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.shared import Pt

        from app.services.export.bindings import StyleBindings

        layout = StyleBindings.get_layout(template_binding)
        page_num_cfg = layout.get("pageNumber", {})
        if not page_num_cfg.get("enabled", True):
            return

        # 对齐方式
        align_str = page_num_cfg.get("align", "center")
        align_map_wd = {
            "left": WD_ALIGN_PARAGRAPH.LEFT,
            "center": WD_ALIGN_PARAGRAPH.CENTER,
            "right": WD_ALIGN_PARAGRAPH.RIGHT,
        }
        wd_align = align_map_wd.get(align_str, WD_ALIGN_PARAGRAPH.CENTER)

        # 格式映射
        fmt_map = {
            "arabic": "decimal",
            "lowercaseRoman": "lowerRoman",
            "uppercaseRoman": "upperRoman",
        }
        num_fmt = fmt_map.get(page_num_cfg.get("format", "arabic"), "decimal")
        start_value = page_num_cfg.get("startValue", 1)

        # 首页显示
        show_on_first = page_num_cfg.get("showOnFirstPage", True)

        # 字体配置
        font_name = self.font_display_name(page_num_cfg.get("fontFamily"), "微软雅黑")
        font_size_pt = float(page_num_cfg.get("fontSizePt") or 10)
        font_color = (page_num_cfg.get("color") or "#000000").lstrip("#")
        font_bold = bool(page_num_cfg.get("bold"))
        font_italic = bool(page_num_cfg.get("italic"))

        # 标签模板（支持 {page} / {totalPages} 占位符）
        label_template = page_num_cfg.get("labelTemplate") or "{page}"

        # 包含章节编号：在页码前加 SEQ 字段引用章节标题样式
        include_chapter_number = page_num_cfg.get("includeChapterNumber", False)
        chapter_style = page_num_cfg.get("chapterStyle", "Heading1")
        # chapterStyle 映射到 Word 内置样式用于 STYLEREF 字段
        chapter_style_map = {
            "Heading1": "Heading 1", "Heading2": "Heading 2", "Heading3": "Heading 3",
            "h1": "Heading 1", "h2": "Heading 2", "h3": "Heading 3",
        }
        chapter_word_style = chapter_style_map.get(chapter_style, "Heading 1")

        # 位置：header-bottom 放页眉，footer-top 放页脚（默认）
        position = page_num_cfg.get("position", "footer-top")
        use_header = position == "header-bottom"

        def _make_rPr() -> OxmlElement:
            rPr = OxmlElement("w:rPr")
            rFonts = OxmlElement("w:rFonts")
            rFonts.set(qn("w:eastAsia"), font_name)
            rFonts.set(qn("w:ascii"), font_name)
            rFonts.set(qn("w:hAnsi"), font_name)
            rPr.append(rFonts)
            sz = OxmlElement("w:sz")
            sz.set(qn("w:val"), str(int(font_size_pt * 2)))
            rPr.append(sz)
            clr = OxmlElement("w:color")
            clr.set(qn("w:val"), font_color)
            rPr.append(clr)
            if font_bold:
                rPr.append(OxmlElement("w:b"))
            if font_italic:
                rPr.append(OxmlElement("w:i"))
            return rPr

        def _add_field_run(para, field_instr: str):
            r = para.add_run()
            r._r.insert(0, _make_rPr())
            begin = OxmlElement("w:fldChar")
            begin.set(qn("w:fldCharType"), "begin")
            r._r.append(begin)
            instr = OxmlElement("w:instrText")
            instr.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            instr.text = f" {field_instr} "
            r._r.append(instr)
            end = OxmlElement("w:fldChar")
            end.set(qn("w:fldCharType"), "end")
            r._r.append(end)

        def _add_page_num_para(container):
            import re
            page_para = container.add_paragraph()
            page_para.alignment = wd_align

            # 若启用章节编号，在页码前插入 "STYLEREF {chapterStyle} \n -" 字段
            if include_chapter_number:
                # STYLEREF 字段获取当前章节标题编号
                _add_field_run(page_para, f'STYLEREF "{chapter_word_style}" \\n')
                r_sep = page_para.add_run("-")
                r_sep._r.insert(0, _make_rPr())

            FIELD_MAP = {
                "{page}": f"PAGE \\* {num_fmt}",
                "{totalPages}": "NUMPAGES",
            }
            parts = re.split(r'(\{page\}|\{totalPages\})', label_template)
            for part in parts:
                if part in FIELD_MAP:
                    _add_field_run(page_para, FIELD_MAP[part])
                elif part:
                    r = page_para.add_run(part)
                    r._r.insert(0, _make_rPr())

        # 检查页眉页脚内容配置，避免与 add_header_footer_content 冲突
        hf_cfg = layout.get("headerFooter", {})
        target_has_content = False
        if use_header and hf_cfg.get("hasHeader"):
            hc = hf_cfg.get("headerContent", {})
            if hc.get("left") or hc.get("center") or hc.get("right"):
                target_has_content = True
        elif not use_header and hf_cfg.get("hasFooter"):
            fc = hf_cfg.get("footerContent", {})
            if fc.get("left") or fc.get("center") or fc.get("right"):
                target_has_content = True

        for section in doc.sections:
            # 设置起始页码（需要在 sectPr 中设置 w:pgNumType）
            sectPr = section._sectPr
            pgNumType = sectPr.find(qn("w:pgNumType"))
            if pgNumType is None:
                pgNumType = OxmlElement("w:pgNumType")
                sectPr.append(pgNumType)
            pgNumType.set(qn("w:fmt"), num_fmt)
            pgNumType.set(qn("w:start"), str(start_value))

            if not show_on_first:
                section.different_first_page_header_footer = True

            # 若目标容器已有内容配置（由 add_header_footer_content 处理），跳过写入
            if target_has_content:
                continue

            if use_header:
                container = section.header
            else:
                container = section.footer
            container.is_linked_to_previous = False

            for para in list(container.paragraphs):
                p = para._element
                p.getparent().remove(p)

            _add_page_num_para(container)

    def add_header_footer_content(self, doc, template_binding: Optional[dict[str, Any]] = None) -> None:
        """添加页眉页脚内容"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.shared import Pt

        from app.services.export.bindings import StyleBindings

        layout = StyleBindings.get_layout(template_binding)
        hf_cfg = layout.get("headerFooter", {})

        page_num_style = layout.get("pageNumber", {})
        default_font = self.font_display_name(page_num_style.get("fontFamily"), "微软雅黑")
        font_name = self.font_display_name(hf_cfg.get("pageNumberFontFamily") or page_num_style.get("fontFamily"), default_font)
        font_size_pt = float(hf_cfg.get("pageNumberFontSizePt") or page_num_style.get("fontSizePt") or 10)
        font_color = hf_cfg.get("pageNumberColor") or page_num_style.get("color") or "#000000"
        font_bold = hf_cfg.get("pageNumberBold") or page_num_style.get("bold") or False
        font_italic = hf_cfg.get("pageNumberItalic") or page_num_style.get("italic") or False

        def _make_rPr(align: str) -> OxmlElement:
            rPr = OxmlElement("w:rPr")
            rFonts = OxmlElement("w:rFonts")
            rFonts.set(qn("w:eastAsia"), font_name)
            rFonts.set(qn("w:ascii"), font_name)
            rFonts.set(qn("w:hAnsi"), font_name)
            rFonts.set(qn("w:cs"), font_name)
            rPr.append(rFonts)
            sz = OxmlElement("w:sz")
            sz.set(qn("w:val"), str(int(font_size_pt * 2)))
            rPr.append(sz)
            szCs = OxmlElement("w:szCs")
            szCs.set(qn("w:val"), str(int(font_size_pt * 2)))
            rPr.append(szCs)
            if font_color:
                clr = OxmlElement("w:color")
                clr.set(qn("w:val"), font_color.lstrip("#"))
                rPr.append(clr)
            if font_bold:
                b = OxmlElement("w:b")
                rPr.append(b)
            if font_italic:
                i = OxmlElement("w:i")
                rPr.append(i)
            return rPr

        def _add_field_run(para, field_instr: str):
            """在段落中插入 Word 域（如 PAGE、DATE）"""
            r = para.add_run()
            r._r.insert(0, _make_rPr(""))
            begin = OxmlElement("w:fldChar")
            begin.set(qn("w:fldCharType"), "begin")
            r._r.append(begin)
            instr = OxmlElement("w:instrText")
            instr.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            instr.text = f" {field_instr} "
            r._r.append(instr)
            end = OxmlElement("w:fldChar")
            end.set(qn("w:fldCharType"), "end")
            r._r.append(end)

        def _add_text_with_fields(para, text: str):
            """将含 {page} / {totalPages} / {date} 占位符的字符串输出为 run + 域的组合"""
            import re
            # 读取页码格式配置
            _fmt_map = {"arabic": "decimal", "lowercaseRoman": "lowerRoman", "uppercaseRoman": "upperRoman"}
            _pg_fmt = _fmt_map.get(page_num_style.get("format", "arabic"), "decimal")
            FIELD_MAP = {
                "{page}": f"PAGE \\* {_pg_fmt}",
                "{totalPages}": "NUMPAGES",
                "{date}": 'DATE \\@ "yyyy-MM-dd"',
                "{title}": 'TITLE',
            }
            parts = re.split(r'(\{page\}|\{totalPages\}|\{date\}|\{title\})', text)
            for part in parts:
                if part in FIELD_MAP:
                    _add_field_run(para, FIELD_MAP[part])
                elif part:
                    r = para.add_run(part)
                    r._r.insert(0, _make_rPr(""))

        def _add_tab_para(container, content: dict, align: str):
            para = container.add_paragraph()
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER

            left = content.get("left", "")
            center = content.get("center", "")
            right = content.get("right", "")

            if not (left or center or right):
                return

            pPr = para._element.find(qn("w:pPr"))
            if pPr is None:
                pPr = OxmlElement("w:pPr")
                para._element.insert(0, pPr)
            tabs = OxmlElement("w:tabs")
            tab_defs = [
                ("center", 4680),
                ("right", 9360),
            ]
            for tab_align, pos in tab_defs:
                tab = OxmlElement("w:tab")
                tab.set(qn("w:val"), tab_align)
                tab.set(qn("w:pos"), str(pos))
                tabs.append(tab)
            pPr.append(tabs)

            if left:
                _add_text_with_fields(para, left)
                if center or right:
                    r_tab = para.add_run("\t")
                    r_tab._r.insert(0, _make_rPr(""))
            if center:
                _add_text_with_fields(para, center)
                if right:
                    r_tab2 = para.add_run("\t")
                    r_tab2._r.insert(0, _make_rPr(""))
            if right:
                _add_text_with_fields(para, right)

        def _fill_header_footer(section, target: str):
            container = section.header if target == "header" else section.footer
            container.is_linked_to_previous = False

            for para in list(container.paragraphs):
                p = para._element
                p.getparent().remove(p)

            content = hf_cfg.get("headerContent" if target == "header" else "footerContent", {})

            if not (content.get("left") or content.get("center") or content.get("right")):
                return

            _add_tab_para(container, content, "center")

        # 获取页眉页脚距离配置
        header_distance_cm = layout.get("headerDistanceCm", 1.27)
        footer_distance_cm = layout.get("footerDistanceCm", 1.27)
        # 将厘米转换为磅 (1 cm = 28.35 pt)
        header_distance_pt = header_distance_cm * 28.35
        footer_distance_pt = footer_distance_cm * 28.35

        for section in doc.sections:
            section.footer_distance = Pt(footer_distance_pt)
            section.header_distance = Pt(header_distance_pt)
            if hf_cfg.get("differentFirstPage"):
                section.different_first_page_header_footer = True
            if hf_cfg.get("differentOddEven"):
                section.even_odd_headers_footers = True

        def _fill_even_header_footer(section, target: str):
            """填充奇偶页中偶数页的页眉/页脚"""
            container = section.even_page_header if target == "header" else section.even_page_footer
            container.is_linked_to_previous = False

            for para in list(container.paragraphs):
                p = para._element
                p.getparent().remove(p)

            # 偶数页内容：优先使用 headerContentEven/footerContentEven，回退到正常内容
            even_key = "headerContentEven" if target == "header" else "footerContentEven"
            normal_key = "headerContent" if target == "header" else "footerContent"
            content = hf_cfg.get(even_key) or hf_cfg.get(normal_key, {})

            if not (content.get("left") or content.get("center") or content.get("right")):
                return

            _add_tab_para(container, content, "center")

        if hf_cfg.get("hasHeader"):
            for section in doc.sections:
                _fill_header_footer(section, "header")
            if hf_cfg.get("differentOddEven"):
                for section in doc.sections:
                    _fill_even_header_footer(section, "header")

        if hf_cfg.get("hasFooter"):
            for section in doc.sections:
                _fill_header_footer(section, "footer")
            if hf_cfg.get("differentOddEven"):
                for section in doc.sections:
                    _fill_even_header_footer(section, "footer")

"""
CSS 生成模块

生成导出所需的 CSS 样式：
- 页面布局 CSS（PDF）
- 代码块 CSS
- 表格 CSS
- 列表 CSS
- 图片 CSS
"""

from typing import Any, Optional

from app.core.logging import get_logger

_log = get_logger(__name__)


class CssGenerator:
    """CSS 生成器"""

    # 默认 CJK 字体列表
    CJK_FONTS = (
        '"Microsoft YaHei"',  # Windows 微软雅黑（首选）
        '"SimHei"',  # Windows 黑体
        '"Heiti SC"',  # macOS 黑体
        '"Noto Sans CJK SC"',  # Linux / Android
        '"WenQuanYi Micro Hei"',  # Linux (文泉驿)
        "sans-serif",
    )

    # 模板颜色映射
    TEMPLATE_COLORS: dict[str, str] = {
        "default": "#333333",
        "academic": "#1a1a2e",
        "business": "#0d3349",
        "simple": "#444444",
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
        return CssGenerator.FONT_ID_TO_NAME.get(font_id, font_id)

    @staticmethod
    def get_page_css(
        template_binding: Optional[dict[str, Any]],
        font_family: str | None = None,
    ) -> str:
        """
        生成页面布局 CSS。

        Args:
            template_binding: 模板绑定配置
            font_family: 自定义字体（可选）
        """
        from app.services.export.bindings import StyleBindings

        layout = StyleBindings.get_layout(template_binding)
        styles = StyleBindings.get_styles(template_binding)
        heading_styles = StyleBindings.get_heading_styles(template_binding)
        paragraph_styles = StyleBindings.get_paragraph_styles(template_binding)

        # 页面尺寸
        page_size = layout.get("paperSize", "A4")
        page_direction = layout.get("paperDirection", "portrait")

        # 基础尺寸映射（纵向）
        page_width_map = {
            "A4": "210mm",
            "A3": "297mm",
            "Letter": "8.5in",
            "Legal": "8.5in",
            "B5": "176mm",
            "16K": "185mm",
            "8K": "270mm",
        }
        page_height_map = {
            "A4": "297mm",
            "A3": "420mm",
            "Letter": "11in",
            "Legal": "14in",
            "B5": "250mm",
            "16K": "260mm",
            "8K": "390mm",
        }

        # 自定义尺寸优先（pageWidthMm / pageHeightMm）
        custom_width_mm = layout.get("pageWidthMm")
        custom_height_mm = layout.get("pageHeightMm")
        if custom_width_mm and custom_height_mm:
            if page_direction == "landscape":
                page_width = f"{custom_height_mm}mm"
                page_height = f"{custom_width_mm}mm"
            else:
                page_width = f"{custom_width_mm}mm"
                page_height = f"{custom_height_mm}mm"
        elif page_direction == "landscape":
            page_width = page_height_map.get(page_size, "297mm")
            page_height = page_width_map.get(page_size, "210mm")
        else:
            page_width = page_width_map.get(page_size, "210mm")
            page_height = page_height_map.get(page_size, "297mm")

        # 页边距
        margin_top = layout.get("marginTopMm", 25)
        margin_bottom = layout.get("marginBottomMm", 25)
        margin_left = layout.get("marginLeftMm", 25)
        margin_right = layout.get("marginRightMm", 25)

        # 行高
        line_height = layout.get("defaultLineHeight", 1.5)

        # 字体
        body_font_id = styles.get("body", {}).get("fontFamily")
        body_font = CssGenerator.font_display_name(body_font_id) if body_font_id else (font_family or "微软雅黑")
        cjk_fonts = ", ".join(CssGenerator.CJK_FONTS)

        css_parts = [
            f"@page {{ size: {page_width} {page_height}; margin: {margin_top}mm {margin_right}mm {margin_bottom}mm {margin_left}mm; }}",
            f"body {{ font-family: '{body_font}', {cjk_fonts}; line-height: {line_height}; }}",
            f"h1, h2, h3, h4, h5, h6 {{ page-break-after: avoid; }}",
        ]

        # 标题字体
        for level in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            style_key = f"heading_{level[1]}"
            heading_style = heading_styles.get(level, {})
            font_id = heading_style.get("font", {}).get("fontFamily") or styles.get(style_key, {}).get("fontFamily")
            if font_id:
                css_parts.append(f"{level} {{ font-family: '{CssGenerator.font_display_name(font_id)}', {cjk_fonts}; }}")

        # 段落对齐（paragraphStyles 优先，其次 body styles）
        para_align = paragraph_styles.get("align") or styles.get("body", {}).get("align")
        if para_align:
            align_map = {"left": "left", "center": "center", "right": "right", "justify": "justify"}
            css_align = align_map.get(para_align)
            if css_align:
                css_parts.append(f"p {{ text-align: {css_align}; }}")

        # 段落间距
        spacing_before = layout.get("defaultParagraphSpacingBeforePt", 0)
        spacing_after = layout.get("defaultParagraphSpacingAfterPt", 0)
        if spacing_before or spacing_after:
            css_parts.append(f"p {{ margin-top: {spacing_before}pt; margin-bottom: {spacing_after}pt; }}")

        # 首行缩进（1 字符 = 1em，与编辑器侧保持一致）
        first_line_indent = layout.get("defaultFirstLineIndentChars", 0)
        if first_line_indent:
            css_parts.append(f"p {{ text-indent: {first_line_indent}em; }}")
            css_parts.append("p:first-of-type, h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p { text-indent: 0; }")

        return "\n".join(css_parts) + "\n"

    @staticmethod
    def get_codeblock_css(template_binding: Optional[dict[str, Any]]) -> str:
        """生成代码块 CSS"""
        from app.services.export.bindings import StyleBindings

        code_styles = StyleBindings.get_codeblock_styles(template_binding)
        if not code_styles:
            return ""

        css_parts = []
        font = code_styles.get("font", {})
        padding = code_styles.get("padding", {})
        shading = code_styles.get("shading", {})
        border = code_styles.get("border", {})

        # 字体
        font_id = font.get("fontFamily")
        font_name = CssGenerator.font_display_name(font_id) if font_id else None
        if font_name:
            css_parts.append(f"pre, code {{ font-family: '{font_name}', monospace; }}")

        font_size = font.get("fontSizePt")
        if font_size:
            css_parts.append(f"pre, code {{ font-size: {font_size}pt; }}")

        color = font.get("color")
        if color:
            css_parts.append(f"pre, code {{ color: {color}; }}")

        bold = font.get("bold")
        if bold is not None:
            css_parts.append(f"pre, code {{ font-weight: {'bold' if bold else 'normal'}; }}")

        italic = font.get("italic")
        if italic is not None:
            css_parts.append(f"pre, code {{ font-style: {'italic' if italic else 'normal'}; }}")

        # 行间距
        line_spacing = code_styles.get("lineSpacing")
        if line_spacing:
            css_parts.append(f"pre {{ line-height: {line_spacing}; }}")

        # 对齐
        alignment = code_styles.get("alignment")
        if alignment:
            css_parts.append(f"pre {{ text-align: {alignment}; }}")

        # 背景色
        if shading.get("fill"):
            css_parts.append(f"pre {{ background-color: {shading['fill']}; }}")

        # 边框
        if border.get("color") or border.get("widthPt"):
            border_color = border.get("color", "#000000")
            border_width = border.get("widthPt", 0.5)
            css_parts.append(f"pre {{ border: {border_width}pt solid {border_color}; }}")

        # 内边距
        pad_top = padding.get("topPt")
        pad_bottom = padding.get("bottomPt")
        pad_left = padding.get("leftPt")
        pad_right = padding.get("rightPt")
        if any(v is not None for v in [pad_top, pad_bottom, pad_left, pad_right]):
            t = f"{pad_top}pt" if pad_top is not None else "1rem"
            b = f"{pad_bottom}pt" if pad_bottom is not None else "1rem"
            l = f"{pad_left}pt" if pad_left is not None else "1.25rem"
            r = f"{pad_right}pt" if pad_right is not None else "1.25rem"
            css_parts.append(f"pre {{ padding: {t} {r} {b} {l}; }}")

        # pre 内的 code 透明背景，继承颜色
        css_parts.append("pre code { background: transparent; padding: 0; color: inherit; }")

        # 键盘样式
        keyboard = code_styles.get("keyboardStyle", {})
        if keyboard.get("foregroundColor"):
            css_parts.append(f"kbd {{ color: {keyboard['foregroundColor']}; }}")
        if keyboard.get("backgroundColor"):
            css_parts.append(f"kbd {{ background-color: {keyboard['backgroundColor']}; }}")

        return "\n".join(css_parts) + "\n" if css_parts else ""

    @staticmethod
    def get_table_css(template_binding: Optional[dict[str, Any]]) -> str:
        """生成表格 CSS"""
        from app.services.export.bindings import StyleBindings

        table_styles = StyleBindings.get_table_styles(template_binding)
        css_parts = []

        # 表格对齐和宽度
        table_align = table_styles.get("tableAlignment", "left")
        table_width = table_styles.get("tableWidth", 100)
        if table_align == "center":
            css_parts.append("table { margin-left: auto; margin-right: auto; }\n")
        elif table_align == "right":
            css_parts.append("table { margin-left: auto; margin-right: 0; }\n")
        css_parts.append(f"table {{ width: {table_width}%; }}\n")

        # 边框
        border = table_styles.get("border", {})
        # 将 'single' 转换为 CSS 的 'solid'
        raw_border_style = border.get("style", "single")
        css_border_style = "solid" if raw_border_style == "single" else raw_border_style
        all_borders = []
        if border.get("leftBorder", True):
            all_borders.append(f"border-left: {border.get('widthPt', 0.5)}pt {css_border_style} {border.get('color', '#000')};")
        if border.get("rightBorder", True):
            all_borders.append(f"border-right: {border.get('widthPt', 0.5)}pt {css_border_style} {border.get('color', '#000')};")
        if border.get("topBorder", True):
            all_borders.append(f"border-top: {border.get('widthPt', 0.5)}pt {css_border_style} {border.get('color', '#000')};")
        if border.get("bottomBorder", True):
            all_borders.append(f"border-bottom: {border.get('widthPt', 0.5)}pt {css_border_style} {border.get('color', '#000')};")
        if all_borders:
            css_parts.append(f"td, th {{ {' '.join(all_borders)} }}\n")

        # 内部边框
        inside_h = border.get("insideHorizontalBorder", True)
        inside_v = border.get("insideVerticalBorder", True)
        inside_color = border.get("color", "#000")
        inside_width = border.get("widthPt", 0.5)
        # 将 'single' 转换为 CSS 的 'solid'
        raw_style = border.get("style", "single")
        inside_style = "solid" if raw_style == "single" else raw_style
        if not inside_h and not inside_v:
            # 移除所有内部边框
            css_parts.append("td, th { border-left: none; border-right: none; border-top: none; border-bottom: none; }\n")
        elif not inside_h:
            # 只保留垂直边框（左右）
            css_parts.append(f"td, th {{ border-left: {inside_width}pt {inside_style} {inside_color}; border-right: {inside_width}pt {inside_style} {inside_color}; border-top: none; border-bottom: none; }}\n")
        elif not inside_v:
            # 只保留水平边框（上下）
            css_parts.append(f"td, th {{ border-top: {inside_width}pt {inside_style} {inside_color}; border-bottom: {inside_width}pt {inside_style} {inside_color}; border-left: none; border-right: none; }}\n")
        else:
            # 全部边框（默认）
            css_parts.append(f"td, th {{ border: {inside_width}pt {inside_style} {inside_color}; }}\n")

        # 底纹
        shading = table_styles.get("shading", {})
        shading_apply = shading.get("applyTo", "cell")
        if shading.get("fill"):
            if shading_apply == "cell":
                css_parts.append(f"td, th {{ background-color: {shading['fill']}; }}\n")
            elif shading_apply == "table":
                css_parts.append(f"table {{ background-color: {shading['fill']}; }}\n")

        # 表头样式
        header = table_styles.get("headerStyle") or {}
        if header:
            hf = header.get("font") or {}
            if hf.get("fontFamily"):
                css_parts.append(f"th {{ font-family: '{CssGenerator.font_display_name(hf['fontFamily'])}'; }}\n")
            if hf.get("fontSizePt"):
                css_parts.append(f"th {{ font-size: {hf['fontSizePt']}pt; }}\n")
            if hf.get("color"):
                css_parts.append(f"th {{ color: {hf['color']}; }}\n")
            if hf.get("bold"):
                css_parts.append("th { font-weight: bold; }\n")
            if hf.get("italic"):
                css_parts.append("th { font-style: italic; }\n")
            if hf.get("underline"):
                css_parts.append("th { text-decoration: underline; }\n")
            if header.get("align"):
                css_parts.append(f"th {{ text-align: {header['align']}; }}\n")
            if header.get("valign"):
                css_parts.append(f"th {{ vertical-align: {header['valign']}; }}\n")
            if header.get("lineHeight"):
                css_parts.append(f"th {{ line-height: {header['lineHeight']}; }}\n")
            hs = header.get("shading")
            if hs and hs.get("fill") and shading_apply == "cell":
                css_parts.append(f"th {{ background-color: {hs['fill']}; }}\n")

        # 数据行样式
        data_row = table_styles.get("dataRowStyle") or {}
        if data_row:
            df = data_row.get("font") or {}
            if df.get("fontFamily"):
                css_parts.append(f"td {{ font-family: '{CssGenerator.font_display_name(df['fontFamily'])}'; }}\n")
            if df.get("fontSizePt"):
                css_parts.append(f"td {{ font-size: {df['fontSizePt']}pt; }}\n")
            if df.get("color"):
                css_parts.append(f"td {{ color: {df['color']}; }}\n")
            if df.get("bold"):
                css_parts.append("td { font-weight: bold; }\n")
            if data_row.get("align"):
                css_parts.append(f"td {{ text-align: {data_row['align']}; }}\n")
            if data_row.get("valign"):
                css_parts.append(f"td {{ vertical-align: {data_row['valign']}; }}\n")
            if data_row.get("lineHeight"):
                css_parts.append(f"td {{ line-height: {data_row['lineHeight']}; }}\n")
            # 数据行底纹
            drs = data_row.get("shading") or {}
            if drs.get("fill") and shading_apply == "cell":
                css_parts.append(f"td {{ background-color: {drs['fill']}; }}\n")

        # 单元格内边距
        cell_pad = table_styles.get("cellPadding") or {}
        if cell_pad:
            pad_top = cell_pad.get("top", 0.14)
            pad_bottom = cell_pad.get("bottom", 0.14)
            pad_left = cell_pad.get("left", 0)
            pad_right = cell_pad.get("right", 0)
            css_parts.append(f"td, th {{ padding: {pad_top}cm {pad_right}cm {pad_bottom}cm {pad_left}cm; }}\n")

        return "".join(css_parts)

    # 有序列表格式 → CSS list-style-type 映射
    ORDERED_FORMAT_MAP: dict[str, str] = {
        "1.": "decimal",
        "2.": "decimal",
        "3.": "decimal",
        "a.": "lower-alpha",
        "A.": "upper-alpha",
        "(1)": "decimal",
        "一.": "cjk-ideographic",
        "一、": "cjk-ideographic",
        "第": "cjk-ideographic",
    }

    @staticmethod
    def get_list_css(template_binding: Optional[dict[str, Any]]) -> str:
        """生成列表 CSS"""
        from app.services.export.bindings import StyleBindings

        list_styles = StyleBindings.get_list_styles(template_binding)
        css_parts = []

        bullet = list_styles.get("bullet", {})
        if bullet:
            char = bullet.get("character", "●")
            color = bullet.get("color", "inherit")
            font_id = bullet.get("fontFamily")
            indent_cm = bullet.get("indentCm")
            space_before = bullet.get("spacingBeforeLines")
            space_after = bullet.get("spacingAfterLines")
            line_spacing = bullet.get("lineSpacing")

            # 自定义符号需要用 ::before 实现（CSS content 才能放任意字符）
            # 使用双引号包裹以避免符号中含单引号时破坏 CSS 字符串
            safe_char = char.replace('"', '\\"') if char else "●"
            css_parts.append(
                f"ul li {{ list-style: none; position: relative; }}"
            )
            css_parts.append(
                f'ul li::before {{ content: "{safe_char}"; color: {color}; position: absolute; left: -1.2em; }}'
            )
            if font_id:
                font_name = CssGenerator.font_display_name(font_id)
                css_parts.append(f"ul li::before {{ font-family: '{font_name}', sans-serif; }}")
            if indent_cm:
                css_parts.append(f"ul {{ padding-left: {indent_cm}cm; }}")
            ul_margin_parts = []
            if space_before is not None:
                ul_margin_parts.append(f"margin-top: {space_before}em;")
            if space_after is not None:
                ul_margin_parts.append(f"margin-bottom: {space_after}em;")
            if line_spacing is not None:
                ul_margin_parts.append(f"line-height: {line_spacing};")
            if ul_margin_parts:
                css_parts.append(f"ul {{ {' '.join(ul_margin_parts)} }}")

        ordered = list_styles.get("ordered", {})
        if ordered:
            fmt = ordered.get("format", "1.")
            list_type = CssGenerator.ORDERED_FORMAT_MAP.get(fmt, "decimal")
            color = ordered.get("color", "inherit")
            font_id = ordered.get("fontFamily")
            indent_cm = ordered.get("indentCm")
            space_before = ordered.get("spacingBeforeLines")
            space_after = ordered.get("spacingAfterLines")
            line_spacing = ordered.get("lineSpacing")

            css_parts.append(f"ol {{ list-style-type: {list_type}; }}")
            css_parts.append(f"ol li::marker {{ color: {color}; }}")
            if font_id:
                font_name = CssGenerator.font_display_name(font_id)
                css_parts.append(f"ol li::marker {{ font-family: '{font_name}', sans-serif; }}")
            if indent_cm:
                css_parts.append(f"ol {{ padding-left: {indent_cm}cm; }}")
            ol_margin_parts = []
            if space_before is not None:
                ol_margin_parts.append(f"margin-top: {space_before}em;")
            if space_after is not None:
                ol_margin_parts.append(f"margin-bottom: {space_after}em;")
            if line_spacing is not None:
                ol_margin_parts.append(f"line-height: {line_spacing};")
            if ol_margin_parts:
                css_parts.append(f"ol {{ {' '.join(ol_margin_parts)} }}")

        return "\n".join(css_parts) + "\n" if css_parts else ""

    @staticmethod
    def get_image_css(template_binding: Optional[dict[str, Any]]) -> str:
        """生成图片 CSS"""
        from app.services.export.bindings import StyleBindings

        image_styles = StyleBindings.get_image_styles(template_binding)
        css_parts = []

        # 间距
        spacing = image_styles.get("spacing", {})
        margin_top = spacing.get("marginTopCm", 0)
        margin_bottom = spacing.get("marginBottomCm", 0)
        margin_left = spacing.get("marginLeftCm", 0)
        margin_right = spacing.get("marginRightCm", 0)
        if any([margin_top, margin_bottom, margin_left, margin_right]):
            css_parts.append(f"img {{ margin: {margin_top}cm {margin_right}cm {margin_bottom}cm {margin_left}cm; }}\n")

        # 边框
        border = image_styles.get("border", {})
        if border.get("showBorder"):
            border_color = border.get("color", "#000")
            border_width = border.get("widthPt", 1)
            css_parts.append(f"img {{ border: {border_width}pt solid {border_color}; }}\n")

        return "".join(css_parts)

    @staticmethod
    def get_full_css(template_binding: Optional[dict[str, Any]], font_family: str | None = None) -> str:
        """生成完整的 CSS"""
        css_parts = [
            CssGenerator.get_page_css(template_binding, font_family),
            CssGenerator.get_codeblock_css(template_binding),
            CssGenerator.get_table_css(template_binding),
            CssGenerator.get_list_css(template_binding),
            CssGenerator.get_image_css(template_binding),
        ]
        return "\n".join(css_parts)

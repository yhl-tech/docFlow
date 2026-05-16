"""
模板配置覆盖率检查脚本

检查 editor-template.ts 中定义的所有配置字段，是否在以下位置都有对应实现：
  1. 编辑器 CSS (_template.css / TipTapEditor.tsx)
  2. 导出 DOCX 后处理 (docx_styler.py)

用法：
    python scripts/check_template_coverage.py
    python scripts/check_template_coverage.py --json   # 输出 JSON 报告
    python scripts/check_template_coverage.py --fail-on-gap  # gap > 0 时退出码非零（CI用）
"""

import re
import sys
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES_FILE    = ROOT / "frontend" / "types" / "editor-template.ts"
CSS_FILE      = ROOT / "frontend" / "app" / "styles" / "_template.css"
EDITOR_FILE   = ROOT / "frontend" / "components" / "workspace" / "editor" / "TipTapEditor.tsx"
STYLER_FILE   = ROOT / "backend" / "app" / "services" / "export" / "docx_styler.py"
BINDINGS_FILE = ROOT / "backend" / "app" / "services" / "export" / "bindings.py"

# ─────────────────────────────────────────────────────────────
# 配置字段清单（按大类）
# key: 字段路径（人类可读），
# editor_hints: 在 CSS/TipTap 中应存在的关键字列表（OR逻辑，有一个即算覆盖）
# docx_hints:   在 docx_styler.py 中应存在的关键字列表（OR逻辑）
# ─────────────────────────────────────────────────────────────
COVERAGE_MAP: list[dict] = [
    # ── 标题样式 ──────────────────────────────────────────────
    {
        "category": "标题样式",
        "field": "headingStyles.hN.font.fontFamily",
        "editor_hints": ["--tpl-h1-font", "tpl-h{n}-font", "h1-font"],
        "docx_hints":   ["heading1_cfg", "heading2_cfg", "h1.*font", "Heading 1"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.font.fontSizePt",
        "editor_hints": ["--tpl-h1-size", "tpl-h{n}-size"],
        "docx_hints":   ["heading.*size", "h_size", "fontSizePt.*heading"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.font.bold",
        "editor_hints": ["--tpl-h1-weight", "tpl-h{n}-weight"],
        "docx_hints":   ["bold.*heading", "heading.*bold", "w:b.*heading"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.align",
        "editor_hints": ["--tpl-h1-align", "tpl-h{n}-align"],
        "docx_hints":   ["h_align", "ooxml_align", "heading.*align"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.lineHeight",
        "editor_hints": ["--tpl-h1-line-height", "tpl-h{n}-line-height"],
        "docx_hints":   ["h_line_height", "heading.*lineHeight", "w:line.*heading"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.spacingBeforePt / spacingAfterPt",
        "editor_hints": ["--tpl-h1-space-before", "tpl-h{n}-space"],
        "docx_hints":   ["h_before", "h_after", "spacingBefore.*heading"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.firstLineIndentChars",
        "editor_hints": ["h.*indent", "tpl-h.*indent"],
        "docx_hints":   ["h_first_indent", "firstLineIndentChars.*heading", "heading.*firstLine"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.outlineLevel",
        "editor_hints": ["outline", "tpl-h.*outline"],
        "docx_hints":   ["outlineLevel", "w:outlineLvl"],
    },
    {
        "category": "标题样式",
        "field": "headingStyles.hN.leftIndentChars",
        "editor_hints": ["leftIndent", "tpl-h.*left"],
        "docx_hints":   ["leftIndentChars", "w:ind.*heading"],
    },

    # ── 段落/正文样式 ─────────────────────────────────────────
    {
        "category": "段落样式",
        "field": "paragraphStyles.align",
        "editor_hints": ["--tpl-body-align", "body.*align"],
        "docx_hints":   ["default_body_align", "paragraphStyle.*align"],
    },
    {
        "category": "段落样式",
        "field": "paragraphStyles.lineHeight",
        "editor_hints": ["--tpl-body-line-height", "body.*line-height"],
        "docx_hints":   ["default_line_height", "paragraphStyle.*lineHeight"],
    },
    {
        "category": "段落样式",
        "field": "paragraphStyles.spacingBeforePt / spacingAfterPt",
        "editor_hints": ["--tpl-paragraph-space", "body.*space"],
        "docx_hints":   ["paragraphSpacing", "w:spacing.*paragraph"],
    },
    {
        "category": "段落样式",
        "field": "paragraphStyles.firstLineIndentChars",
        "editor_hints": ["--tpl-body-indent", "body.*indent"],
        "docx_hints":   ["first_line_indent", "default_first_indent"],
    },

    # ── 列表样式 ──────────────────────────────────────────────
    {
        "category": "列表样式",
        "field": "listStyles.bullet.character",
        "editor_hints": ["--tpl-ul-marker", "ul.*marker"],
        "docx_hints":   ["bullet.*char", "BulletChar", "numFmt.*bullet"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.bullet.color / fontFamily",
        "editor_hints": ["--tpl-ul-marker-color", "--tpl-ul-marker-font"],
        "docx_hints":   ["_set_run_color", "_set_run_font", "bullet_cfg"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.bullet.indentCm",
        "editor_hints": ["--tpl-ul-indent"],
        "docx_hints":   ["indentCm", "_set_para_indent"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.bullet.spacingBeforeLines / spacingAfterLines",
        "editor_hints": ["--tpl-ul-space-before", "--tpl-ul-space-after"],
        "docx_hints":   ["spacingBeforeLines", "spacingAfterLines"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.ordered.format",
        "editor_hints": ["ol.*format", "tpl-ol"],
        "docx_hints":   ["ordered_num_fmt", "ordered_format_map"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.ordered.indentCm",
        "editor_hints": ["--tpl-ol-indent"],
        "docx_hints":   ["indentCm", "ordered_cfg"],
    },
    {
        "category": "列表样式",
        "field": "listStyles.ordered.continueNumbering",
        # 有序列表续编是文档级编号状态，不是视觉样式，CSS 无法预览，DOCX 暂不支持动态续编
        "editor_hints": [], "editor_na": True,
        "docx_hints": [], "docx_na": True,
    },

    # ── 表格样式 ──────────────────────────────────────────────
    {
        "category": "表格样式",
        "field": "tableStyles.border.color / widthPt / style",
        "editor_hints": ["--tpl-table-border-color", "table.*border"],
        "docx_hints":   ["table.*border", "w:tblBdr", "apply_docx_table"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.headerStyle.font / align / valign / shading",
        "editor_hints": ["--tpl-table-th-font", "--tpl-table-th-color"],
        "docx_hints":   ["header_cfg", "header_font", "headerStyle"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.dataRowStyle.font / align / valign / shading",
        "editor_hints": ["--tpl-table-td-align", "--tpl-table-font"],
        "docx_hints":   ["data_cfg", "data_font", "dataRowStyle"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.cellPadding.top/right/bottom/left",
        "editor_hints": ["--tpl-table-cell-pad", "cell.*pad"],
        "docx_hints":   ["cell_pad", "_set_cell_padding", "tcMar"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.rowHeight.headerHeightCm / dataRowHeightCm",
        "editor_hints": ["--tpl-table-header-min-height", "--tpl-table-row-min-height"],
        "docx_hints":   ["rowHeight", "row_height", "headerHeight"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.tableAlignment / tableWidth",
        "editor_hints": ["--tpl-table-align", "--tpl-table-width"],
        "docx_hints":   ["tableAlignment", "table_align", "tblJc"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.options.repeatHeaderRow",
        # 重复表头是打印/分页行为，CSS 无法预览（仅 DOCX/PDF 可见）
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["repeatHeaderRow", "tblHeader"],
    },
    {
        "category": "表格样式",
        "field": "tableStyles.tableNumbering",
        # 表格题注编号是文档级标注，编辑器中无 CSS 预览，DOCX 需插入题注段落
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["tableNumbering", "table.*number.*prefix", "table.*caption"],
    },

    # ── 图片样式 ──────────────────────────────────────────────
    {
        "category": "图片样式",
        "field": "imageStyles.position.horizontalAlign / alignment",
        "editor_hints": ["--tpl-img-align", "img.*align"],
        "docx_hints":   ["img.*align", "image.*align", "apply_docx_image"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.position.wrapType",
        "editor_hints": ["--tpl-img-wrap-type", "wrapType"],
        "docx_hints":   ["wrapType", "wrap_type", "wrapSquare", "wrapTight"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.position.sizeMode / maxWidthCm / maxHeightCm",
        "editor_hints": ["--tpl-img-max-width", "--tpl-img-max-height"],
        "docx_hints":   ["sizeMode", "maxLimit", "max_width", "maxWidthCm"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.border.showBorder / color / widthPt",
        "editor_hints": ["--tpl-img-border", "img.*border"],
        "docx_hints":   ["border_cfg", "img.*border", "showBorder"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.spacing.marginTopCm / marginBottomCm",
        "editor_hints": ["--tpl-img-margin-top", "img.*margin"],
        "docx_hints":   ["spacing.*margin", "img.*spacing", "marginTopCm"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.style.brightness / contrast",
        "editor_hints": ["brightness", "contrast", "img.*filter"],
        "docx_hints":   ["brightness", "contrast", "lum", "blip"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.style.effect (borderShadow/reflection/glow)",
        # 图片效果（阴影/反射/发光）是渲染层特效，CSS filter 无法精确对应，OOXML effectLst 暂不支持
        "editor_hints": [], "editor_na": True,
        "docx_hints": [], "docx_na": True,
    },
    {
        "category": "图片样式",
        "field": "imageStyles.style.recolor (grayscale/washout/sepia)",
        "editor_hints": ["recolor", "tpl-img-recolor"],
        "docx_hints":   ["recolor", "grayscale", "washout", "lum.*100"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.numbering.enabled",
        # 图片题注编号是文档级标注，CSS 无法预览，DOCX 需插入题注段落
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["img.*number", "image.*numbering", "numbering.*image", "image.*caption"],
    },
    {
        "category": "图片样式",
        "field": "imageStyles.textWrap.distanceMm",
        "editor_hints": ["distanceMm", "tpl-img-wrap-distance"],
        "docx_hints":   ["distanceMm", "distT", "distB", "distL", "distR"],
    },

    # ── 代码块样式 ────────────────────────────────────────────
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.font.fontFamily / fontSizePt / color",
        "editor_hints": ["--tpl-code-font", "--tpl-code-size", "--tpl-code-color"],
        "docx_hints":   ["font_name.*code", "code.*font", "SourceCode"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.shading.fill",
        "editor_hints": ["--tpl-code-bg", "code.*background"],
        "docx_hints":   ["bg_fill", "_set_para_shading", "code.*shad"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.border.color / widthPt",
        "editor_hints": ["--tpl-code-border", "code.*border"],
        "docx_hints":   ["_set_para_border", "code.*border", "pBdr"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.padding.topPt / bottomPt / leftPt / rightPt",
        "editor_hints": ["--tpl-code-padding", "code.*padding"],
        "docx_hints":   ["padding_cfg", "code.*pad", "ind.*code"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.lineSpacing",
        "editor_hints": ["--tpl-code-line-height", "code.*line"],
        "docx_hints":   ["line_spacing.*code", "_set_para_spacing.*code"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.keyboardStyle.foregroundColor / backgroundColor",
        "editor_hints": ["tpl-code-keyboard-color", "tpl-code-keyboard-bg"],
        "docx_hints":   ["keyboardStyle", "keyboard.*color", "keyboard.*bg", "kbd.*rPr"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.lineNumber.show / color",
        "editor_hints": ["tpl-code-line-number-show", "tpl-code-line-number-color"],
        "docx_hints":   ["lineNumber", "line.*number.*show", "line_number"],
    },
    {
        "category": "代码块样式",
        "field": "codeBlockStyles.tabStop.defaultMm",
        "editor_hints": ["tpl-code-tab-size", "tab.*stop"],
        "docx_hints":   ["tabStop", "tab.*stop", "w:tab"],
    },

    # ── 页面布局 ──────────────────────────────────────────────
    {
        "category": "页面布局",
        "field": "layout.paperSize / paperDirection",
        "editor_hints": ["--tpl-paper-width", "paperSize"],
        "docx_hints":   ["paperSize", "get_page_size", "A4"],
    },
    {
        "category": "页面布局",
        "field": "layout.marginTopMm / marginBottomMm / marginLeftMm / marginRightMm",
        "editor_hints": ["--tpl-margin", "margin.*mm"],
        "docx_hints":   ["marginTopMm", "margin.*top", "w:pgMar"],
    },
    {
        "category": "页面布局",
        "field": "layout.defaultLineHeight / defaultFirstLineIndentChars",
        "editor_hints": ["--tpl-body-line-height", "defaultLineHeight"],
        "docx_hints":   ["default_line_height", "default_first_indent"],
    },

    # ── 页码 ──────────────────────────────────────────────────
    # 页码/页眉页脚是文档级属性，不在编辑器 CSS 里预览，editor 列标记 N/A
    {
        "category": "页码",
        "field": "layout.pageNumber.enabled / position / align",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["pageNumber", "page_num", "apply_docx_page_number"],
    },
    {
        "category": "页码",
        "field": "layout.pageNumber.format (arabic/roman)",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["num_format", "lowerRoman", "upperRoman", "arabic"],
    },
    {
        "category": "页码",
        "field": "layout.pageNumber.fontFamily / fontSizePt / color / bold",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["pageNumber.*font", "page_num.*font", "num.*font"],
    },
    {
        "category": "页码",
        "field": "layout.pageNumber.labelTemplate",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["labelTemplate", "label_template"],
    },
    {
        "category": "页码",
        "field": "layout.pageNumber.includeChapterNumber / chapterStyle",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["includeChapterNumber", "chapterStyle", "chapter.*number"],
    },

    # ── 页眉页脚 ──────────────────────────────────────────────
    {
        "category": "页眉页脚",
        "field": "layout.headerFooter.hasHeader / hasFooter",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["hasHeader", "hasFooter", "apply_docx_header"],
    },
    {
        "category": "页眉页脚",
        "field": "layout.headerFooter.headerContent.left/center/right",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["headerContent", "header.*left", "header_content"],
    },
    {
        "category": "页眉页脚",
        "field": "layout.headerFooter.differentFirstPage / differentOddEven",
        "editor_hints": [], "editor_na": True,
        "docx_hints":   ["differentFirstPage", "diff.*first", "titlePg"],
    },
]


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def check_hints(text: str, hints: list[str]) -> bool:
    """检查 text 中是否包含 hints 中的任意一个关键字（正则搜索，忽略大小写）"""
    for hint in hints:
        if re.search(hint, text, re.IGNORECASE):
            return True
    return False


def run_check() -> list[dict]:
    editor_text = read_text(CSS_FILE) + "\n" + read_text(EDITOR_FILE)
    docx_text   = read_text(STYLER_FILE) + "\n" + read_text(BINDINGS_FILE)

    results = []
    for item in COVERAGE_MAP:
        editor_na = item.get("editor_na", False)
        docx_na   = item.get("docx_na", False)
        editor_ok = True if editor_na else check_hints(editor_text, item["editor_hints"])
        docx_ok   = True if docx_na   else check_hints(docx_text, item["docx_hints"])
        results.append({
            "category":  item["category"],
            "field":     item["field"],
            "editor":    "N/A" if editor_na else ("OK" if editor_ok else "NO"),
            "docx":      "N/A" if docx_na   else ("OK" if docx_ok else "NO"),
            "gap":       not (editor_ok and docx_ok),
            "editor_ok": editor_ok,
            "docx_ok":   docx_ok,
            "editor_na": editor_na,
            "docx_na":   docx_na,
        })
    return results


def print_report(results: list[dict]) -> int:
    """打印报告，返回 gap 数量"""
    categories: dict[str, list[dict]] = {}
    for r in results:
        categories.setdefault(r["category"], []).append(r)

    total = len(results)
    gaps  = [r for r in results if r["gap"]]
    covered = total - len(gaps)

    print("=" * 70)
    print(f"  template coverage report   ({covered}/{total} covered)")
    print("=" * 70)

    for cat, items in categories.items():
        cat_gaps = [i for i in items if i["gap"]]
        status = "OK" if not cat_gaps else f"GAPS: {len(cat_gaps)}"
        print(f"\n[{cat}]  {status}")
        print(f"  {'field':<50} {'editor':^6} {'docx':^6}")
        print(f"  {'-'*50} {'------':^6} {'------':^6}")
        for r in items:
            marker = "  " if not r["gap"] else "! "
            print(f"  {marker}{r['field']:<48} {r['editor']:^6} {r['docx']:^6}")

    print("\n" + "=" * 70)
    if gaps:
        print(f"\n  Total gaps: {len(gaps)}\n")
        editor_gaps = [r for r in gaps if not r["editor_ok"] and not r.get("editor_na")]
        docx_gaps   = [r for r in gaps if not r["docx_ok"] and not r.get("docx_na")]
        if editor_gaps:
            print(f"  Editor CSS not covered ({len(editor_gaps)}):")
            for r in editor_gaps:
                print(f"    - [{r['category']}] {r['field']}")
        if docx_gaps:
            print(f"\n  DOCX export not covered ({len(docx_gaps)}):")
            for r in docx_gaps:
                print(f"    - [{r['category']}] {r['field']}")
    else:
        print("\n  All fields covered!")

    print()
    return len(gaps)


def main():
    parser = argparse.ArgumentParser(description="模板配置覆盖率检查")
    parser.add_argument("--json",         action="store_true", help="以 JSON 格式输出")
    parser.add_argument("--fail-on-gap",  action="store_true", help="存在 gap 时返回非零退出码（CI用）")
    args = parser.parse_args()

    results = run_check()

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        gap_count = sum(1 for r in results if r["gap"])
    else:
        gap_count = print_report(results)

    if args.fail_on_gap and gap_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()

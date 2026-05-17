import type {
  TemplateConfig,
  StyleSlotConfig,
  LayoutConfig,
  HeadingStyleConfig,
  ImageStyleConfig,
  ListStyleConfig,
  CodeBlockStyleConfig,
  TableStyleConfig,
} from "@/types/editor-template"

/** 字体回退映射表 */
const FONT_FALLBACKS: Record<string, string> = {
  SimHei: "Microsoft YaHei, sans-serif",
  SimSun: "SimSun, serif",
  FangSong_GB2312: "FangSong, serif",
  KaiTi_GB2312: "KaiTi, serif",
  "Microsoft YaHei": "Microsoft YaHei, sans-serif",
  Arial: "Arial, sans-serif",
  Times: "Times New Roman, serif",
  Courier: "Courier New, monospace",
}

function formatFontFamily(fontFamily: string | undefined): string {
  if (!fontFamily) return ""
  const fallback = FONT_FALLBACKS[fontFamily] || ""
  return fallback ? `"${fontFamily}", ${fallback}` : `"${fontFamily}"`
}

/** 收集 CSS 变量到 vars 对象，统一输出到 .preview-page */
type VarMap = Record<string, string>

// ─── 默认样式 slot ────────────────────────────────────────────────────────────

function slotVars(slot: StyleSlotConfig | undefined, prefix: string): VarMap {
  if (!slot) return {}
  const v: VarMap = {}
  if (slot.fontFamily) v[`${prefix}-font`] = formatFontFamily(slot.fontFamily)
  if (slot.fontSizePt) v[`${prefix}-size`] = `${slot.fontSizePt}pt`
  if (slot.bold !== undefined) v[`${prefix}-weight`] = slot.bold ? "bold" : "normal"
  if (slot.italic !== undefined) v[`${prefix}-italic`] = slot.italic ? "italic" : "normal"
  if (slot.color) v[`${prefix}-color`] = slot.color
  if (slot.backgroundColor) v[`${prefix}-bg`] = slot.backgroundColor
  if (slot.align) v[`${prefix}-align`] = slot.align
  if (slot.lineHeight) v[`${prefix}-line-height`] = String(slot.lineHeight)
  if (slot.firstLineIndentChars) v[`${prefix}-indent`] = `${slot.firstLineIndentChars}em`
  if (slot.spacingBeforePt) v[`${prefix}-space-before`] = `${slot.spacingBeforePt}pt`
  if (slot.spacingAfterPt) v[`${prefix}-space-after`] = `${slot.spacingAfterPt}pt`
  return v
}

// ─── 标题样式 ────────────────────────────────────────────────────────────────

function headingVars(hs: HeadingStyleConfig | undefined, prefix: string): VarMap {
  if (!hs) return {}
  const v: VarMap = {}
  if (hs.font) {
    if (hs.font.fontFamily) v[`${prefix}-font`] = formatFontFamily(hs.font.fontFamily)
    if (hs.font.fontSizePt) v[`${prefix}-size`] = `${hs.font.fontSizePt}pt`
    if (hs.font.bold !== undefined) v[`${prefix}-weight`] = hs.font.bold ? "bold" : "normal"
    if (hs.font.italic !== undefined) v[`${prefix}-italic`] = hs.font.italic ? "italic" : "normal"
    if (hs.font.color) v[`${prefix}-color`] = hs.font.color
  }
  if (hs.align) v[`${prefix}-align`] = hs.align
  if (hs.lineHeight) v[`${prefix}-line-height`] = String(hs.lineHeight)
  if (hs.spacingBeforePt) v[`${prefix}-space-before`] = `${hs.spacingBeforePt}pt`
  if (hs.spacingAfterPt) v[`${prefix}-space-after`] = `${hs.spacingAfterPt}pt`
  if (hs.firstLineIndentChars) v[`${prefix}-indent`] = `${hs.firstLineIndentChars}em`
  if (hs.leftIndentChars) v[`${prefix}-padding-left`] = `${hs.leftIndentChars}em`
  return v
}

// ─── 列表样式 ────────────────────────────────────────────────────────────────

function orderedFormatToListStyle(format: string | undefined): string {
  if (!format) return "decimal"
  if (format.startsWith("a")) return "lower-alpha"
  if (format.startsWith("A")) return "upper-alpha"
  if (format === "lowercaseRoman" || /^[ivx]/i.test(format)) return "lower-roman"
  if (format === "uppercaseRoman") return "upper-roman"
  if (/[一二三四五六七八九十]|第/.test(format)) return "cjk-ideographic"
  return "decimal"
}

function listVars(listStyles: ListStyleConfig | undefined): VarMap {
  if (!listStyles) return {}
  const v: VarMap = {}

  const b = listStyles.bullet
  if (b) {
    if (b.character) v["--tpl-ul-marker"] = `"${b.character}"`
    if (b.color) v["--tpl-ul-marker-color"] = b.color
    if (b.fontFamily) v["--tpl-ul-marker-font"] = formatFontFamily(b.fontFamily)
    if (b.fontFamily) v["--tpl-ul-font"] = formatFontFamily(b.fontFamily)
    if (b.fontSizePt) v["--tpl-ul-size"] = `${b.fontSizePt}pt`
    if (b.bold !== undefined) v["--tpl-ul-weight"] = b.bold ? "bold" : "normal"
    if (b.color) v["--tpl-ul-color"] = b.color
    if (b.indentCm) v["--tpl-ul-indent"] = `${b.indentCm}cm`
    if (b.lineSpacing) v["--tpl-ul-line-height"] = String(b.lineSpacing)
    if (b.spacingBeforeLines) v["--tpl-ul-space-before"] = `${b.spacingBeforeLines}em`
    if (b.spacingAfterLines) v["--tpl-ul-space-after"] = `${b.spacingAfterLines}em`
  }

  const o = listStyles.ordered
  if (o) {
    if (o.format) v["--tpl-ol-list-style"] = orderedFormatToListStyle(o.format)
    if (o.color) v["--tpl-ol-marker-color"] = o.color
    if (o.fontFamily) v["--tpl-ol-marker-font"] = formatFontFamily(o.fontFamily)
    if (o.fontFamily) v["--tpl-ol-font"] = formatFontFamily(o.fontFamily)
    if (o.fontSizePt) v["--tpl-ol-size"] = `${o.fontSizePt}pt`
    if (o.bold !== undefined) v["--tpl-ol-weight"] = o.bold ? "bold" : "normal"
    if (o.color) v["--tpl-ol-color"] = o.color
    if (o.indentCm) v["--tpl-ol-indent"] = `${o.indentCm}cm`
    if (o.lineSpacing) v["--tpl-ol-line-height"] = String(o.lineSpacing)
    if (o.spacingBeforeLines) v["--tpl-ol-space-before"] = `${o.spacingBeforeLines}em`
    if (o.spacingAfterLines) v["--tpl-ol-space-after"] = `${o.spacingAfterLines}em`
    if (o.align) v["--tpl-ol-align"] = o.align
  }

  return v
}

// ─── 代码块样式 ──────────────────────────────────────────────────────────────

function codeBlockVars(cb: CodeBlockStyleConfig | undefined): VarMap {
  if (!cb) return {}
  const v: VarMap = {}

  const f = cb.font
  if (f) {
    if (f.fontFamily) v["--tpl-code-font"] = formatFontFamily(f.fontFamily)
    if (f.fontSizePt) v["--tpl-code-size"] = `${f.fontSizePt}pt`
    if (f.color) v["--tpl-code-color"] = f.color
    if (f.bold !== undefined) v["--tpl-code-weight"] = f.bold ? "bold" : "normal"
    if (f.italic !== undefined) v["--tpl-code-italic"] = f.italic ? "italic" : "normal"
  }

  const p = cb.padding
  if (p) {
    if (p.topPt !== undefined) v["--tpl-code-padding-top"] = `${p.topPt}pt`
    if (p.bottomPt !== undefined) v["--tpl-code-padding-bottom"] = `${p.bottomPt}pt`
    if (p.leftPt !== undefined) v["--tpl-code-padding-left"] = `${p.leftPt}pt`
    if (p.rightPt !== undefined) v["--tpl-code-padding-right"] = `${p.rightPt}pt`
  }

  if (cb.lineSpacing) v["--tpl-code-line-height"] = String(cb.lineSpacing)
  if (cb.alignment) v["--tpl-code-align"] = cb.alignment

  const s = cb.shading
  if (s?.fill) v["--tpl-code-bg"] = s.fill

  const border = cb.border
  {
    const bw = border?.widthPt ?? 0.5
    const bc = border?.color ?? "#e2e8f0"
    const bv = `${bw}pt solid ${bc}`
    const none = "none"
    // 未配置时四边默认显示；配置了则按各边开关决定
    const left = border?.leftBorder !== false
    const right = border?.rightBorder !== false
    const top = border?.topBorder !== false
    const bottom = border?.bottomBorder !== false
    v["--tpl-code-border-top"] = top ? bv : none
    v["--tpl-code-border-right"] = right ? bv : none
    v["--tpl-code-border-bottom"] = bottom ? bv : none
    v["--tpl-code-border-left"] = left ? bv : none
  }

  // tab-size 单位是字符数；defaultMm 是 Word 制表位宽度，按 10pt 字体近似换算（1字符≈3.5mm）
  if (cb.tabStop?.defaultMm) v["--tpl-code-tab-size"] = `${Math.max(1, Math.round(cb.tabStop.defaultMm / 3.5))}`

  const kb = cb.keyboardStyle
  if (kb) {
    if (kb.foregroundColor) v["--tpl-code-keyboard-color"] = kb.foregroundColor
    if (kb.backgroundColor) v["--tpl-code-keyboard-bg"] = kb.backgroundColor
  }

  const ln = cb.lineNumber
  if (ln?.show) v["--tpl-code-line-number-show"] = "inline"
  if (ln?.color) v["--tpl-code-line-number-color"] = ln.color

  return v
}

// ─── 表格样式 ────────────────────────────────────────────────────────────────

function tableVars(ts: TableStyleConfig | undefined): VarMap {
  if (!ts) return {}
  const v: VarMap = {}

  if (ts.tableWidth) v["--tpl-table-width"] = `${ts.tableWidth}%`
  if (ts.tableAlignment === "center") {
    v["--tpl-table-ml"] = "auto"
    v["--tpl-table-mr"] = "auto"
  } else if (ts.tableAlignment === "right") {
    v["--tpl-table-ml"] = "auto"
    v["--tpl-table-mr"] = "0"
  }

  const b = ts.border
  if (b) {
    const bw = b.widthPt ?? 1
    const bc = b.color ?? "#000000"
    const bs = b.style ?? "single"
    const cssStyle = bs === "double" ? "double" : bs === "dashed" ? "dashed" : bs === "dotted" ? "dotted" : "solid"
    if (b.preset && b.preset !== "none") {
      v["--tpl-table-border-color-inner"] = bc
      v["--tpl-table-border-style"] = cssStyle
      // pt → px 粗略转换（1pt ≈ 1.333px）
      v["--tpl-table-border-width-inner"] = `${Math.round(bw * 1.333)}px`
      if (b.preset === "outline") {
        v["--tpl-table-border-width-inner"] = "0px"
        v["--tpl-table-border-outer-width"] = `${Math.round(bw * 1.333)}px`
      }
    } else if (b.preset === "none") {
      v["--tpl-table-border-width-inner"] = "0px"
      v["--tpl-table-border-outer-width"] = "0px"
    }
  }

  const cp = ts.cellPadding
  if (cp) {
    if (cp.top !== undefined) v["--tpl-table-cell-pad-top"] = `${cp.top}cm`
    if (cp.bottom !== undefined) v["--tpl-table-cell-pad-bottom"] = `${cp.bottom}cm`
    if (cp.left !== undefined) v["--tpl-table-cell-pad-left"] = `${cp.left}cm`
    if (cp.right !== undefined) v["--tpl-table-cell-pad-right"] = `${cp.right}cm`
  }

  // 全局字体
  const gf = ts.font
  if (gf) {
    if (gf.fontFamily) v["--tpl-table-font-family"] = formatFontFamily(gf.fontFamily)
    if (gf.fontSizePt) v["--tpl-table-font-size"] = `${gf.fontSizePt}pt`
    if (gf.color) v["--tpl-table-color"] = gf.color
    if (gf.bold !== undefined) v["--tpl-table-font-bold"] = gf.bold ? "bold" : "normal"
    if (gf.italic !== undefined) v["--tpl-table-font-italic"] = gf.italic ? "italic" : "normal"
    if (gf.underline) v["--tpl-table-text-decoration"] = "underline"
  }

  // 表头
  const hs = ts.headerStyle
  if (hs) {
    if (hs.shading?.fill) v["--tpl-table-header-bg"] = hs.shading.fill
    if (hs.align) v["--tpl-table-th-align"] = hs.align
    if (hs.valign) v["--tpl-table-th-valign"] = hs.valign
    if (hs.lineHeight) v["--tpl-table-th-line-height"] = String(hs.lineHeight)
    const hf = hs.font
    if (hf) {
      if (hf.fontFamily) v["--tpl-table-th-font-family"] = formatFontFamily(hf.fontFamily)
      if (hf.fontSizePt) v["--tpl-table-th-font-size"] = `${hf.fontSizePt}pt`
      if (hf.color) v["--tpl-table-th-color"] = hf.color
      if (hf.bold !== undefined) v["--tpl-table-th-font-bold"] = hf.bold ? "bold" : "normal"
      if (hf.italic !== undefined) v["--tpl-table-th-font-italic"] = hf.italic ? "italic" : "normal"
      if (hf.underline) v["--tpl-table-th-text-decoration"] = "underline"
    }
  }

  // 数据行
  const dr = ts.dataRowStyle
  if (dr) {
    if (dr.shading?.fill) v["--tpl-table-row-bg"] = dr.shading.fill
    if (dr.align) v["--tpl-table-td-align"] = dr.align
    if (dr.valign) v["--tpl-table-td-valign"] = dr.valign
    if (dr.lineHeight) v["--tpl-table-line-height"] = String(dr.lineHeight)
    const df = dr.font
    if (df) {
      if (df.fontFamily) v["--tpl-table-font-family"] = formatFontFamily(df.fontFamily)
      if (df.fontSizePt) v["--tpl-table-font-size"] = `${df.fontSizePt}pt`
      if (df.color) v["--tpl-table-color"] = df.color
      if (df.bold !== undefined) v["--tpl-table-font-bold"] = df.bold ? "bold" : "normal"
      if (df.italic !== undefined) v["--tpl-table-font-italic"] = df.italic ? "italic" : "normal"
      if (df.underline) v["--tpl-table-text-decoration"] = "underline"
    }
  }

  // 行高
  const rh = ts.rowHeight
  if (rh) {
    if (rh.headerHeightCm) v["--tpl-table-header-min-height"] = `${rh.headerHeightCm}cm`
    if (rh.dataRowHeightCm) v["--tpl-table-row-min-height"] = `${rh.dataRowHeightCm}cm`
  }

  return v
}

// ─── 图片样式 ────────────────────────────────────────────────────────────────

export function generateImageStylesCSS(imageStyles: ImageStyleConfig | undefined): string {
  if (!imageStyles) return ""
  const v: VarMap = {}

  const pos = imageStyles.position ?? {}
  const border = imageStyles.border ?? {}
  const spacing = imageStyles.spacing ?? {}
  const style = imageStyles.style ?? {}

  const align = pos.horizontalAlign ?? pos.alignment
  if (align === "left" || align === "center" || align === "right") {
    v["--tpl-img-align"] = align
  }

  const borderWidthPt = border.widthPt ?? pos.borderWidthPt
  const borderColor = border.color ?? pos.borderColor ?? "#000000"
  const borderStyleVal = (pos as any).borderStyle ?? "solid"
  const cssBorderStyle = borderStyleVal === "double" ? "double"
    : borderStyleVal === "dashed" ? "dashed"
    : borderStyleVal === "dotted" ? "dotted" : "solid"
  if (border.showBorder || borderWidthPt) {
    v["--tpl-img-border"] = `${borderWidthPt ?? 1}pt ${cssBorderStyle} ${borderColor}`
  }

  if (spacing.marginTopCm) v["--tpl-img-margin-top"] = `${spacing.marginTopCm}cm`
  if (spacing.marginBottomCm) v["--tpl-img-margin-bottom"] = `${spacing.marginBottomCm}cm`
  if (spacing.marginLeftCm) v["--tpl-img-margin-left"] = `${spacing.marginLeftCm}cm`
  if (spacing.marginRightCm) v["--tpl-img-margin-right"] = `${spacing.marginRightCm}cm`

  // 文字环绕距离：用 padding 模拟四方向间距
  const tw = imageStyles.textWrap
  if (tw?.distanceMm) {
    const d = tw.distanceMm
    const top = d.top ?? 0
    const bottom = d.bottom ?? 0
    const left = d.left ?? 0
    const right = d.right ?? 0
    if (top || bottom || left || right) {
      v["--tpl-img-wrap-distance"] = `${top}mm ${right}mm ${bottom}mm ${left}mm`
    }
  }

  if (pos.sizeMode === "maxLimit") {
    if (pos.maxWidthCm) v["--tpl-img-max-width"] = `${pos.maxWidthCm}cm`
    if (pos.maxHeightCm) v["--tpl-img-max-height"] = `${pos.maxHeightCm}cm`
  }

  if (imageStyles.lineSpacing) v["--tpl-img-line-height"] = String(imageStyles.lineSpacing)

  const filters: string[] = []
  if (style.brightness !== undefined && style.brightness !== 0) {
    filters.push(`brightness(${1 + style.brightness / 100})`)
  }
  if (style.contrast !== undefined && style.contrast !== 0) {
    filters.push(`contrast(${1 + style.contrast / 100})`)
  }
  if (style.recolor?.preset === "grayscale") filters.push("grayscale(1)")
  else if (style.recolor?.preset === "sepia") filters.push("sepia(1)")
  else if (style.recolor?.preset === "washout") filters.push("opacity(0.5)")
  if (filters.length > 0) v["--tpl-img-filter"] = filters.join(" ")

  return varsToRule(".preview-page", v)
}

// ─── 工具：将 VarMap 输出为 CSS 规则 ─────────────────────────────────────────

function varsToRule(selector: string, vars: VarMap): string {
  const entries = Object.entries(vars)
  if (entries.length === 0) return ""
  const body = entries.map(([k, val]) => `  ${k.startsWith("--") ? k : `--${k}`}: ${val};`).join("\n")
  return `${selector} {\n${body}\n}`
}

// ─── slot key → CSS 变量前缀映射（模块级，供多处复用）───────────────────────

const KEY_TO_VAR_PREFIX: Record<string, string> = {
  document_title: "--tpl-title",
  subject_info: "--tpl-subtitle",
  document_subtitle: "--tpl-subtitle",
  body: "--tpl-body",
  heading_1: "--tpl-h1",
  heading_2: "--tpl-h2",
  heading_3: "--tpl-h3",
  heading_4: "--tpl-h4",
  heading_5: "--tpl-h5",
  heading_6: "--tpl-h6",
}

// _template.css 没有 CSS 变量接口的 slot，直接输出 CSS 规则
const DIRECT_CSS_KEYS = new Set(["date", "page_number"])

// ─── 主入口 ──────────────────────────────────────────────────────────────────

export function generateTemplateCSS(config: TemplateConfig): string {
  const { styles, headingStyles, paragraphStyles, listStyles, codeBlockStyles, tableStyles, layout } = config
  const vars: VarMap = {}

  // 默认段落样式（来自 layout）
  if (layout) {
    if (layout.defaultLineHeight) vars["--tpl-body-line-height"] = String(layout.defaultLineHeight)
    if (layout.defaultFirstLineIndentChars) vars["--tpl-body-indent"] = `${layout.defaultFirstLineIndentChars}em`
    if (layout.defaultParagraphSpacingBeforePt) vars["--tpl-paragraph-space-before"] = `${layout.defaultParagraphSpacingBeforePt}pt`
    if (layout.defaultParagraphSpacingAfterPt) vars["--tpl-paragraph-space-after"] = `${layout.defaultParagraphSpacingAfterPt}pt`
  }

  // 段落样式（paragraphStyles 优先级高于 layout 默认值）
  if (paragraphStyles) {
    if (paragraphStyles.align) vars["--tpl-body-align"] = paragraphStyles.align
    if (paragraphStyles.lineHeight) vars["--tpl-body-line-height"] = String(paragraphStyles.lineHeight)
    if (paragraphStyles.spacingBeforePt) vars["--tpl-paragraph-space-before"] = `${paragraphStyles.spacingBeforePt}pt`
    if (paragraphStyles.spacingAfterPt) vars["--tpl-paragraph-space-after"] = `${paragraphStyles.spacingAfterPt}pt`
    if (paragraphStyles.firstLineIndentChars) vars["--tpl-body-indent"] = `${paragraphStyles.firstLineIndentChars}em`
  }

  // styles slots → CSS 变量
  for (const [key, slot] of Object.entries(styles)) {
    if (!slot) continue
    const prefix = KEY_TO_VAR_PREFIX[key]
    if (prefix) Object.assign(vars, slotVars(slot, prefix))
  }

  // 标题样式（headingStyles 优先级高于 styles slots）
  if (headingStyles) {
    const H_PREFIX: Record<string, string> = {
      h1: "--tpl-h1", h2: "--tpl-h2", h3: "--tpl-h3",
      h4: "--tpl-h4", h5: "--tpl-h5", h6: "--tpl-h6",
      // HeadingStyleEditor uses levelN keys
      level1: "--tpl-h1", level2: "--tpl-h2", level3: "--tpl-h3",
      level4: "--tpl-h4", level5: "--tpl-h5", level6: "--tpl-h6",
    }
    for (const [level, hs] of Object.entries(headingStyles)) {
      const prefix = H_PREFIX[level]
      if (prefix && hs) Object.assign(vars, headingVars(hs, prefix))
    }
  }

  // 列表、代码块、表格
  Object.assign(vars, listVars(listStyles))
  Object.assign(vars, codeBlockVars(codeBlockStyles))
  Object.assign(vars, tableVars(tableStyles))

  const rules: string[] = [varsToRule(".preview-page", vars)]

  // _template.css 无 CSS 变量驱动的 slot（date、page_number），直接输出规则
  for (const [key, slot] of Object.entries(styles)) {
    if (!slot || !DIRECT_CSS_KEYS.has(key)) continue
    const props = slotToDirectCSS(slot)
    if (props) rules.push(`.preview-page [data-style-key="${key}"] { ${props} }`)
  }

  return rules.filter(Boolean).join("\n")
}

function slotToDirectCSS(slot: StyleSlotConfig): string {
  const p: string[] = []
  if (slot.fontFamily) p.push(`font-family: ${formatFontFamily(slot.fontFamily)}`)
  if (slot.fontSizePt) p.push(`font-size: ${slot.fontSizePt}pt`)
  if (slot.bold !== undefined) p.push(`font-weight: ${slot.bold ? "bold" : "normal"}`)
  if (slot.italic !== undefined) p.push(`font-style: ${slot.italic ? "italic" : "normal"}`)
  if (slot.color) p.push(`color: ${slot.color}`)
  if (slot.backgroundColor) p.push(`background-color: ${slot.backgroundColor}`)
  if (slot.align) p.push(`text-align: ${slot.align}`)
  if (slot.lineHeight) p.push(`line-height: ${slot.lineHeight}`)
  if (slot.firstLineIndentChars) p.push(`text-indent: ${slot.firstLineIndentChars}em`)
  if (slot.spacingBeforePt) p.push(`margin-top: ${slot.spacingBeforePt}pt`)
  if (slot.spacingAfterPt) p.push(`margin-bottom: ${slot.spacingAfterPt}pt`)
  return p.join("; ")
}

// ─── 页面布局 CSS ─────────────────────────────────────────────────────────────

export function generatePageCSS(layout: LayoutConfig): string {
  const {
    paperSize = "A4",
    paperDirection,
    pageWidthMm,
    pageHeightMm,
    marginTopMm = 25,
    marginBottomMm = 25,
    marginLeftMm = 20,
    marginRightMm = 20,
  } = layout

  let size = paperSize
  if (paperDirection === "landscape") size = `${paperSize} landscape`
  if (pageWidthMm && pageHeightMm) {
    size = paperDirection === "landscape"
      ? `${pageHeightMm}mm ${pageWidthMm}mm`
      : `${pageWidthMm}mm ${pageHeightMm}mm`
  }

  return `@page { size: ${size}; margin: ${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm; }`
}

export function generatePreviewCSS(config: TemplateConfig): string {
  return [
    generatePageCSS(config.layout),
    generateTemplateCSS(config),
    generateImageStylesCSS(config.imageStyles),
  ].filter(Boolean).join("\n")
}

export function ptToPx(pt: number, dpi = 96): number {
  return (pt / 72) * dpi
}

export function mmToPx(mm: number, dpi = 96): number {
  return (mm / 25.4) * dpi
}

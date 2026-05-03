import type { TemplateConfig, StyleSlotConfig, LayoutConfig } from '@/types/editor-template'

/** 字体回退映射表 */
const FONT_FALLBACKS: Record<string, string> = {
  'SimHei': 'Microsoft YaHei, sans-serif',
  'SimSun': 'SimSun, serif',
  'FangSong_GB2312': 'FangSong, serif',
  'KaiTi_GB2312': 'KaiTi, serif',
  'Microsoft YaHei': 'Microsoft YaHei, sans-serif',
  'Arial': 'Arial, sans-serif',
  'Times': 'Times New Roman, serif',
  'Courier': 'Courier New, monospace',
}

/**
 * 将字体名称转换为 CSS font-family 值
 */
function formatFontFamily(fontFamily: string | undefined): string {
  if (!fontFamily) return ''
  const fallback = FONT_FALLBACKS[fontFamily] || ''
  return fallback ? `"${fontFamily}", ${fallback}` : `"${fontFamily}"`
}

/**
 * 将样式槽位转换为 CSS 属性字符串
 */
function styleSlotToCSS(slot: StyleSlotConfig | undefined): string {
  if (!slot) return ''
  const props: string[] = []

  if (slot.fontFamily) {
    props.push(`font-family: ${formatFontFamily(slot.fontFamily)}`)
  }
  if (slot.fontSizePt) {
    props.push(`font-size: ${slot.fontSizePt}pt`)
  }
  if (slot.bold !== undefined) {
    props.push(`font-weight: ${slot.bold ? 'bold' : 'normal'}`)
  }
  if (slot.italic !== undefined) {
    props.push(`font-style: ${slot.italic ? 'italic' : 'normal'}`)
  }
  if (slot.color) {
    props.push(`color: ${slot.color}`)
  }
  if (slot.backgroundColor) {
    props.push(`background-color: ${slot.backgroundColor}`)
  }
  if (slot.align) {
    props.push(`text-align: ${slot.align}`)
  }
  if (slot.lineHeight) {
    props.push(`line-height: ${slot.lineHeight}`)
  }
  if (slot.firstLineIndentChars) {
    props.push(`text-indent: ${slot.firstLineIndentChars}em`)
  }
  if (slot.spacingBeforePt) {
    props.push(`margin-top: ${slot.spacingBeforePt}pt`)
  }
  if (slot.spacingAfterPt) {
    props.push(`margin-bottom: ${slot.spacingAfterPt}pt`)
  }

  return props.join('; ')
}

/**
 * 生成模板样式 CSS
 */
export function generateTemplateCSS(config: TemplateConfig): string {
  const { styles } = config
  const cssRules: string[] = []

  // 标题样式
  if (styles.document_title) {
    const css = styleSlotToCSS(styles.document_title)
    if (css) cssRules.push(`.preview-title { ${css} }`)
  }

  // 正文样式
  if (styles.body) {
    const css = styleSlotToCSS(styles.body)
    if (css) cssRules.push(`.preview-body { ${css} }`)
  }

  // 一级标题
  if (styles.heading_1) {
    const css = styleSlotToCSS(styles.heading_1)
    if (css) cssRules.push(`.preview-h1 { ${css} }`)
  }

  // 二级标题
  if (styles.heading_2) {
    const css = styleSlotToCSS(styles.heading_2)
    if (css) cssRules.push(`.preview-h2 { ${css} }`)
  }

  // 三级标题
  if (styles.heading_3) {
    const css = styleSlotToCSS(styles.heading_3)
    if (css) cssRules.push(`.preview-h3 { ${css} }`)
  }

  // 日期样式
  if (styles.date) {
    const css = styleSlotToCSS(styles.date)
    if (css) cssRules.push(`.preview-date { ${css} }`)
  }

  // 列表样式
  if (styles.list) {
    const css = styleSlotToCSS(styles.list)
    if (css) cssRules.push(`.preview-list { ${css} }`)
  }

  // 代码样式
  if (styles.code) {
    const css = styleSlotToCSS(styles.code)
    if (css) cssRules.push(`.preview-code { ${css} }`)
  }

  // 引用样式
  if (styles.quote) {
    const css = styleSlotToCSS(styles.quote)
    if (css) cssRules.push(`.preview-quote { ${css} }`)
  }

  return cssRules.join('\n')
}

/**
 * 生成页面 CSS（@page 规则）
 */
export function generatePageCSS(layout: LayoutConfig): string {
  const {
    paperSize = 'A4',
    marginTopMm = 25,
    marginBottomMm = 25,
    marginLeftMm = 20,
    marginRightMm = 20,
  } = layout

  return `@page { size: ${paperSize}; margin: ${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm; }`
}

/**
 * 生成完整预览 CSS
 */
export function generatePreviewCSS(config: TemplateConfig): string {
  return `${generatePageCSS(config.layout)}\n${generateTemplateCSS(config)}`
}

/**
 * 将 pt 转换为 px（用于屏幕显示）
 */
export function ptToPx(pt: number, dpi: number = 96): number {
  return (pt / 72) * dpi
}

/**
 * 将 mm 转换为 px（用于屏幕显示）
 */
export function mmToPx(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi
}

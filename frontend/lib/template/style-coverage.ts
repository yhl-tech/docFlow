// ============================================================
// 字段覆盖状态表
// 每个字段标注：both(预览+导出) | preview(仅预览) | export(仅导出) | none(均未实现)
// ============================================================

export type Coverage = 'both' | 'preview' | 'export' | 'none'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldPath = string

export interface FieldCoverage {
  path: FieldPath
  coverage: Coverage
  note?: string
}

export const STYLE_FIELD_COVERAGE: FieldCoverage[] = [
  // ── 默认样式（styles）────────────────────────────────────────────
  { path: 'styles.body.fontFamily', coverage: 'both', note: '' },
  { path: 'styles.body.fontSizePt', coverage: 'both', note: '' },
  { path: 'styles.body.bold', coverage: 'both', note: '' },
  { path: 'styles.body.italic', coverage: 'both', note: '' },
  { path: 'styles.body.color', coverage: 'both', note: '' },
  { path: 'styles.body.align', coverage: 'both', note: '' },
  { path: 'styles.body.lineHeight', coverage: 'both', note: '' },
  { path: 'styles.body.spacingBeforePt', coverage: 'both', note: '' },
  { path: 'styles.body.spacingAfterPt', coverage: 'both', note: '' },
  { path: 'styles.body.firstLineIndentChars', coverage: 'both', note: '' },

  { path: 'styles.document_title.fontFamily', coverage: 'both' },
  { path: 'styles.document_title.fontSizePt', coverage: 'both' },
  { path: 'styles.document_title.bold', coverage: 'both' },
  { path: 'styles.document_title.italic', coverage: 'both' },
  { path: 'styles.document_title.color', coverage: 'both' },
  { path: 'styles.document_title.align', coverage: 'both' },

  { path: 'styles.heading_1.fontFamily', coverage: 'both' },
  { path: 'styles.heading_1.fontSizePt', coverage: 'both' },
  { path: 'styles.heading_1.bold', coverage: 'both' },
  { path: 'styles.heading_1.italic', coverage: 'both' },
  { path: 'styles.heading_1.color', coverage: 'both' },
  { path: 'styles.heading_1.align', coverage: 'both' },

  // ── 标题样式（headingStyles）────────────────────────────────────
  { path: 'headingStyles.h1.font.fontFamily', coverage: 'both' },
  { path: 'headingStyles.h1.font.fontSizePt', coverage: 'both' },
  { path: 'headingStyles.h1.font.bold', coverage: 'both' },
  { path: 'headingStyles.h1.font.italic', coverage: 'both' },
  { path: 'headingStyles.h1.font.color', coverage: 'both' },
  { path: 'headingStyles.h1.align', coverage: 'both' },
  { path: 'headingStyles.h1.lineHeight', coverage: 'both' },
  { path: 'headingStyles.h1.spacingBeforePt', coverage: 'both' },
  { path: 'headingStyles.h1.spacingAfterPt', coverage: 'both' },
  { path: 'headingStyles.h1.firstLineIndentChars', coverage: 'both' },
  // h2~h6 同理
  ...['h2', 'h3', 'h4', 'h5', 'h6'].flatMap(h => [
    { path: `headingStyles.${h}.font.fontFamily`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.font.fontSizePt`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.font.bold`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.font.italic`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.font.color`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.align`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.lineHeight`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.spacingBeforePt`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.spacingAfterPt`, coverage: 'both' as Coverage },
    { path: `headingStyles.${h}.firstLineIndentChars`, coverage: 'both' as Coverage },
  ]),

  // ── 段落样式（paragraphStyles）──────────────────────────────────
  { path: 'paragraphStyles.align', coverage: 'both' },
  { path: 'paragraphStyles.lineHeight', coverage: 'both' },
  { path: 'paragraphStyles.spacingBeforePt', coverage: 'both' },
  { path: 'paragraphStyles.spacingAfterPt', coverage: 'both' },
  { path: 'paragraphStyles.firstLineIndentChars', coverage: 'both' },

  // ── 表格样式（tableStyles）──────────────────────────────────────
  { path: 'tableStyles.border.color', coverage: 'both' },
  { path: 'tableStyles.border.widthPt', coverage: 'export' },
  { path: 'tableStyles.border.style', coverage: 'export' },
  { path: 'tableStyles.border.insideHorizontalBorder', coverage: 'none' },
  { path: 'tableStyles.border.insideVerticalBorder', coverage: 'none' },
  { path: 'tableStyles.shading.fill', coverage: 'both' },
  { path: 'tableStyles.shading.color', coverage: 'none' },
  { path: 'tableStyles.font.fontFamily', coverage: 'none' },
  { path: 'tableStyles.font.fontSizePt', coverage: 'none' },
  { path: 'tableStyles.font.color', coverage: 'none' },

  // ── 图片样式（imageStyles）──────────────────────────────────────
  { path: 'imageStyles.borderColor', coverage: 'both' },
  { path: 'imageStyles.borderWidthPt', coverage: 'none' },
  { path: 'imageStyles.spacing.marginTopCm', coverage: 'none' },
  { path: 'imageStyles.position.wrapType', coverage: 'export' },
  { path: 'imageStyles.position.horizontalAlign', coverage: 'export' },
  { path: 'imageStyles.style.brightness', coverage: 'export' },
  { path: 'imageStyles.style.contrast', coverage: 'export' },

  // ── 代码块样式（codeBlockStyles）────────────────────────────────
  { path: 'codeBlockStyles.border.color', coverage: 'export' },
  { path: 'codeBlockStyles.border.widthPt', coverage: 'export' },
  { path: 'codeBlockStyles.border.borderRadiusPt', coverage: 'none' },
  { path: 'codeBlockStyles.shading.fill', coverage: 'export' },
  { path: 'codeBlockStyles.shading.color', coverage: 'export' },
  { path: 'codeBlockStyles.keyboardStyle.foregroundColor', coverage: 'export' },
  { path: 'codeBlockStyles.keyboardStyle.backgroundColor', coverage: 'export' },
  { path: 'codeBlockStyles.lineNumber.color', coverage: 'export' },
  { path: 'codeBlockStyles.lineNumber.show', coverage: 'none' },
  { path: 'codeBlockStyles.lineSpacing.multiple', coverage: 'none' },

  // ── 页面布局（layout）───────────────────────────────────────────
  { path: 'layout.paperSize', coverage: 'both' },
  { path: 'layout.paperDirection', coverage: 'none' },
  { path: 'layout.marginTopMm', coverage: 'both' },
  { path: 'layout.marginBottomMm', coverage: 'both' },
  { path: 'layout.marginLeftMm', coverage: 'both' },
  { path: 'layout.marginRightMm', coverage: 'both' },
  { path: 'layout.defaultLineHeight', coverage: 'both' },
  { path: 'layout.defaultParagraphSpacingBeforePt', coverage: 'both' },
  { path: 'layout.defaultParagraphSpacingAfterPt', coverage: 'both' },
  { path: 'layout.defaultFirstLineIndentChars', coverage: 'both' },
  { path: 'layout.headerFooter', coverage: 'both' },
  { path: 'layout.pageNumber', coverage: 'both' },
]

export const COVERAGE_ICONS: Record<Coverage, string> = {
  both: '✅',
  preview: '⚠️',
  export: '⚠️',
  none: '❌',
}

export const COVERAGE_LABELS: Record<Coverage, string> = {
  both: '预览+导出',
  preview: '仅预览',
  export: '仅导出',
  none: '未实现',
}

/**
 * 按覆盖状态分组统计
 */
export function getCoverageStats(): Record<Coverage, number> {
  return STYLE_FIELD_COVERAGE.reduce(
    (acc, f) => {
      acc[f.coverage] = (acc[f.coverage] ?? 0) + 1
      return acc
    },
    {} as Record<Coverage, number>,
  )
}

/**
 * 按路径前缀查找字段
 */
export function getFieldsByPrefix(prefix: string): FieldCoverage[] {
  return STYLE_FIELD_COVERAGE.filter(f => f.path.startsWith(prefix))
}

// ============================================================
// 字体信息
// ============================================================

export interface FontInfo {
  id: string
  name: string
}

// ============================================================
// 样式槽位配置
// ============================================================

export interface FontConfig {
  fontFamily?: string
  fontSizePt?: number
  bold?: boolean
  italic?: boolean
  color?: string
  backgroundColor?: string
}

// 英文单独字体配置
export interface EnglishFontConfig {
  useSeparateFont?: boolean
  fontFamily?: string
}

export interface SpacingConfig {
  spacingBeforePt?: number
  spacingAfterPt?: number
}

export interface HeadingStyleConfig {
  font?: FontConfig
  align?: "left" | "center" | "right" | "justify"
  lineHeight?: number
  spacingBeforePt?: number
  spacingAfterPt?: number
  firstLineIndentChars?: number
  outlineLevel?: number
  leftIndentChars?: number
}

export interface ParagraphStyleConfig {
  align?: "left" | "center" | "right" | "justify"
  lineHeight?: number
  spacingBeforePt?: number
  spacingAfterPt?: number
  firstLineIndentChars?: number
  outlineLevel?: number
}

export interface StyleSlotConfig {
  label: string
  role: string
  fontFamily?: string
  fontSizePt?: number
  bold?: boolean
  italic?: boolean
  color?: string
  backgroundColor?: string
  lineHeight?: number
  align?: "left" | "center" | "right" | "justify"
  spacingBeforePt?: number
  spacingAfterPt?: number
  firstLineIndentChars?: number
}

// ============================================================
// 页面布局配置
// ============================================================

export type PaperDirection = "portrait" | "landscape"

export interface PageNumberConfig {
  enabled?: boolean
  position?: "header-bottom" | "footer-top"
  align?: "left" | "center" | "right" | "inside" | "outside"
  format?: "arabic" | "lowercaseRoman" | "uppercaseRoman"
  startValue?: number
  continueFromPrevious?: boolean
  showOnFirstPage?: boolean
  includeChapterNumber?: boolean
  chapterStyle?: "heading1" | "heading2" | "heading3" | "body"
  chapterSeparator?: "-" | "." | "--" | ":" | "(" | ")" | "()"
  labelTemplate?: string
  fontFamily?: string
  fontSizePt?: number
  color?: string
  bold?: boolean
  italic?: boolean
}

export interface HeaderFooterContent {
  left?: string
  center?: string
  right?: string
}

export interface HeaderFooterConfig {
  hasHeader?: boolean
  hasFooter?: boolean
  headerContent?: HeaderFooterContent
  footerContent?: HeaderFooterContent
  differentFirstPage?: boolean
  differentOddEven?: boolean
  headerHeightMm?: number
  footerHeightMm?: number
  /** 页码字体 */
  pageNumberFontFamily?: string
  /** 页码字号(pt) */
  pageNumberFontSizePt?: number
  /** 页码颜色 */
  pageNumberColor?: string
  /** 页码是否加粗 */
  pageNumberBold?: boolean
  /** 页码是否斜体 */
  pageNumberItalic?: boolean
}

export interface LayoutConfig {
  paperSize?: string
  paperDirection?: PaperDirection
  pageWidthMm?: number
  pageHeightMm?: number
  marginTopMm?: number
  marginBottomMm?: number
  marginLeftMm?: number
  marginRightMm?: number
  /** 页眉距离顶边距的距离（厘米） */
  headerDistanceCm?: number
  /** 页脚距离底边距的距离（厘米） */
  footerDistanceCm?: number
  defaultLineHeight?: number
  defaultParagraphSpacingBeforePt?: number
  defaultParagraphSpacingAfterPt?: number
  defaultFirstLineIndentChars?: number
  pageNumber?: PageNumberConfig
  headerFooter?: HeaderFooterConfig
}

// ============================================================
// 列表样式配置
// ============================================================

export interface BulletListStyle {
  character?: "●" | "■" | "▼" | "☐" | "☑" | string
  color?: string
  fontFamily?: string
  fontSizePt?: number
  bold?: boolean
  indentCm?: number
  spacingBeforeLines?: number
  spacingAfterLines?: number
  lineSpacing?: number
}

export interface OrderedListStyle {
  format?: "1." | "2." | "3." | "a." | "A." | "(1)" | "一." | "一、" | "第" | string
  align?: "left" | "center" | "right"
  autoGenerateAfter?: boolean
  continueNumbering?: boolean
  color?: string
  fontFamily?: string
  fontSizePt?: number
  bold?: boolean
  indentCm?: number
  spacingBeforeLines?: number
  spacingAfterLines?: number
  lineSpacing?: number
}

export interface ListStyleConfig {
  bullet?: BulletListStyle
  ordered?: OrderedListStyle
}

// ============================================================
// 图片样式配置
// ============================================================

export type WrapType = "inline" | "square" | "tight" | "through" | "topAndBottom" | "behind" | "inFront"

export interface ImagePositionConfig {
  horizontalAlign?: "left" | "center" | "right" | "inside" | "outside"
  wrapType?: WrapType
  horizontalLock?: boolean
  verticalLock?: boolean
  lockAnchor?: boolean
  borderColor?: string
  borderWidthPt?: number
  borderStyle?: BorderStyle
  borderRadiusPt?: number
  /** 尺寸模式：original=原始固定，maxLimit=最大尺寸限制 */
  sizeMode?: 'original' | 'maxLimit'
  maxWidthCm?: number
  maxHeightCm?: number
  /** 保持宽高比 */
  keepAspectRatio?: boolean
  alignment?: 'left' | 'center' | 'right'
}

export interface ImageTextWrapConfig {
  wrapTextBy?: "max" | "left" | "right" | "min"
  distanceMm?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
}

export interface ImageStyleEffect {
  preset?: "none" | "borderShadow" | "reflection" | "glow"
  color?: string
  transparency?: number
  size?: number
  distance?: number
  angle?: number
  blur?: number
  radius?: number
}

export interface ImageRecolorPreset {
  preset?: "none" | "grayscale" | "washout" | "blackAndWhite" | "sepia"
}

export interface ImageStyleConfig {
  // 位置与环绕
  position?: ImagePositionConfig
  // 文字环绕
  textWrap?: ImageTextWrapConfig
  // 样式效果
  style?: {
    cropArea?: boolean
    effect?: ImageStyleEffect
    brightness?: number
    contrast?: number
    recolor?: ImageRecolorPreset
  }
  // 图片边框
  border?: {
    showBorder?: boolean
    color?: string
    widthPt?: number
  }
  // 图片编号
  numbering?: {
    enabled?: boolean
  }
  // 图片间距（上下左右独立）
  spacing?: {
    marginTopCm?: number
    marginBottomCm?: number
    marginLeftCm?: number
    marginRightCm?: number
  }
  // 行距
  lineSpacing?: number
  // 字体样式（图片标注/Alt文字用）
  font?: {
    fontFamily?: string
    fontSizePt?: number
    color?: string
    bold?: boolean
    italic?: boolean
  }
  // 内边距
  innerPadding?: {
    topPt?: number
    bottomPt?: number
    leftPt?: number
    rightPt?: number
  }
}

// ============================================================
// 代码块样式配置
// ============================================================

export type BorderPreset = "none" | "outer" | "shadow" | "raised" | "inset"

export interface CodeBlockBorder {
  preset?: BorderPreset
  color?: string
  widthPt?: number
  leftBorder?: boolean
  rightBorder?: boolean
  topBorder?: boolean
  bottomBorder?: boolean
}

export interface CodeBlockShading {
  fill?: string
  color?: string
  applyTo?: "text" | "paragraph"
}

export interface CodeBlockKeyboardStyle {
  foregroundColor?: string
  backgroundColor?: string
}

export interface CodeBlockLineNumber {
  show?: boolean
  color?: string
}

export interface CodeBlockTabStop {
  defaultMm?: number
  indentByChar?: boolean
}

export interface CodeBlockStyleConfig {
  // 字体样式
  font?: {
    fontFamily?: string
    fontSizePt?: number
    color?: string
    bold?: boolean
    italic?: boolean
  }
  // 内边距
  padding?: {
    topPt?: number
    bottomPt?: number
    leftPt?: number
    rightPt?: number
  }
  // 行距
  lineSpacing?: number // 多倍行距，1.0 = 单倍行距
  // 对齐
  alignment?: 'left' | 'center' | 'right' | 'justify'
  // 边框
  border?: CodeBlockBorder
  // 底纹
  shading?: CodeBlockShading
  // 键盘样式
  keyboardStyle?: CodeBlockKeyboardStyle
  // 行号
  lineNumber?: CodeBlockLineNumber
  // 制表位
  tabStop?: CodeBlockTabStop
}

// ============================================================
// 表格样式配置
// ============================================================

export type BorderStyle = "single" | "double" | "dashed" | "dotted" | "none"

export interface TableBorder {
  preset?: "none" | "all" | "grid" | "outline" | "inside"
  color?: string
  widthPt?: number
  style?: BorderStyle
  leftBorder?: boolean
  rightBorder?: boolean
  topBorder?: boolean
  bottomBorder?: boolean
  insideHorizontalBorder?: boolean
  insideVerticalBorder?: boolean
}

export interface TableShading {
  fill?: string
  color?: string
  applyTo?: "paragraph" | "cell" | "table"
}

export interface TableOptions {
  specifyFormat?: boolean
  useThemeFormat?: boolean
  repeatHeaderRow?: boolean
  allowSplitTable?: boolean
  useAlignment?: boolean
}

export interface TableFont {
  fontFamily?: string
  fontSizePt?: number
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type TableVerticalAlign = 'top' | 'center' | 'bottom'

export interface TableCellStyle {
  font?: TableFont
  align?: 'left' | 'center' | 'right' | 'justify'
  valign?: TableVerticalAlign
  lineHeight?: number
  shading?: TableShading
}

export interface TableStyleConfig {
  // 表格全局
  tableAlignment?: 'left' | 'center' | 'right'
  tableWidth?: number // 百分比，0-100，默认100

  // 边框
  border?: TableBorder

  // 底纹（默认/全局）
  shading?: TableShading

  // 表头样式
  headerStyle?: TableCellStyle

  // 数据行样式
  dataRowStyle?: TableCellStyle

  // 选项
  options?: TableOptions

  // 字体字号颜色（全局默认）
  font?: TableFont

  // 单元格内边距
  cellPadding?: {
    top?: number    // cm，默认 0.14
    bottom?: number  // cm，默认 0.14
    left?: number    // cm，默认 0.00
    right?: number   // cm，默认 0.00
  }

  // 表格编号
  tableNumbering?: {
    enabled?: boolean
  }

  // 行高
  rowHeight?: {
    headerHeightCm?: number    // 默认 0.78
    dataRowHeightCm?: number   // 默认 0.78
  }
}

// ============================================================
// 完整模板配置
// ============================================================

export interface TemplateConfig {
  styles: Record<string, StyleSlotConfig>
  /** 英文单独字体配置 */
  englishFont?: EnglishFontConfig
  layout: LayoutConfig
  headingStyles?: Record<string, HeadingStyleConfig>
  paragraphStyles?: ParagraphStyleConfig
  listStyles?: ListStyleConfig
  imageStyles?: ImageStyleConfig
  codeBlockStyles?: CodeBlockStyleConfig
  tableStyles?: TableStyleConfig
  documentRules?: Record<string, unknown>
  components?: Record<string, unknown>
  metadataMapping?: Record<string, unknown>
}

// ============================================================
// 模板定义
// ============================================================

export interface TemplateDefinition {
  id: string
  kind: string
  source: "builtin" | "user" | "org"
  name: string
  description: string
  basedOnTemplateId?: string | null
  tags?: string[]
  capabilities: {
    editableStyleSlots?: string[]
    editableLayoutFields?: string[]
    supportsHeaderFooter?: boolean
    supportsPageNumber?: boolean
    supportsCoverPage?: boolean
    supportsWatermark?: boolean
    supportsExportDocx?: boolean
    supportsExportPdf?: boolean
  }
  schema: {
    blockMappings?: Record<string, string>
    componentSlots?: Record<string, string>
    formSchema?: {
      sections?: Array<{
        key: string
        title: string
        styleKeys?: string[]
        fields?: string[]
        hidden?: boolean
      }>
    }
  }
  config: TemplateConfig
  constraints?: {
    allowedFonts?: string[]
    fontSizeRangePt?: { min: number; max: number }
    marginRangeMm?: { min: number; max: number }
    readOnlyFields?: string[]
    requiredStyleSlots?: string[]
  } | null
  exportProfile?: Record<string, unknown> | null
  ownerUserId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// ============================================================
// 模板绑定
// ============================================================

export interface TemplateBinding {
  templateId?: string
  appliedAt: string
  configSnapshot: TemplateConfig
}

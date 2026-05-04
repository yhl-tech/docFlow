export interface FontInfo {
  id: string
  name: string
}

export interface StyleSlotConfig {
  label: string
  role: string
  fontFamily?: string
  fontSizePt?: number
  bold?: boolean
  italic?: boolean
  color?: string
  lineHeight?: number
  align?: "left" | "center" | "right" | "justify"
  spacingBeforePt?: number
  spacingAfterPt?: number
  firstLineIndentChars?: number
}

export interface LayoutConfig {
  paperSize?: string
  pageWidthMm?: number
  pageHeightMm?: number
  marginTopMm?: number
  marginBottomMm?: number
  marginLeftMm?: number
  marginRightMm?: number
  defaultLineHeight?: number
  defaultParagraphSpacingBeforePt?: number
  defaultParagraphSpacingAfterPt?: number
  defaultFirstLineIndentChars?: number
  pageNumber?: {
    enabled?: boolean
    position?: "top" | "bottom"
    align?: "left" | "center" | "right"
    fontFamily?: string
    fontSizePt?: number
  }
}

export interface TemplateConfig {
  styles: Record<string, StyleSlotConfig>
  layout: LayoutConfig
  documentRules?: Record<string, unknown>
  components?: Record<string, unknown>
  metadataMapping?: Record<string, unknown>
}

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

export interface TemplateBinding {
  templateId?: string
  appliedAt: string
  configSnapshot: TemplateConfig
}

export interface TemplateMarketItem {
  id: string
  name: string
  description: string
  kind: string
  source: 'builtin' | 'user'
  previewImageUrl: string | null
  usageCount: number
  ratingAvg: number | null
  ratingCount: number
  isPublic: boolean
  tags: string[]
  createdAt: string
}

export type TemplateCategory = 'all' | 'gov_doc' | 'report' | 'lesson_plan' | 'notice' | 'general' | 'custom'
export type TemplateSortBy = 'latest' | 'usage' | 'rating'

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  all: '全部',
  gov_doc: '公文',
  report: '报告',
  lesson_plan: '教案',
  notice: '通知',
  general: '通用',
  custom: '自定义',
}

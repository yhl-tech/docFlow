import api from './instance'
import type { TemplateMarketItem } from '@/types/templateMarket'

export const templateMarketService = {
  getList: (params?: { kind?: string; source?: string }): Promise<TemplateMarketItem[]> =>
    api.get('/api/editor/templates', { params }).then((r) =>
      (r.data as Record<string, unknown>[]).map(normalizeTemplateItem)
    ),

  recordUsage: (id: string): Promise<void> =>
    api.post(`/api/editor/templates/${id}/use`).catch(() => {}),

  rename: (id: string, name: string): Promise<void> =>
    api.put(`/api/editor/templates/${id}`, { name }),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/editor/templates/${id}`),

  duplicate: (id: string): Promise<TemplateMarketItem> =>
    api.post(`/api/editor/templates/${id}/duplicate`).then((r) => normalizeTemplateItem(r.data as Record<string, unknown>)),
}

function normalizeTemplateItem(raw: Record<string, unknown>): TemplateMarketItem {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description ?? '') as string,
    kind: (raw.kind ?? 'general') as string,
    source: (raw.source ?? 'builtin') as 'builtin' | 'user',
    previewImageUrl: (raw.preview_image_url ?? raw.previewImageUrl ?? null) as string | null,
    usageCount: (raw.usage_count ?? raw.usageCount ?? 0) as number,
    ratingAvg: (raw.rating_avg ?? raw.ratingAvg ?? null) as number | null,
    ratingCount: (raw.rating_count ?? raw.ratingCount ?? 0) as number,
    isPublic: (raw.is_public ?? raw.isPublic ?? false) as boolean,
    tags: (raw.tags ?? []) as string[],
    createdAt: (raw.created_at ?? raw.createdAt ?? '') as string,
  }
}

import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { templateMarketService } from '@/lib/api/templateMarketService'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { useEditorStore } from '@/store/editorStore'
import { editorService } from '@/lib/api'
import type { TemplateMarketItem } from '@/types/templateMarket'
// useEditorStore imported for getState() only (no hook subscription to avoid re-render loops)

export function useTemplateMarket() {
  const { setItems, setLoading } = useTemplateMarketStore()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const items = await templateMarketService.getList()
      setItems(items)
      // 同步完整模板定义（含 config）到 editorStore，供预览抽屉使用
      const { templates, setTemplates } = useEditorStore.getState()
      if (templates.length === 0) {
        const fullDefs = await editorService.getTemplates()
        setTemplates(fullDefs as any)
      }
    } catch {
      toast.error('加载模板失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [setItems, setLoading])

  useEffect(() => {
    load()
  }, [load])

  return { reload: load }
}

export function useFilteredTemplates(
  items: TemplateMarketItem[],
  query: string,
  category: string,
  sortBy: string,
): TemplateMarketItem[] {
  return useMemo(() => {
    let filtered = items

    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }

    if (category !== 'all') {
      if (category === 'custom') {
        filtered = filtered.filter((t) => t.source === 'user')
      } else {
        filtered = filtered.filter((t) => t.kind === category)
      }
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'usage') return b.usageCount - a.usageCount
      if (sortBy === 'rating') return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [items, query, category, sortBy])
}

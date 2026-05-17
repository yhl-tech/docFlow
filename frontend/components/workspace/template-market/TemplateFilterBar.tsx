'use client'

import { cn } from '@/lib/utils'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { CATEGORY_LABELS, type TemplateCategory, type TemplateSortBy } from '@/types/templateMarket'

const CATEGORIES: TemplateCategory[] = ['all', 'gov_doc', 'report', 'lesson_plan', 'notice', 'general', 'custom']

interface TemplateFilterBarProps {
  /** 是否内嵌模式（用于左侧小面板） */
  embedded?: boolean
}

export function TemplateFilterBar({ embedded = false }: TemplateFilterBarProps) {
  const { activeCategory, sortBy, setCategory, setSortBy } = useTemplateMarketStore()

  return (
    <div className={cn("flex items-center gap-4", embedded ? "flex-col items-start border-t pt-2" : "")}>
      <div className="flex gap-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'shrink-0 rounded px-2.5 py-1 text-xs transition-colors',
              activeCategory === cat
                ? 'bg-blue-500 text-white font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className="flex gap-3 shrink-0">
        {(['latest', 'usage', 'rating'] as TemplateSortBy[]).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={cn(
              'text-xs whitespace-nowrap',
              sortBy === s ? 'text-blue-600 font-medium' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {s === 'latest' ? '最新' : s === 'usage' ? '最多使用' : '评分最高'}
          </button>
        ))}
      </div>
    </div>
  )
}

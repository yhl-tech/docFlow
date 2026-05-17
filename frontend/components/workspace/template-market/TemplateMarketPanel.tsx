'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { useEditorStore } from '@/store/editorStore'
import { useTemplateMarket, useFilteredTemplates } from '@/hooks/useTemplateMarket'
import { templateMarketService } from '@/lib/api/templateMarketService'
import { TemplateFilterBar } from './TemplateFilterBar'
import { TemplateMarketCard } from './TemplateMarketCard'
import { TemplatePreviewDrawer } from './TemplatePreviewDrawer'
import { TemplateUsageConfirm } from './TemplateUsageConfirm'
import type { TemplateMarketItem } from '@/types/templateMarket'

export function TemplateMarketPanel() {
  const { items, isLoading, searchQuery, activeCategory, sortBy, setSearchQuery, previewId, setPreviewId } =
    useTemplateMarketStore()
  const { reload } = useTemplateMarket()

  const filtered = useFilteredTemplates(items, searchQuery, activeCategory, sortBy)

  // 确认弹窗状态
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateMarketItem | null>(null)

  const { content, templates, setCurrentTemplate } = useEditorStore()

  const applyTemplate = (template: TemplateMarketItem) => {
    const t = templates.find((t) => t.id === template.id)
    if (t) {
      setCurrentTemplate(t)
      templateMarketService.recordUsage(template.id).catch(() => {})
    } else {
      toast.error('模板数据未加载，请稍后重试')
    }
  }

  const handleUse = (template: TemplateMarketItem) => {
    setPreviewId(null)
    const hasContent = content.trim().length > 0
    if (hasContent) {
      setConfirmTemplate(template)
    } else {
      applyTemplate(template)
      toast.success(`已应用模板「${template.name}」`)
    }
  }

  const handleApplyCurrent = () => {
    if (!confirmTemplate) return
    applyTemplate(confirmTemplate)
    toast.success(`已应用模板「${confirmTemplate.name}」`)
    setConfirmTemplate(null)
  }

  const handleNewDocument = () => {
    if (!confirmTemplate) return
    // 清空内容后再应用模板
    useEditorStore.getState().clearContent()
    applyTemplate(confirmTemplate)
    toast.success(`已新建文档并应用模板「${confirmTemplate.name}」`)
    setConfirmTemplate(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2">
        <p className="mb-1.5 text-sm font-medium text-gray-700">模板市场</p>
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板…"
            className="h-7 w-full rounded-md border bg-gray-50 pl-7 text-xs outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
      </div>

      <TemplateFilterBar embedded />

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <TemplateGridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-gray-400">没有找到相关模板</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t) => (
              <TemplateMarketCard key={t.id} template={t} onUse={handleUse} onRefresh={reload} />
            ))}
          </div>
        )}
      </div>

      {/* 预览抽屉 */}
      <TemplatePreviewDrawer onUse={handleUse} />

      {/* 确认弹窗 */}
      {confirmTemplate && (
        <TemplateUsageConfirm
          template={confirmTemplate}
          onApplyCurrent={handleApplyCurrent}
          onNewDocument={handleNewDocument}
          onCancel={() => setConfirmTemplate(null)}
        />
      )}
    </div>
  )
}

function TemplateGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}

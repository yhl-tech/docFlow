'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { useEditorStore } from '@/store/editorStore'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'
import { useTemplateMarket, useFilteredTemplates } from '@/hooks/useTemplateMarket'
import { templateMarketService } from '@/lib/api/templateMarketService'
import { TemplateFilterBar } from './TemplateFilterBar'
import { TemplateMarketCard } from './TemplateMarketCard'
import { TemplatePreviewDrawer } from './TemplatePreviewDrawer'
import { TemplateUsageConfirm } from './TemplateUsageConfirm'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import type { TemplateMarketItem } from '@/types/templateMarket'

export function TemplateMarketFullPage() {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    setPreviewId
  } = useTemplateMarketStore()
  const { reload } = useTemplateMarket()

  const { items } = useTemplateMarketStore()
  const { activeCategory, sortBy } = useTemplateMarketStore()
  const filtered = useFilteredTemplates(items, searchQuery, activeCategory, sortBy)

  const { setCurrentTemplate } = useEditorStore()
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateMarketItem | null>(null)

  const { setActiveNavId, setPanelOpen } = useWorkspaceNavStore()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const builtinTemplates = items.filter((t) => t.source === 'builtin')

  const applyTemplate = (template: TemplateMarketItem) => {
    const { templates: tpls } = useEditorStore.getState()
    // id 可能是数字或字符串，统一用字符串比较
    const t = tpls.find((t) => String(t.id) === String(template.id))
    if (t) {
      setCurrentTemplate(t)
      templateMarketService.recordUsage(template.id).catch(() => {})
      // 返回编辑器视图
      setActiveNavId('files')
      setPanelOpen(true)
      toast.success(`已应用模板「${template.name}」`)
    } else {
      toast.error('模板数据未加载，请稍后重试')
    }
  }

  const handleUse = (template: TemplateMarketItem) => {
    setPreviewId(null)
    const { content } = useEditorStore.getState()
    const hasContent = content.trim().length > 0
    if (hasContent) {
      setConfirmTemplate(template)
    } else {
      applyTemplate(template)
    }
  }

  const handleApplyCurrent = () => {
    if (!confirmTemplate) return
    applyTemplate(confirmTemplate)
    setConfirmTemplate(null)
  }

  const handleNewDocument = () => {
    if (!confirmTemplate) return
    useEditorStore.getState().clearContent()
    applyTemplate(confirmTemplate)
    setConfirmTemplate(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 顶部搜索栏 */}
      <div className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板…"
              className="h-9 w-full rounded-lg border border-gray-200 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <TemplateFilterBar />
        </div>
      </div>

      {/* 模板卡片网格 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-6xl p-6">
          {isLoading ? (
            <TemplateGridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-gray-400">没有找到相关模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition hover:border-indigo-300 hover:text-indigo-500"
              >
                <Plus size={24} />
                <span className="text-sm font-medium">新建我的模板</span>
              </button>
              {filtered.map((t) => (
                <TemplateMarketCard key={t.id} template={t} onUse={handleUse} onRefresh={reload} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 预览抽屉 */}
      <TemplatePreviewDrawer onUse={handleUse} />

      {/* 新建模板对话框 */}
      {createDialogOpen && (
        <CreateTemplateDialog
          builtinTemplates={builtinTemplates}
          onCancel={() => setCreateDialogOpen(false)}
        />
      )}

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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  )
}

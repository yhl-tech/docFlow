'use client'

import { X, LayoutTemplate, Star } from 'lucide-react'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { useEditorStore } from '@/store/editorStore'
import { TemplatePreview } from '@/components/workspace/editor/template/TemplatePreview'
import type { TemplateMarketItem } from '@/types/templateMarket'
import type { TemplateConfig } from '@/types/editor-template'

interface TemplatePreviewDrawerProps {
  onUse: (template: TemplateMarketItem) => void
}

export function TemplatePreviewDrawer({ onUse }: TemplatePreviewDrawerProps) {
  const { items, previewId, setPreviewId } = useTemplateMarketStore()
  const template = items.find((t) => t.id === previewId) ?? null

  if (!previewId || !template) return null

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setPreviewId(null)}
      />
      {/* 抽屉 */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-2xl">
        <DrawerHeader template={template} onClose={() => setPreviewId(null)} onUse={onUse} />
        <div className="flex-1 overflow-y-auto">
          <PreviewSection template={template} />
          <InfoSection template={template} />
        </div>
        <DrawerFooter template={template} onClose={() => setPreviewId(null)} onUse={onUse} />
      </div>
    </>
  )
}

function DrawerHeader({
  template,
  onClose,
  onUse,
}: {
  template: TemplateMarketItem
  onClose: () => void
  onUse: (t: TemplateMarketItem) => void
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <span className="font-medium text-gray-800">{template.name}</span>
      </div>
      <button
        onClick={() => onUse(template)}
        className="rounded-md bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
      >
        使用此模板
      </button>
    </div>
  )
}

function PreviewSection({ template }: { template: TemplateMarketItem }) {
  const { templates } = useEditorStore()
  const fullDef = templates.find((t) => t.id === template.id)
  const config = fullDef?.config as TemplateConfig | undefined

  return (
    <div className="border-b p-4">
      <div className="overflow-hidden rounded-lg border bg-gray-50">
        {template.previewImageUrl ? (
          <img
            src={template.previewImageUrl}
            alt={template.name}
            className="w-full object-contain"
          />
        ) : config ? (
          <div className="h-72 overflow-auto">
            <TemplatePreview config={config} />
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-300">
            <LayoutTemplate size={48} />
            <span className="text-sm">暂无预览</span>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoSection({ template }: { template: TemplateMarketItem }) {
  const layout = buildLayoutDescription(template)
  return (
    <div className="px-4 py-4 space-y-4">
      {template.description && (
        <p className="text-sm text-gray-600">{template.description}</p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">模板信息</h3>
        <div className="space-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
          {layout.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-16 shrink-0 text-gray-400">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {template.ratingAvg && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            用户评价
          </h3>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-yellow-400" fill="currentColor" />
            <span className="font-medium text-gray-700">{template.ratingAvg.toFixed(1)}</span>
            <span className="text-sm text-gray-400">（{template.ratingCount} 人评价）</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{template.usageCount.toLocaleString()} 次使用</span>
        {template.tags?.length > 0 && (
          <>
            <span>·</span>
            <div className="flex flex-wrap gap-1">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DrawerFooter({
  template,
  onClose,
  onUse,
}: {
  template: TemplateMarketItem
  onClose: () => void
  onUse: (t: TemplateMarketItem) => void
}) {
  return (
    <div className="flex items-center gap-3 border-t px-4 py-3">
      <button
        onClick={onClose}
        className="flex-1 rounded-md border py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        取消
      </button>
      <button
        onClick={() => onUse(template)}
        className="flex-1 rounded-md bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        使用此模板
      </button>
    </div>
  )
}

function buildLayoutDescription(template: TemplateMarketItem) {
  const items: { label: string; value: string }[] = []
  items.push({ label: '来源', value: template.source === 'builtin' ? '内置模板' : '我的模板' })
  if (template.kind) {
    const kindMap: Record<string, string> = {
      gov_doc: '公文', report: '报告', lesson_plan: '教案',
      notice: '通知', general: '通用', custom: '自定义',
    }
    items.push({ label: '类型', value: kindMap[template.kind] ?? template.kind })
  }
  return items
}

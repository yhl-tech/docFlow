'use client'

import { LayoutTemplate, Star } from 'lucide-react'
import { useTemplateMarketStore } from '@/store/templateMarketStore'
import { TemplateMarketCardMenu } from './TemplateMarketCardMenu'
import type { TemplateMarketItem } from '@/types/templateMarket'

interface TemplateMarketCardProps {
  template: TemplateMarketItem
  onUse: (template: TemplateMarketItem) => void
  onRefresh: () => void
}

export function TemplateMarketCard({ template, onUse, onRefresh }: TemplateMarketCardProps) {
  const { setPreviewId } = useTemplateMarketStore()

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* 缩略图区域 */}
      <TemplateThumbnail url={template.previewImageUrl} kind={template.kind} />

      {/* 用户模板：右上角 ··· 菜单 */}
      {template.source === 'user' && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <TemplateMarketCardMenu
            templateId={template.id}
            templateName={template.name}
            onRefresh={onRefresh}
          />
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <SourceBadge source={template.source} />
          <span className="flex-1 truncate text-sm font-semibold text-gray-800">{template.name}</span>
        </div>
        <p className="mb-auto line-clamp-2 text-xs leading-relaxed text-gray-400">{template.description}</p>

        {/* 统计信息 */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          {template.ratingAvg && (
            <span className="flex items-center gap-0.5">
              <Star size={11} className="text-yellow-400" fill="currentColor" />
              {template.ratingAvg.toFixed(1)}
            </span>
          )}
          <span>{template.usageCount.toLocaleString()} 次使用</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          onClick={() => setPreviewId(template.id)}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          预览
        </button>
        <button
          onClick={() => onUse(template)}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600"
        >
          使用
        </button>
      </div>
    </div>
  )
}

function TemplateThumbnail({ url, kind }: { url: string | null; kind: string }) {
  if (url) {
    return <img src={url} alt="" className="h-36 w-full object-cover" />
  }
  return (
    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <LayoutTemplate size={40} className="text-gray-300" />
    </div>
  )
}

function SourceBadge({ source }: { source: 'builtin' | 'user' }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        source === 'builtin' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
      }`}
    >
      {source === 'builtin' ? '内置' : '我的'}
    </span>
  )
}

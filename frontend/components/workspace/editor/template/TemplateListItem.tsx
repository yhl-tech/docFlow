'use client'

import { Copy, Trash2 } from 'lucide-react'
import type { TemplateDefinition } from '@/types/editor-template'

const KIND_LABELS: Record<string, string> = {
  gov_doc: '公文',
  notice: '通知',
  report: '报告',
  lesson_plan: '教案',
  general: '通用',
  custom: '自定义',
}

interface TemplateListItemProps {
  template: TemplateDefinition
  active: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete?: () => void
}

/**
 * 单个模板行组件
 */
export function TemplateListItem({
  template,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: TemplateListItemProps) {
  const kindLabel = KIND_LABELS[template.kind] ?? template.kind

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
        active ? 'bg-slate-800 text-white' : 'hover:bg-slate-50'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate text-xs font-medium ${active ? 'text-white' : 'text-slate-700'}`}
          >
            {template.name}
          </p>
          <span
            className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
              active ? 'bg-slate-600 text-slate-200' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {kindLabel}
          </span>
        </div>
        {template.description && (
          <p className={`mt-0.5 truncate text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
            {template.description}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDuplicate()
        }}
        title="复制为我的模板"
        className={`ml-2 flex-shrink-0 rounded p-1 transition-colors ${
          active
            ? 'text-slate-300 hover:text-white'
            : 'text-slate-300 hover:text-slate-600'
        }`}
      >
        <Copy className="h-3 w-3" />
      </button>
      {template.source === 'user' && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete()
          }}
          title="删除模板"
          className={`ml-1 flex-shrink-0 rounded p-1 transition-colors ${
            active ? 'text-slate-300 hover:text-white' : 'text-slate-300 hover:text-red-500'
          }`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

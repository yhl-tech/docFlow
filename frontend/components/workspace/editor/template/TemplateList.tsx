'use client'

import type { TemplateDefinition } from '@/types/editor-template'
import { TemplateListItem } from './TemplateListItem'

interface TemplateListProps {
  templates: TemplateDefinition[]
  currentTemplateId?: string
  onSelect: (template: TemplateDefinition) => void
  onDuplicate: (template: TemplateDefinition) => void
  onDelete?: (template: TemplateDefinition) => void
  loading?: boolean
}

/**
 * 模板列表组件
 */
export function TemplateList({
  templates,
  currentTemplateId,
  onSelect,
  onDuplicate,
  onDelete,
  loading = false,
}: TemplateListProps) {
  const builtinTemplates = templates.filter((t) => t.source === 'builtin')
  const userTemplates = templates.filter((t) => t.source === 'user')

  if (loading) {
    return (
      <div className="py-2 text-center text-xs text-slate-400">
        加载中…
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-slate-400">
        暂无可用模板
      </p>
    )
  }

  return (
    <div className="template-panel-scroll max-h-52 space-y-1 overflow-y-auto">
      {builtinTemplates.length > 0 && (
        <>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            内置模板
          </p>
          {builtinTemplates.map((tpl) => (
            <TemplateListItem
              key={tpl.id}
              template={tpl}
              active={currentTemplateId === tpl.id}
              onSelect={() => onSelect(tpl)}
              onDuplicate={() => onDuplicate(tpl)}
            />
          ))}
        </>
      )}
      {userTemplates.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            我的模板
          </p>
          {userTemplates.map((tpl) => (
            <TemplateListItem
              key={tpl.id}
              template={tpl}
              active={currentTemplateId === tpl.id}
              onSelect={() => onSelect(tpl)}
              onDuplicate={() => onDuplicate(tpl)}
              onDelete={onDelete ? () => onDelete(tpl) : undefined}
            />
          ))}
        </>
      )}
    </div>
  )
}

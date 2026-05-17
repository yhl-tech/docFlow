'use client'

import { ArrowLeft } from 'lucide-react'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'

interface TemplateEditHeaderProps {
  templateName: string
  isBuiltin: boolean
  isSaving: boolean
  onSave: () => void
}

export function TemplateEditHeader({ templateName, isBuiltin, isSaving, onSave }: TemplateEditHeaderProps) {
  const { closeTemplateEditor } = useWorkspaceNavStore()

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={closeTemplateEditor}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={14} />
          返回模板市场
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-sm font-medium text-slate-700">
          {isBuiltin ? `预览模板：${templateName}` : `编辑模板：${templateName}`}
        </span>
        {isBuiltin && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-600 ring-1 ring-amber-200">
            内置模板（只读）
          </span>
        )}
      </div>
      {!isBuiltin && (
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isSaving ? '保存中…' : '保存'}
        </button>
      )}
    </div>
  )
}

'use client'

import { Save, ArrowLeft } from 'lucide-react'
import { WorkspaceUserMenu } from './WorkspaceUserMenu'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'

interface WorkspaceHeaderProps {
  title?: string
}

export function WorkspaceHeader({ title = '创作工作台' }: WorkspaceHeaderProps) {
  const { editingTemplateId, templateEditMeta, closeTemplateEditor } = useWorkspaceNavStore()

  const isTemplateEdit = !!editingTemplateId

  return (
    <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
      {/* 左侧：标题区 */}
      <div className="flex items-center gap-3">
        {isTemplateEdit ? (
          <>
            <button
              onClick={closeTemplateEditor}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回模板市场
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-sm font-semibold text-slate-700">
              {templateEditMeta?.title ?? '编辑模板'}
            </span>
            {templateEditMeta?.isBuiltin && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-600 ring-1 ring-amber-200">
                内置（只读）
              </span>
            )}
          </>
        ) : (
          <h2 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
        )}
      </div>

      {/* 右侧：操作区 */}
      <div className="flex items-center gap-1">
        {isTemplateEdit && !templateEditMeta?.isBuiltin && (
          <button
            type="button"
            onClick={() => templateEditMeta?.onSave?.()}
            disabled={templateEditMeta?.isSaving}
            className="mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{templateEditMeta?.isSaving ? '保存中…' : '保存'}</span>
          </button>
        )}

        <div className="ml-1">
          <WorkspaceUserMenu />
        </div>
      </div>
    </header>
  )
}

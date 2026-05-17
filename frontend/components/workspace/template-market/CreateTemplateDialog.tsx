'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { editorService } from '@/lib/api/editor'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'
import type { TemplateMarketItem } from '@/types/templateMarket'

interface CreateTemplateDialogProps {
  builtinTemplates: TemplateMarketItem[]
  onCancel: () => void
}

export function CreateTemplateDialog({ builtinTemplates, onCancel }: CreateTemplateDialogProps) {
  const { openTemplateEditor } = useWorkspaceNavStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!selectedId) return
    setCreating(true)
    try {
      const copy = await editorService.duplicateTemplate(selectedId)
      toast.success(`已创建「${copy.name}」`)
      onCancel()
      openTemplateEditor(copy.id)
    } catch {
      toast.error('创建失败')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-800">新建我的模板</h3>
          <button onClick={onCancel} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-gray-500">选择一个内置模板作为基础，然后在编辑页中自由调整样式</p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {builtinTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  selectedId === t.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  selectedId === t.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">{t.name}</p>
                  {t.description && (
                    <p className="truncate text-xs text-gray-400">{t.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedId || creating}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? '创建中…' : '创建并编辑'}
          </button>
        </div>
      </div>
    </div>
  )
}

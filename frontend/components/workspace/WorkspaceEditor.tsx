'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import type { Editor } from '@tiptap/react'
import { useEditorStore } from '@/store/editorStore'
import { EditorRichToolbar } from './editor/EditorRichToolbar'
import { TipTapEditor } from './editor/TipTapEditor'
import { EditorStatusBar } from './editor/EditorStatusBar'

interface EditingFormula {
  latex: string
  displayMode: boolean
  pos: number
}

export function WorkspaceEditor() {
  const { clearContent, content } = useEditorStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editingFormula, setEditingFormula] = useState<EditingFormula | null>(null)

  // TipTap Editor 实例，就绪后由 TipTapEditor 回调传入，供工具栏使用
  const editorRef = useRef<Editor | null>(null)

  function handleClear() {
    if (!content) return
    setShowClearConfirm(true)
  }
  function confirmClear() {
    clearContent()
    editorRef.current?.commands.setContent('')
    setShowClearConfirm(false)
    toast.info('内容已清空')
  }

  return (
    <div className="relative z-0 flex flex-1 flex-col overflow-hidden bg-white">
      {/* 标题栏 */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        <h2 className="text-sm font-medium tracking-wide text-slate-600">创作工作台</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
          自动保存
        </div>
      </div>

      {/* 工具栏 */}
      <EditorRichToolbar
        editorRef={editorRef}
        onClear={handleClear}
        editingFormula={editingFormula}
        onClearEdit={() => setEditingFormula(null)}
      />

      {/* 编辑区（TipTap WYSIWYG） */}
      <div className="flex-1 overflow-hidden">
        <TipTapEditor
          onReady={(editor) => { editorRef.current = editor }}
          onEditFormula={(latex, displayMode, pos) => setEditingFormula({ latex, displayMode, pos })}
        />
      </div>

      {/* 状态栏 */}
      <EditorStatusBar />

      {/* 清空确认弹窗：Portal 到 body，避免被分割线或父级 overflow 遮挡 */}
      {showClearConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
            <div className="w-80 rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-2 font-semibold text-slate-900">确认清空？</h3>
              <p className="mb-5 text-sm text-slate-500">
                此操作不可恢复，当前编辑内容将被清空。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmClear}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
                >
                  确认清空
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

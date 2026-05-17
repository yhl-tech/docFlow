'use client'

import { useRef, useEffect } from 'react'
import { LayoutTemplate, ChevronRight, Check } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'

interface TemplateMiniSelectorProps {
  anchorRef: React.RefObject<HTMLButtonElement>
  open: boolean
  onClose: () => void
}

export function TemplateMiniSelector({ anchorRef, open, onClose }: TemplateMiniSelectorProps) {
  const { currentTemplate, templates, setCurrentTemplate } = useEditorStore()
  const { setActiveNavId } = useWorkspaceNavStore()
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const handleGoToMarket = () => {
    onClose()
    setActiveNavId('templates')
  }

  const handleSelectTemplate = (tpl: typeof templates[number]) => {
    setCurrentTemplate(tpl as any)
    onClose()
  }

  return (
    <div
      ref={popRef}
      className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border bg-white shadow-xl"
    >
      {/* 头部：当前模板 */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} className="text-indigo-500" />
          <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
            {currentTemplate ? currentTemplate.name : '未应用模板'}
          </span>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="max-h-64 overflow-y-auto py-1">
        {templates.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">暂无模板</p>
        ) : (
          templates.map((tpl) => {
            const isActive = currentTemplate?.id === tpl.id
            return (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-gray-50 ${
                  isActive ? 'text-indigo-600' : 'text-gray-700'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  isActive ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  {isActive && <Check size={10} className="text-indigo-600" />}
                </span>
                <span className="flex-1 truncate">{tpl.name}</span>
                <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] ${
                  tpl.source === 'builtin'
                    ? 'bg-blue-50 text-blue-500'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {tpl.source === 'builtin' ? '内置' : '我的'}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* 底部：去模板市场 */}
      <div className="border-t px-3 py-2">
        <button
          onClick={handleGoToMarket}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          <span>去模板市场选更多</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

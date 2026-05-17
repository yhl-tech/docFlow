'use client'

import { X } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { useDocumentOutline } from '@/hooks/useDocumentOutline'
import { OutlineItem } from './OutlineItem'

export function DocumentOutline() {
  const { setRightPanelMode } = useEditorStore()
  const { headings, activeId, scrollTo } = useDocumentOutline()

  return (
    <div className="flex w-64 shrink-0 flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-gray-500">大纲</span>
        <button
          onClick={() => setRightPanelMode(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {headings.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400">
            还没有标题，使用 # 添加标题
          </p>
        ) : (
          headings.map((h) => (
            <OutlineItem
              key={h.id}
              item={h}
              isActive={h.id === activeId}
              onClick={() => scrollTo(h.pos)}
            />
          ))
        )}
      </div>
    </div>
  )
}

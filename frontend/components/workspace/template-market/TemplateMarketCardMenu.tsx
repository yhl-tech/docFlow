'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { templateMarketService } from '@/lib/api/templateMarketService'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'

interface TemplateMarketCardMenuProps {
  templateId: string
  templateName: string
  onRefresh: () => void
}

export function TemplateMarketCardMenu({ templateId, templateName, onRefresh }: TemplateMarketCardMenuProps) {
  const { openTemplateEditor } = useWorkspaceNavStore()
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameValue, setNameValue] = useState(templateName)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleRename = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === templateName) { setRenaming(false); return }
    try {
      await templateMarketService.rename(templateId, trimmed)
      toast.success('重命名成功')
      onRefresh()
    } catch {
      toast.error('重命名失败')
    }
    setRenaming(false)
    setOpen(false)
  }

  const handleDuplicate = async () => {
    setOpen(false)
    try {
      await templateMarketService.duplicate(templateId)
      toast.success('已创建副本')
      onRefresh()
    } catch {
      toast.error('复制失败')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setOpen(false)
    try {
      await templateMarketService.delete(templateId)
      toast.success('已删除')
      onRefresh()
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setOpen((v) => !v); setConfirmDelete(false) }}
        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 min-w-[140px] rounded-lg border bg-white py-1 shadow-lg">
          {renaming ? (
            <div className="px-2 py-1">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenaming(false); setOpen(false) } }}
                className="w-full rounded border px-2 py-1 text-xs outline-none focus:border-blue-400"
              />
            </div>
          ) : (
            <>
              <button
                onClick={() => { setOpen(false); openTemplateEditor(templateId) }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                编辑样式
              </button>
              <button
                onClick={() => { setRenaming(true); setNameValue(templateName) }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                重命名
              </button>
              <button
                onClick={handleDuplicate}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                复制
              </button>
              <div className="my-1 border-t" />
              <button
                onClick={handleDelete}
                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 ${confirmDelete ? 'font-medium text-red-600' : 'text-red-500'}`}
              >
                {confirmDelete ? '确认删除？' : '删除'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

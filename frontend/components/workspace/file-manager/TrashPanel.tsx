'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { documentService } from '@/lib/api/documentService'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { formatRelativeTime } from '@/lib/utils'
import type { TrashItem } from '@/types/fileManager'

interface TrashPanelProps {
  onBack: () => void
  onReload: () => Promise<void>
}

export function TrashPanel({ onBack, onReload }: TrashPanelProps) {
  const { trashItems, setTrashItems } = useFileManagerStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    documentService.getTrash().then(setTrashItems).finally(() => setLoading(false))
  }, [setTrashItems])

  const handleRestore = async (id: string) => {
    try {
      await documentService.restore(id)
      setTrashItems(trashItems.filter((t) => t.id !== id))
      await onReload()
      toast.success('文档已恢复')
    } catch {
      toast.error('恢复失败')
    }
  }

  const handleDeletePermanent = async (id: string) => {
    try {
      await documentService.deletePermanent(id)
      setTrashItems(trashItems.filter((t) => t.id !== id))
      toast.success('已永久删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm('确定要清空回收站吗？此操作不可撤销。')) return
    try {
      await documentService.emptyTrash()
      setTrashItems([])
      toast.success('回收站已清空')
    } catch {
      toast.error('清空失败')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900" onClick={onBack}>
          <ArrowLeft size={14} />
          回收站
        </button>
        {trashItems.length > 0 && (
          <button className="text-xs text-red-500 hover:text-red-700" onClick={handleEmptyTrash}>
            清空全部
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <p className="py-4 text-center text-sm text-gray-400">加载中…</p>}
        {!loading && trashItems.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">回收站是空的</p>
        )}
        {trashItems.map((item) => (
          <TrashItemRow
            key={item.id}
            item={item}
            onRestore={handleRestore}
            onDelete={handleDeletePermanent}
          />
        ))}
      </div>
    </div>
  )
}

function TrashItemRow({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashItem
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="mb-1 rounded border bg-gray-50 p-2">
      <p className="truncate text-sm font-medium text-gray-700">{item.title || '未命名文档'}</p>
      <p className="text-xs text-gray-400">
        删除于 {item.deletedAt ? formatRelativeTime(item.deletedAt) : '未知'}
      </p>
      <div className="mt-1 flex gap-2">
        <button className="text-xs text-blue-500 hover:text-blue-700" onClick={() => onRestore(item.id)}>
          恢复
        </button>
        <button className="text-xs text-red-500 hover:text-red-700" onClick={() => onDelete(item.id)}>
          永久删除
        </button>
      </div>
    </div>
  )
}

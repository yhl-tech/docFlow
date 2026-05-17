'use client'

import { FileText } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { NodeContextMenu } from './NodeContextMenu'
import { InlineRenameInput } from './InlineRenameInput'
import { formatRelativeTime } from '@/lib/utils'
import type { DocumentMeta } from '@/types/fileManager'

interface DocumentNodeProps {
  doc: DocumentMeta
  depth: number
  onRename: (id: string, title: string) => void
  onTrash: (id: string) => void
  onMove: (id: string) => void
  onDuplicate: (id: string) => void
}

export function DocumentNode({ doc, depth, onRename, onTrash, onMove, onDuplicate }: DocumentNodeProps) {
  const { currentDocumentId, setCurrentDocumentId } = useEditorStore()
  const { renamingId, setRenamingId } = useFileManagerStore()
  const isRenaming = renamingId === doc.id
  const isActive = currentDocumentId === doc.id

  const menuItems = [
    { label: '重命名', onClick: () => setRenamingId(doc.id) },
    { label: '复制', onClick: () => onDuplicate(doc.id) },
    { label: '移动到…', onClick: () => onMove(doc.id) },
    { label: '移入回收站', onClick: () => onTrash(doc.id), danger: true },
  ]

  return (
    <div
      style={{ paddingLeft: depth * 12 + 8 }}
      className={`group flex h-8 cursor-pointer items-center gap-1.5 rounded pr-1 text-sm ${
        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
      onClick={() => setCurrentDocumentId(doc.id)}
    >
      <FileText size={14} className="shrink-0 text-gray-400" />
      {isRenaming ? (
        <InlineRenameInput
          defaultValue={doc.title}
          onConfirm={(title) => { onRename(doc.id, title); setRenamingId(null) }}
          onCancel={() => setRenamingId(null)}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{doc.title || '未命名文档'}</span>
          <span className="shrink-0 text-xs text-gray-300 group-hover:hidden">
            {formatRelativeTime(doc.updatedAt)}
          </span>
          <NodeContextMenu
            items={menuItems}
            className="hidden shrink-0 group-hover:block"
          />
        </>
      )}
    </div>
  )
}

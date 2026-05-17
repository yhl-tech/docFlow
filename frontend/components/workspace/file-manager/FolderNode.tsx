'use client'

import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { NodeContextMenu } from './NodeContextMenu'
import { InlineRenameInput } from './InlineRenameInput'
import { DocumentNode } from './DocumentNode'
import { MoveToDialog } from './MoveToDialog'
import type { FolderNode as FolderNodeType } from '@/types/fileManager'

interface FolderNodeProps {
  node: FolderNodeType
  depth: number
  onRenameDoc: (id: string, title: string) => void
  onTrashDoc: (id: string) => void
  onMoveDoc: (id: string) => void
  onDuplicateDoc: (id: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onMoveFolder: (id: string, targetFolderId: string | null) => void
  onNewDocInFolder: (folderId: string) => void
  onNewFolderInFolder: (folderId: string) => void
}

export function FolderNode({
  node,
  depth,
  onRenameDoc,
  onTrashDoc,
  onMoveDoc,
  onDuplicateDoc,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onNewDocInFolder,
  onNewFolderInFolder,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [movingFolder, setMovingFolder] = useState(false)
  const { renamingId, setRenamingId } = useFileManagerStore()
  const isRenaming = renamingId === node.id

  const menuItems = [
    { label: '重命名', onClick: () => setRenamingId(node.id) },
    { label: '在此新建文档', onClick: () => { setIsExpanded(true); onNewDocInFolder(node.id) } },
    { label: '在此新建文件夹', onClick: () => { setIsExpanded(true); onNewFolderInFolder(node.id) } },
    { label: '移动到…', onClick: () => setMovingFolder(true) },
    { label: '删除文件夹', onClick: () => onDeleteFolder(node.id), danger: true },
  ]

  return (
    <div>
      <div
        style={{ paddingLeft: depth * 12 + 4 }}
        className="group flex h-8 cursor-pointer items-center gap-1 rounded pr-1 text-sm text-gray-700 hover:bg-gray-50"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        {isExpanded ? (
          <FolderOpen size={14} className="shrink-0 text-yellow-500" />
        ) : (
          <Folder size={14} className="shrink-0 text-yellow-500" />
        )}
        {isRenaming ? (
          <InlineRenameInput
            defaultValue={node.name}
            onConfirm={(name) => { onRenameFolder(node.id, name); setRenamingId(null) }}
            onCancel={() => setRenamingId(null)}
          />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
            <NodeContextMenu items={menuItems} className="hidden shrink-0 group-hover:block" />
          </>
        )}
      </div>

      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onRenameDoc={onRenameDoc}
              onTrashDoc={onTrashDoc}
              onMoveDoc={onMoveDoc}
              onDuplicateDoc={onDuplicateDoc}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onMoveFolder={onMoveFolder}
              onNewDocInFolder={onNewDocInFolder}
              onNewFolderInFolder={onNewFolderInFolder}
            />
          ))}
          {(node.documents ?? []).map((doc) => (
            <DocumentNode
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              onRename={onRenameDoc}
              onTrash={onTrashDoc}
              onMove={onMoveDoc}
              onDuplicate={onDuplicateDoc}
            />
          ))}
        </div>
      )}

      {movingFolder && (
        <MoveToDialog
          excludeId={node.id}
          title={`移动文件夹「${node.name}」到`}
          onConfirm={(targetFolderId) => {
            onMoveFolder(node.id, targetFolderId)
            setMovingFolder(false)
          }}
          onCancel={() => setMovingFolder(false)}
        />
      )}
    </div>
  )
}

'use client'

import { FolderNode } from './FolderNode'
import { DocumentNode } from './DocumentNode'
import type { FolderNode as FolderNodeType, DocumentMeta } from '@/types/fileManager'

interface FolderTreeProps {
  nodes: FolderNodeType[]
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

export function FolderTree({
  nodes,
  onRenameDoc,
  onTrashDoc,
  onMoveDoc,
  onDuplicateDoc,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onNewDocInFolder,
  onNewFolderInFolder,
}: FolderTreeProps) {
  // 虚拟根节点展开：直接渲染其 children（文件夹）和 documents（根级文档）
  const virtualRoot = nodes.length === 1 && nodes[0].id === '__root__' ? nodes[0] : null
  const folders = virtualRoot ? virtualRoot.children : nodes.filter((n) => n.id !== '__root__')
  const rootDocs = virtualRoot ? (virtualRoot.documents ?? []) : []

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1">
      {folders.map((node) => (
        <FolderNode
          key={node.id}
          node={node}
          depth={0}
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
      {rootDocs.map((doc) => (
        <DocumentNode
          key={doc.id}
          doc={doc}
          depth={0}
          onRename={onRenameDoc}
          onTrash={onTrashDoc}
          onMove={onMoveDoc}
          onDuplicate={onDuplicateDoc}
        />
      ))}
    </div>
  )
}

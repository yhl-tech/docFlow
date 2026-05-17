'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, PanelLeftClose } from 'lucide-react'
import { toast } from 'sonner'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { useEditorStore } from '@/store/editorStore'
import { useFolderTree } from '@/hooks/useFolderTree'
import { useDocumentNode } from '@/hooks/useDocumentNode'
import { useDocumentSearch } from '@/hooks/useDocumentSearch'
import { folderService } from '@/lib/api/folderService'
import { editorService } from '@/lib/api'
import { FolderTree } from './FolderTree'
import { FileManagerSearch } from './FileManagerSearch'
import { TrashPanel } from './TrashPanel'
import { MoveToDialog } from './MoveToDialog'
import { highlightMatch } from './highlightMatch'
import type { SearchResult } from '@/types/fileManager'

interface FileManagerPanelProps {
  onCollapse?: () => void
}

export function FileManagerPanel({ onCollapse }: FileManagerPanelProps = {}) {
  const { tree, isLoading, isTrashOpen, setTrashOpen, setRenamingId, addFolder } = useFileManagerStore()
  const { setCurrentDocumentId } = useEditorStore()
  const { reload } = useFolderTree()
  const { query, setQuery, results } = useDocumentSearch()
  const ops = useDocumentNode(reload)

  const [movingDocId, setMovingDocId] = useState<string | null>(null)
  const [newMenuOpen, setNewMenuOpen] = useState(false)

  // 新建文档（在根目录或指定文件夹），创建后自动进入重命名状态
  const handleNewDoc = async (parentFolderId: string | null = null) => {
    setNewMenuOpen(false)
    try {
      const res = await editorService.saveDocument({ content: '', title: '未命名文档', template: undefined })
      // 若指定了文件夹，立刻移动过去
      if (parentFolderId) {
        try { await import('@/lib/api/documentService').then(m => m.documentService.move(res.id, parentFolderId)) } catch { /* ignore */ }
      }
      await reload()
      setCurrentDocumentId(res.id)
      setRenamingId(res.id)
    } catch {
      toast.error('新建文档失败')
    }
  }

  // 新建文件夹（在根目录或指定父文件夹），创建后自动进入重命名状态
  const handleNewFolder = async (parentFolderId: string | null = null) => {
    setNewMenuOpen(false)
    try {
      const folder = await folderService.create('未命名文件夹', parentFolderId)
      addFolder(folder, parentFolderId)
      setRenamingId(folder.id)
    } catch {
      toast.error('创建文件夹失败')
    }
  }

  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (!movingDocId) return
    await ops.moveDoc(movingDocId, targetFolderId)
    setMovingDocId(null)
    toast.success('移动成功')
  }

  if (isTrashOpen) {
    return <TrashPanel onBack={() => setTrashOpen(false)} onReload={reload} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium text-gray-700">我的文档</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCollapse}
            title="收起面板"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <PanelLeftClose size={15} />
          </button>
        <div className="relative">
          <button
            onClick={() => setNewMenuOpen((v) => !v)}
            title="新建"
            className="flex items-center gap-0.5 rounded px-1.5 py-1 text-gray-500 hover:bg-gray-100"
          >
            <Plus size={15} />
            <ChevronDown size={11} />
          </button>
          {newMenuOpen && (
            <div className="absolute right-0 top-8 z-50 min-w-[128px] rounded-lg border bg-white py-1 shadow-lg">
              <button
                onClick={() => handleNewDoc(null)}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                新建文档
              </button>
              <button
                onClick={() => handleNewFolder(null)}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                新建文件夹
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      <FileManagerSearch value={query} onChange={setQuery} />

      {isLoading ? (
        <FileManagerSkeleton />
      ) : query ? (
        <SearchResultList results={results} query={query} />
      ) : (tree.length === 0 || (tree.length === 1 && tree[0].id === '__root__' && tree[0].children.length === 0 && tree[0].documents.length === 0)) ? (
        <EmptyState onNew={() => handleNewDoc(null)} />
      ) : (
        <FolderTree
          nodes={tree}
          onRenameDoc={ops.renameDoc}
          onTrashDoc={ops.trashDoc}
          onMoveDoc={setMovingDocId}
          onDuplicateDoc={ops.duplicateDoc}
          onRenameFolder={ops.renameFolder}
          onDeleteFolder={ops.deleteFolder}
          onMoveFolder={ops.moveFolder}
          onNewDocInFolder={handleNewDoc}
          onNewFolderInFolder={handleNewFolder}
        />
      )}

      <button
        className="mx-2 mb-2 mt-auto flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        onClick={() => setTrashOpen(true)}
      >
        <Trash2 size={14} />
        回收站
      </button>

      {movingDocId && (
        <MoveToDialog
          excludeId={movingDocId}
          title="移动文档到"
          onConfirm={handleMoveConfirm}
          onCancel={() => setMovingDocId(null)}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-gray-400">还没有文档，开始创作吧</p>
      <button
        onClick={onNew}
        className="rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
      >
        + 新建文档
      </button>
    </div>
  )
}

function FileManagerSkeleton() {
  return (
    <div className="flex-1 space-y-1 px-3 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex h-8 items-center gap-2 rounded px-1">
          <div className="h-3.5 w-3.5 animate-pulse rounded bg-gray-200" />
          <div className="h-3 flex-1 animate-pulse rounded bg-gray-100" style={{ width: `${60 + i * 15}%` }} />
        </div>
      ))}
    </div>
  )
}

function SearchResultList({ results, query }: { results: SearchResult[]; query: string }) {
  const { setCurrentDocumentId } = useEditorStore()

  if (results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-400">没有找到相关文档</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1">
      {results.map((r) => (
        <div
          key={r.id}
          className="mb-1 cursor-pointer rounded px-2 py-1.5 hover:bg-gray-50"
          onClick={() => setCurrentDocumentId(r.id)}
        >
          <p className="truncate text-sm text-gray-700">{highlightMatch(r.title, query)}</p>
          {r.folderName && <p className="text-xs text-gray-400">{r.folderName}</p>}
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { X, Folder, FolderOpen, ChevronRight } from 'lucide-react'
import { useFileManagerStore } from '@/store/fileManagerStore'
import type { FolderNode } from '@/types/fileManager'

interface MoveToDialogProps {
  /** 正在移动的文档或文件夹 id（不能选为自身目标） */
  excludeId?: string
  title?: string
  onConfirm: (targetFolderId: string | null) => void
  onCancel: () => void
}

export function MoveToDialog({ excludeId, title = '移动到', onConfirm, onCancel }: MoveToDialogProps) {
  const { tree } = useFileManagerStore()
  const [selectedId, setSelectedId] = useState<string | null>(undefined as unknown as null)
  const isSelected = selectedId !== (undefined as unknown as null)

  const folders = extractFolders(tree, excludeId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative flex w-80 flex-col rounded-xl bg-white shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium text-gray-800">{title}</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* 文件夹列表 */}
        <div className="max-h-72 overflow-y-auto py-1">
          {/* 根目录选项 */}
          <FolderOption
            id={null}
            name="根目录（无文件夹）"
            depth={0}
            selected={selectedId === null}
            onSelect={() => setSelectedId(null)}
          />
          {folders.map((f) => (
            <FolderOptionTree
              key={f.id}
              folder={f}
              depth={1}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
          {folders.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">没有可用的文件夹</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            disabled={!isSelected}
            onClick={() => isSelected && onConfirm(selectedId)}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            移动到此处
          </button>
        </div>
      </div>
    </div>
  )
}

function FolderOption({
  id,
  name,
  depth,
  selected,
  onSelect,
}: {
  id: string | null
  name: string
  depth: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      style={{ paddingLeft: depth * 16 + 12 }}
      className={`flex w-full items-center gap-2 py-2 pr-3 text-left text-sm transition ${
        selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {selected ? (
        <FolderOpen size={15} className="shrink-0 text-yellow-500" />
      ) : (
        <Folder size={15} className="shrink-0 text-yellow-400" />
      )}
      <span className="truncate">{name}</span>
      {selected && <span className="ml-auto shrink-0 text-xs text-blue-500">✓</span>}
    </button>
  )
}

function FolderOptionTree({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: FolderNode
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = folder.children.length > 0

  return (
    <div>
      <div
        style={{ paddingLeft: depth * 16 + 4 }}
        className={`flex w-full items-center gap-1 py-2 pr-3 text-left text-sm transition ${
          selectedId === folder.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <button
          className="flex shrink-0 items-center"
          onClick={() => hasChildren && setExpanded((v) => !v)}
        >
          {hasChildren ? (
            <ChevronRight
              size={13}
              className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-[13px]" />
          )}
        </button>
        <button
          className="flex flex-1 items-center gap-2 truncate"
          onClick={() => onSelect(folder.id)}
        >
          {selectedId === folder.id ? (
            <FolderOpen size={15} className="shrink-0 text-yellow-500" />
          ) : (
            <Folder size={15} className="shrink-0 text-yellow-400" />
          )}
          <span className="truncate">{folder.name}</span>
          {selectedId === folder.id && (
            <span className="ml-auto shrink-0 text-xs text-blue-500">✓</span>
          )}
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderOptionTree
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function extractFolders(tree: FolderNode[], excludeId?: string): FolderNode[] {
  // 虚拟根节点：从其 children 中提取实际文件夹
  const roots = tree.length === 1 && tree[0].id === '__root__' ? tree[0].children : tree.filter((n) => 'children' in n)
  return filterFolders(roots, excludeId)
}

function filterFolders(nodes: FolderNode[], excludeId?: string): FolderNode[] {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => ({ ...n, children: filterFolders(n.children ?? [], excludeId) }))
}

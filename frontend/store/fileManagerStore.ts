import { create } from 'zustand'
import type { FolderNode, DocumentMeta, TrashItem } from '@/types/fileManager'

interface FileManagerState {
  tree: FolderNode[]
  trashItems: TrashItem[]
  isLoading: boolean
  isTrashOpen: boolean
  activeFolderId: string | null
  renamingId: string | null

  setTree: (tree: FolderNode[]) => void
  setTrashItems: (items: TrashItem[]) => void
  setLoading: (v: boolean) => void
  setTrashOpen: (v: boolean) => void
  setActiveFolderId: (id: string | null) => void
  setRenamingId: (id: string | null) => void

  addFolder: (folder: FolderNode, parentId: string | null) => void
  removeFolder: (id: string) => void
  removeDocument: (id: string) => void
  renameFolder: (id: string, name: string) => void
  renameDocument: (id: string, title: string) => void
  moveDocument: (docId: string, targetFolderId: string | null) => void
}

export const useFileManagerStore = create<FileManagerState>((set) => ({
  tree: [],
  trashItems: [],
  isLoading: false,
  isTrashOpen: false,
  activeFolderId: null,
  renamingId: null,

  setTree: (tree) => set({ tree }),
  setTrashItems: (trashItems) => set({ trashItems }),
  setLoading: (isLoading) => set({ isLoading }),
  setTrashOpen: (isTrashOpen) => set({ isTrashOpen }),
  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),
  setRenamingId: (renamingId) => set({ renamingId }),

  addFolder: (folder, parentId) =>
    set((s) => ({ tree: insertFolder(s.tree, folder, parentId) })),
  removeFolder: (id) =>
    set((s) => ({ tree: removeFolder(s.tree, id) })),
  removeDocument: (id) =>
    set((s) => ({ tree: removeDocument(s.tree, id) })),
  renameFolder: (id, name) =>
    set((s) => ({ tree: renameFolder(s.tree, id, name) })),
  renameDocument: (id, title) =>
    set((s) => ({ tree: renameDocument(s.tree, id, title) })),
  moveDocument: (docId, targetFolderId) =>
    set((s) => ({ tree: moveDocument(s.tree, docId, targetFolderId) })),
}))

// ── 树操作纯函数 ───────────────────────────────────────────────────────────────

function insertFolder(tree: FolderNode[], folder: FolderNode, parentId: string | null): FolderNode[] {
  // 根目录：插入到虚拟根节点 __root__ 的 children
  if (!parentId) {
    return tree.map((node) =>
      node.id === '__root__'
        ? { ...node, children: [...node.children, folder] }
        : node
    )
  }
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, folder] }
    }
    if (node.children.length) {
      return { ...node, children: insertFolder(node.children, folder, parentId) }
    }
    return node
  })
}

function removeFolder(tree: FolderNode[], id: string): FolderNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeFolder(node.children, id) }))
}

function removeDocument(tree: FolderNode[], id: string): FolderNode[] {
  return tree.map((node) => ({
    ...node,
    documents: (node.documents ?? []).filter((d) => d.id !== id),
    children: removeDocument(node.children ?? [], id),
  }))
}

function renameFolder(tree: FolderNode[], id: string, name: string): FolderNode[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, name }
    if (node.children.length) return { ...node, children: renameFolder(node.children, id, name) }
    return node
  })
}

function renameDocument(tree: FolderNode[], id: string, title: string): FolderNode[] {
  return tree.map((node) => ({
    ...node,
    documents: (node.documents ?? []).map((d) => d.id === id ? { ...d, title } : d),
    children: renameDocument(node.children ?? [], id, title),
  }))
}

function extractDocument(tree: FolderNode[], docId: string): [FolderNode[], DocumentMeta | null] {
  let found: DocumentMeta | null = null
  const next = tree.map((node) => {
    const doc = (node.documents ?? []).find((d) => d.id === docId)
    if (doc) found = doc
    const [newChildren, childFound] = extractDocument(node.children ?? [], docId)
    if (childFound && !found) found = childFound
    return { ...node, documents: (node.documents ?? []).filter((d) => d.id !== docId), children: newChildren }
  })
  return [next, found]
}

function insertDocumentInto(tree: FolderNode[], doc: DocumentMeta, targetFolderId: string | null): FolderNode[] {
  // 根目录：放进虚拟根节点 __root__ 的 documents
  if (!targetFolderId) {
    return tree.map((node) =>
      node.id === '__root__'
        ? { ...node, documents: [...(node.documents ?? []), doc] }
        : node
    )
  }
  return tree.map((node) => {
    if (node.id === targetFolderId) {
      return { ...node, documents: [...(node.documents ?? []), doc] }
    }
    if ((node.children ?? []).length) {
      return { ...node, children: insertDocumentInto(node.children, doc, targetFolderId) }
    }
    return node
  })
}

function moveDocument(tree: FolderNode[], docId: string, targetFolderId: string | null): FolderNode[] {
  const [treeWithoutDoc, movedDoc] = extractDocument(tree, docId)
  if (!movedDoc) return tree
  return insertDocumentInto(treeWithoutDoc, movedDoc, targetFolderId)
}

import { describe, it, expect, beforeEach } from 'vitest'
import { useFileManagerStore } from '@/store/fileManagerStore'
import type { FolderNode, DocumentMeta } from '@/types/fileManager'

// 重置 store 状态
function resetStore() {
  useFileManagerStore.setState({
    tree: [],
    trashItems: [],
    isLoading: false,
    isTrashOpen: false,
    activeFolderId: null,
    renamingId: null,
  })
}

function makeFolder(id: string, name = 'folder', parentId: string | null = null, children: FolderNode[] = [], documents: DocumentMeta[] = []): FolderNode {
  return { id, name, parentId, sortOrder: 0, children, documents }
}

function makeDoc(id: string, title = 'doc', folderId: string | null = null): DocumentMeta {
  return { id, title, folderId, updatedAt: '', wordCount: 0 }
}

describe('fileManagerStore', () => {
  beforeEach(() => {
    resetStore()
  })

  // ── addFolder ────────────────────────────────────────────────────────────────

  describe('addFolder', () => {
    it('adds a root-level folder when parentId is null', () => {
      const folder = makeFolder('f1')
      useFileManagerStore.getState().addFolder(folder, null)
      expect(useFileManagerStore.getState().tree).toHaveLength(1)
      expect(useFileManagerStore.getState().tree[0].id).toBe('f1')
    })

    it('adds a child folder to the correct parent', () => {
      const parent = makeFolder('p1', 'Parent')
      useFileManagerStore.getState().setTree([parent])

      const child = makeFolder('c1', 'Child', 'p1')
      useFileManagerStore.getState().addFolder(child, 'p1')

      const tree = useFileManagerStore.getState().tree
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children[0].id).toBe('c1')
    })

    it('adds a child to nested parent', () => {
      const grandparent = makeFolder('gp', 'GP', null, [makeFolder('p', 'P', 'gp')])
      useFileManagerStore.getState().setTree([grandparent])

      const child = makeFolder('c', 'C', 'p')
      useFileManagerStore.getState().addFolder(child, 'p')

      const tree = useFileManagerStore.getState().tree
      expect(tree[0].children[0].children[0].id).toBe('c')
    })
  })

  // ── removeFolder ─────────────────────────────────────────────────────────────

  describe('removeFolder', () => {
    it('removes a root-level folder', () => {
      useFileManagerStore.getState().setTree([makeFolder('f1'), makeFolder('f2')])
      useFileManagerStore.getState().removeFolder('f1')
      const tree = useFileManagerStore.getState().tree
      expect(tree).toHaveLength(1)
      expect(tree[0].id).toBe('f2')
    })

    it('removes a nested folder', () => {
      const parent = makeFolder('p', 'P', null, [makeFolder('c', 'C', 'p')])
      useFileManagerStore.getState().setTree([parent])
      useFileManagerStore.getState().removeFolder('c')
      expect(useFileManagerStore.getState().tree[0].children).toHaveLength(0)
    })

    it('removing nonexistent folder leaves tree unchanged', () => {
      useFileManagerStore.getState().setTree([makeFolder('f1')])
      useFileManagerStore.getState().removeFolder('ghost')
      expect(useFileManagerStore.getState().tree).toHaveLength(1)
    })
  })

  // ── removeDocument ───────────────────────────────────────────────────────────

  describe('removeDocument', () => {
    it('removes a document from a folder', () => {
      const doc = makeDoc('d1', 'Doc', 'f1')
      const folder = makeFolder('f1', 'F', null, [], [doc])
      useFileManagerStore.getState().setTree([folder])
      useFileManagerStore.getState().removeDocument('d1')
      expect(useFileManagerStore.getState().tree[0].documents).toHaveLength(0)
    })

    it('removes document from nested folder', () => {
      const doc = makeDoc('d1', 'Doc', 'child')
      const child = makeFolder('child', 'Child', 'parent', [], [doc])
      const parent = makeFolder('parent', 'Parent', null, [child])
      useFileManagerStore.getState().setTree([parent])
      useFileManagerStore.getState().removeDocument('d1')
      expect(useFileManagerStore.getState().tree[0].children[0].documents).toHaveLength(0)
    })
  })

  // ── renameFolder ─────────────────────────────────────────────────────────────

  describe('renameFolder', () => {
    it('renames a root folder', () => {
      useFileManagerStore.getState().setTree([makeFolder('f1', 'Old')])
      useFileManagerStore.getState().renameFolder('f1', 'New')
      expect(useFileManagerStore.getState().tree[0].name).toBe('New')
    })

    it('renames a nested folder', () => {
      const child = makeFolder('c1', 'OldChild', 'p1')
      const parent = makeFolder('p1', 'Parent', null, [child])
      useFileManagerStore.getState().setTree([parent])
      useFileManagerStore.getState().renameFolder('c1', 'NewChild')
      expect(useFileManagerStore.getState().tree[0].children[0].name).toBe('NewChild')
    })
  })

  // ── renameDocument ───────────────────────────────────────────────────────────

  describe('renameDocument', () => {
    it('renames a document inside a folder', () => {
      const doc = makeDoc('d1', 'Old Title', 'f1')
      const folder = makeFolder('f1', 'F', null, [], [doc])
      useFileManagerStore.getState().setTree([folder])
      useFileManagerStore.getState().renameDocument('d1', 'New Title')
      expect(useFileManagerStore.getState().tree[0].documents[0].title).toBe('New Title')
    })

    it('does not affect other documents', () => {
      const d1 = makeDoc('d1', 'A', 'f1')
      const d2 = makeDoc('d2', 'B', 'f1')
      const folder = makeFolder('f1', 'F', null, [], [d1, d2])
      useFileManagerStore.getState().setTree([folder])
      useFileManagerStore.getState().renameDocument('d1', 'A-renamed')
      const docs = useFileManagerStore.getState().tree[0].documents
      expect(docs[0].title).toBe('A-renamed')
      expect(docs[1].title).toBe('B')
    })
  })

  // ── moveDocument ─────────────────────────────────────────────────────────────

  describe('moveDocument', () => {
    it('moves a document from one folder to another', () => {
      const doc = makeDoc('d1', 'Doc', 'src')
      const src = makeFolder('src', 'Src', null, [], [doc])
      const dst = makeFolder('dst', 'Dst', null, [], [])
      useFileManagerStore.getState().setTree([src, dst])

      useFileManagerStore.getState().moveDocument('d1', 'dst')

      const tree = useFileManagerStore.getState().tree
      const srcFolder = tree.find((n) => n.id === 'src')!
      const dstFolder = tree.find((n) => n.id === 'dst')!
      expect(srcFolder.documents).toHaveLength(0)
      expect(dstFolder.documents[0].id).toBe('d1')
    })

    it('moves a document to root (targetFolderId=null) — creates root-level entry', () => {
      const doc = makeDoc('d1', 'Doc', 'f1')
      const folder = makeFolder('f1', 'F', null, [], [doc])
      useFileManagerStore.getState().setTree([folder])

      useFileManagerStore.getState().moveDocument('d1', null)

      const tree = useFileManagerStore.getState().tree
      const f1 = tree.find((n) => n.id === 'f1')!
      expect(f1.documents).toHaveLength(0)
      // root-level entry is appended as a non-folder node
      expect(tree.some((n) => (n as any).id === 'd1')).toBe(true)
    })

    it('returns tree unchanged if docId not found', () => {
      const folder = makeFolder('f1', 'F', null, [], [makeDoc('d1')])
      useFileManagerStore.getState().setTree([folder])
      useFileManagerStore.getState().moveDocument('ghost', 'f1')
      expect(useFileManagerStore.getState().tree[0].documents[0].id).toBe('d1')
    })
  })

  // ── primitive setters ────────────────────────────────────────────────────────

  describe('primitive setters', () => {
    it('setLoading updates isLoading', () => {
      useFileManagerStore.getState().setLoading(true)
      expect(useFileManagerStore.getState().isLoading).toBe(true)
    })

    it('setTrashOpen updates isTrashOpen', () => {
      useFileManagerStore.getState().setTrashOpen(true)
      expect(useFileManagerStore.getState().isTrashOpen).toBe(true)
    })

    it('setActiveFolderId updates activeFolderId', () => {
      useFileManagerStore.getState().setActiveFolderId('f1')
      expect(useFileManagerStore.getState().activeFolderId).toBe('f1')
    })

    it('setRenamingId updates renamingId', () => {
      useFileManagerStore.getState().setRenamingId('f1')
      expect(useFileManagerStore.getState().renamingId).toBe('f1')
    })
  })
})

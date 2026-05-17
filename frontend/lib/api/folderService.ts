import api from './instance'
import type { FolderNode } from '@/types/fileManager'

export const folderService = {
  getTree: (): Promise<FolderNode[]> =>
    api.get<FolderNode[]>('/api/folders').then((r) => {
      // 后端返回 snake_case，转换为 camelCase
      return normalizeFolderTree(r.data)
    }),

  create: (name: string, parentId: string | null): Promise<FolderNode> =>
    api.post('/api/folders', { name, parent_id: parentId }).then((r) => normalizeFolder(r.data)),

  rename: (id: string, name: string): Promise<void> =>
    api.put(`/api/folders/${id}`, { name }),

  move: (id: string, parentId: string | null): Promise<void> =>
    api.put(`/api/folders/${id}`, { parent_id: parentId }),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/folders/${id}`),
}

function normalizeFolder(raw: Record<string, unknown>): FolderNode {
  return {
    id: raw.id as string,
    name: raw.name as string,
    parentId: (raw.parent_id ?? null) as string | null,
    sortOrder: (raw.sort_order ?? 0) as number,
    children: ((raw.children as unknown[]) ?? []).map((c) => normalizeFolder(c as Record<string, unknown>)),
    documents: ((raw.documents as unknown[]) ?? []).map((d) => normalizeDoc(d as Record<string, unknown>)),
  }
}

function normalizeDoc(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    title: raw.title as string,
    folderId: (raw.folder_id ?? null) as string | null,
    updatedAt: (raw.updated_at ?? '') as string,
    wordCount: (raw.word_count ?? 0) as number,
    isDeleted: (raw.is_deleted ?? false) as boolean,
    deletedAt: (raw.deleted_at ?? null) as string | null,
  }
}

function normalizeFolderTree(raw: unknown[]): FolderNode[] {
  if (raw.length === 1 && (raw[0] as Record<string, unknown>).__type === 'root') {
    // 新格式：{ __type: 'root', folders: [...], documents: [...] }
    const root = raw[0] as { folders: unknown[]; documents: unknown[] }
    const rootDocs = (root.documents ?? []).map((d) => normalizeDoc(d as Record<string, unknown>))
    const folders = (root.folders ?? []).map((f) => normalizeFolder(f as Record<string, unknown>))
    // 虚拟根节点承载根级文档
    const virtualRoot: FolderNode = {
      id: '__root__',
      name: '__root__',
      parentId: null,
      sortOrder: -1,
      children: folders,
      documents: rootDocs,
    }
    return [virtualRoot]
  }
  // 兼容旧格式（不应再出现）
  return raw.map((item) => {
    const r = item as Record<string, unknown>
    if (!('children' in r)) return normalizeDoc(r) as unknown as FolderNode
    return normalizeFolder(r)
  })
}

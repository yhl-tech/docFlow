import api from './instance'
import type { TrashItem, SearchResult } from '@/types/fileManager'

export const documentService = {
  trash: (id: string): Promise<void> =>
    api.put(`/api/editor/documents/${id}/trash`),

  restore: (id: string): Promise<void> =>
    api.post(`/api/editor/documents/${id}/restore`),

  deletePermanent: (id: string): Promise<void> =>
    api.delete(`/api/editor/documents/${id}/permanent`),

  emptyTrash: (): Promise<{ deleted: number }> =>
    api.delete('/api/editor/documents/trash/empty').then((r) => r.data),

  move: (id: string, folderId: string | null): Promise<void> =>
    api.put(`/api/editor/documents/${id}/move`, { folder_id: folderId }),

  rename: (id: string, title: string): Promise<void> =>
    api.put(`/api/editor/documents/${id}/rename`, { title }),

  duplicate: (id: string): Promise<{ id: string; title: string; folderId: string | null }> =>
    api.post(`/api/editor/documents/${id}/duplicate`).then((r) => r.data),

  getTrash: (): Promise<TrashItem[]> =>
    api.get('/api/editor/documents/trash').then((r) =>
      (r.data as Record<string, unknown>[]).map((d) => ({
        id: d.id as string,
        title: d.title as string,
        folderId: (d.folder_id ?? null) as string | null,
        deletedAt: (d.deleted_at ?? null) as string | null,
        wordCount: (d.word_count ?? 0) as number,
      }))
    ),

  search: (q: string): Promise<SearchResult[]> =>
    api.get('/api/editor/documents/search', { params: { q } }).then((r) =>
      (r.data as Record<string, unknown>[]).map((d) => ({
        id: d.id as string,
        title: d.title as string,
        folderId: (d.folder_id ?? null) as string | null,
        folderName: (d.folder_name ?? '') as string,
        updatedAt: (d.updated_at ?? '') as string,
        wordCount: (d.word_count ?? 0) as number,
      }))
    ),
}

export interface DocumentMeta {
  id: string
  title: string
  folderId: string | null
  updatedAt: string
  wordCount: number
  isDeleted?: boolean
  deletedAt?: string | null
}

export interface FolderNode {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  children: FolderNode[]
  documents: DocumentMeta[]
  isExpanded?: boolean
}

export interface TrashItem {
  id: string
  title: string
  folderId: string | null
  deletedAt: string | null
  wordCount: number
}

export interface SearchResult {
  id: string
  title: string
  folderId: string | null
  folderName: string
  updatedAt: string
  wordCount: number
}

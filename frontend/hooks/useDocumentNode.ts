import { useCallback } from 'react'
import { toast } from 'sonner'
import { folderService } from '@/lib/api/folderService'
import { documentService } from '@/lib/api/documentService'
import { useFileManagerStore } from '@/store/fileManagerStore'

export function useDocumentNode(onReload: () => Promise<void>) {
  const store = useFileManagerStore()

  const renameDoc = useCallback(async (id: string, title: string) => {
    store.renameDocument(id, title)
    try {
      await documentService.rename(id, title)
    } catch {
      toast.error('重命名失败')
      await onReload()
    }
  }, [store, onReload])

  const trashDoc = useCallback(async (id: string) => {
    store.removeDocument(id)
    try {
      await documentService.trash(id)
    } catch {
      toast.error('移入回收站失败')
      await onReload()
    }
  }, [store, onReload])

  const moveDoc = useCallback(async (docId: string, targetFolderId: string | null) => {
    store.moveDocument(docId, targetFolderId)
    try {
      await documentService.move(docId, targetFolderId)
    } catch {
      toast.error('移动失败')
      await onReload()
    }
  }, [store, onReload])

  const duplicateDoc = useCallback(async (id: string) => {
    try {
      await documentService.duplicate(id)
      toast.success('已创建副本')
      await onReload()
    } catch {
      toast.error('复制失败')
    }
  }, [onReload])

  const renameFolder = useCallback(async (id: string, name: string) => {
    store.renameFolder(id, name)
    try {
      await folderService.rename(id, name)
    } catch {
      toast.error('重命名失败')
      await onReload()
    }
  }, [store, onReload])

  const deleteFolder = useCallback(async (id: string) => {
    store.removeFolder(id)
    try {
      await folderService.delete(id)
    } catch {
      toast.error('删除文件夹失败')
      await onReload()
    }
  }, [store, onReload])

  const moveFolder = useCallback(async (id: string, targetParentId: string | null) => {
    try {
      await folderService.move(id, targetParentId)
      await onReload()
    } catch {
      toast.error('移动文件夹失败')
    }
  }, [onReload])

  return { renameDoc, trashDoc, moveDoc, duplicateDoc, renameFolder, deleteFolder, moveFolder }
}

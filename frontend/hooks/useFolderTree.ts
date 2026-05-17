import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { folderService } from '@/lib/api/folderService'
import { useFileManagerStore } from '@/store/fileManagerStore'

export function useFolderTree() {
  const { setTree, setLoading } = useFileManagerStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tree = await folderService.getTree()
      setTree(tree)
    } catch {
      toast.error('加载文档列表失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [setTree, setLoading])

  useEffect(() => {
    load()
  }, [load])

  return { reload: load }
}

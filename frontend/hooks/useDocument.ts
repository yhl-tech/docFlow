'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { editorService, type Template, type DocumentMeta } from '@/lib/api'

// ============================================================
// 类型定义
// ============================================================

export interface UseDocumentOptions {
  /** 保存成功回调 */
  onSaved?: (doc: DocumentMeta) => void
  /** 加载成功回调 */
  onLoaded?: (content: string, meta: DocumentMeta) => void
  /** 删除成功回调 */
  onDeleted?: (id: string) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseDocumentState {
  /** 文档列表 */
  documents: DocumentMeta[]
  /** 当前文档 */
  currentDoc: DocumentMeta | null
  /** 当前文档内容 */
  currentContent: string
  /** 加载中 */
  isLoading: boolean
  /** 保存中 */
  isSaving: boolean
  /** 列表加载中 */
  isFetching: boolean
}

export interface UseDocumentActions {
  /** 加载文档列表 */
  fetchDocuments: () => Promise<void>
  /** 加载文档 */
  loadDocument: (id: string) => Promise<boolean>
  /** 保存文档 */
  saveDocument: (content: string, title?: string, template?: Template) => Promise<boolean>
  /** 删除文档 */
  deleteDocument: (id: string) => Promise<boolean>
  /** 创建新文档 */
  createNew: () => void
  /** 清空当前文档 */
  clearCurrent: () => void
}

export type UseDocumentReturn = UseDocumentState & UseDocumentActions

// ============================================================
// 工具函数
// ============================================================

function handleApiError(error: unknown, fallbackMsg: string, onError?: (error: Error) => void): string {
  const err = error as Error
  const message = err.response?.data?.error ?? err.message ?? fallbackMsg
  toast.error(message)
  onError?.(err)
  return message
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 文档管理业务 Hook
 * 
 * 职责：
 * - 文档 CRUD 操作
 * - 文档状态管理
 * - 当前文档切换
 * 
 * 使用场景：
 * - 侧边栏文档列表
 * - 文档切换
 * - 新建/保存/删除文档
 */
export function useDocument(options: UseDocumentOptions = {}): UseDocumentReturn {
  const { onSaved, onLoaded, onDeleted, onError } = options

  // ------------------- 状态 -------------------
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [currentDoc, setCurrentDoc] = useState<DocumentMeta | null>(null)
  const [currentContent, setCurrentContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // ------------------- 文档列表 -------------------

  /** 加载文档列表 */
  const fetchDocuments = useCallback(async (): Promise<void> => {
    setIsFetching(true)
    try {
      const list = await editorService.listDocuments()
      setDocuments(list)
    } catch {
      handleApiError(new Error('获取列表失败'), '获取列表失败', onError)
    } finally {
      setIsFetching(false)
    }
  }, [onError])

  // ------------------- 文档操作 -------------------

  /** 加载文档 */
  const loadDocument = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const res = await editorService.loadDocument(id)
      const meta: DocumentMeta = {
        id: res.meta.id,
        title: res.meta.title,
        createdAt: res.meta.createdAt,
        updatedAt: res.meta.updatedAt,
        wordCount: res.meta.wordCount,
      }
      setCurrentDoc(meta)
      setCurrentContent(res.content)
      onLoaded?.(res.content, meta)
      return true
    } catch {
      handleApiError(new Error('加载失败'), '加载失败', onError)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [onLoaded, onError])

  /** 保存文档 */
  const saveDocument = useCallback(async (
    content: string,
    title?: string,
    template?: Template
  ): Promise<boolean> => {
    setIsSaving(true)
    try {
      const res = await editorService.saveDocument({ content, title, template })
      const meta: DocumentMeta = {
        id: res.id,
        title: title || currentDoc?.title || '未命名',
        createdAt: currentDoc?.createdAt || res.savedAt,
        updatedAt: res.savedAt,
        wordCount: res.wordCount,
      }
      setCurrentDoc(meta)
      setCurrentContent(content)
      
      // 更新列表中的文档
      setDocuments(prev => {
        const idx = prev.findIndex(d => d.id === meta.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = meta
          return updated
        }
        return [meta, ...prev]
      })
      
      onSaved?.(meta)
      return true
    } catch {
      handleApiError(new Error('保存失败'), '保存失败', onError)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [currentDoc, onSaved, onError])

  /** 删除文档 */
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      await editorService.deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
      
      // 如果删除的是当前文档，清空
      if (currentDoc?.id === id) {
        setCurrentDoc(null)
        setCurrentContent('')
      }
      
      onDeleted?.(id)
      return true
    } catch {
      handleApiError(new Error('删除失败'), '删除失败', onError)
      return false
    }
  }, [currentDoc, onDeleted, onError])

  /** 创建新文档 */
  const createNew = useCallback(() => {
    setCurrentDoc(null)
    setCurrentContent('')
  }, [])

  /** 清空当前文档 */
  const clearCurrent = useCallback(() => {
    setCurrentDoc(null)
    setCurrentContent('')
  }, [])

  return {
    // 状态
    documents,
    currentDoc,
    currentContent,
    isLoading,
    isSaving,
    isFetching,
    // 操作
    fetchDocuments,
    loadDocument,
    saveDocument,
    deleteDocument,
    createNew,
    clearCurrent,
  }
}

export default useDocument

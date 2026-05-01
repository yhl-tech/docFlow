'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { editorService, type DocumentMeta } from '@/lib/api'
import type { TemplateBinding } from '@/types/editor-template'
import { useEditorStore } from '@/store/editorStore'

// ============================================================
// 类型定义
// ============================================================

export interface EditorOptions {
  /** 是否启用自动保存 */
  autoSave?: boolean
  /** 自动保存间隔（毫秒），默认 30s */
  autoSaveInterval?: number
  /** 保存成功回调 */
  onSaved?: (doc: DocumentMeta) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseEditorState {
  /** 保存中状态 */
  isSaving: boolean
  /** 上传中状态 */
  isUploading: boolean
  /** 保存状态 */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  /** 最后保存时间 */
  lastSavedAt: string | null
}

export interface UseEditorActions {
  /** 保存文档 */
  saveDocument: (content: string, title?: string, template?: string, templateBinding?: TemplateBinding | null) => Promise<DocumentMeta | null>
  /** 加载文档 */
  loadDocument: (id: string) => Promise<string | null>
  /** 删除文档 */
  deleteDocument: (id: string) => Promise<boolean>
  /** 获取文档列表 */
  listDocuments: () => Promise<DocumentMeta[]>
  /** 上传图片 */
  uploadImage: (file: File) => Promise<string | null>
  /** 上传图片（URL） */
  uploadImageFromUrl: (url: string) => Promise<string | null>
  /** 渲染 LaTeX */
  renderLatex: (latex: string, displayMode?: boolean) => Promise<string | null>
  /** 验证 LaTeX */
  validateLatex: (latex: string) => Promise<{ valid: boolean; error?: string }>
  /** 应用模板 */
  applyTemplate: (template: string, content: string) => Promise<string | null>
  /** 生成目录 */
  generateToc: (content: string) => Promise<{ level: number; text: string; anchor: string }[]>
}

export type UseEditorReturn = UseEditorState & UseEditorActions

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
 * 编辑器增强业务 Hook
 * 
 * 职责：
 * - 文档 CRUD 操作
 * - 图片上传
 * - LaTeX 公式渲染
 * - 模板应用
 * - 自动保存
 */
export function useEditor(options: EditorOptions = {}): UseEditorReturn {
  const {
    autoSave = false,
    autoSaveInterval = 30_000,
    onSaved,
    onError,
  } = options

  // ------------------- 状态 -------------------
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<UseEditorState['saveStatus']>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const {
    setCurrentDocumentId,
    setTemplateBinding,
    setTemplates,
    setCurrentTemplate,
  } = useEditorStore()

  // ------------------- Refs -------------------
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestContentRef = useRef<string>('')

  // ------------------- 文档操作 -------------------

  /** 保存文档 */
  const saveDocument = useCallback(async (
    content: string,
    title?: string,
    template?: string,
    templateBinding?: TemplateBinding | null
  ): Promise<DocumentMeta | null> => {
    setIsSaving(true)
    setSaveStatus('saving')
    latestContentRef.current = content

    try {
      const res = await editorService.saveDocument({ content, title, template, templateBinding })
      const doc: DocumentMeta = {
        id: res.id,
        title: title || '未命名',
        createdAt: res.savedAt,
        updatedAt: res.savedAt,
        wordCount: res.wordCount,
      }
      setCurrentDocumentId(doc.id)
      setTemplateBinding(templateBinding ?? null)
      setSaveStatus('saved')
      setLastSavedAt(res.savedAt)
      onSaved?.(doc)
      return doc
    } catch {
      setSaveStatus('error')
      handleApiError(new Error('保存失败'), '保存失败', onError)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [onSaved, onError])

  /** 加载文档 */
  const loadDocument = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await editorService.loadDocument(id)
      setCurrentDocumentId(id)
      setTemplateBinding(res.templateBinding ?? null)
      if (res.templateBinding?.templateId) {
        const templates = await editorService.getTemplates()
        setTemplates(templates as any)
        const matched = templates.find((item) => item.id === res.templateBinding?.templateId)
        setCurrentTemplate((matched ?? null) as any)
      }
      latestContentRef.current = res.content
      toast.success('文档加载成功')
      return res.content
    } catch {
      handleApiError(new Error('加载失败'), '加载失败', onError)
      return null
    }
  }, [onError])

  /** 删除文档 */
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      await editorService.deleteDocument(id)
      toast.success('文档已删除')
      return true
    } catch {
      handleApiError(new Error('删除失败'), '删除失败', onError)
      return false
    }
  }, [onError])

  /** 获取文档列表 */
  const listDocuments = useCallback(async (): Promise<DocumentMeta[]> => {
    try {
      return await editorService.listDocuments()
    } catch {
      handleApiError(new Error('获取列表失败'), '获取列表失败', onError)
      return []
    }
  }, [onError])

  // ------------------- 图片上传 -------------------

  /** 上传图片 */
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    // 前置校验
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件')
      return null
    }
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('图片大小不能超过 10MB')
      return null
    }

    setIsUploading(true)
    try {
      const res = await editorService.uploadImage(file)
      toast.success('图片上传成功')
      return res.url
    } catch {
      handleApiError(new Error('上传失败'), '上传失败', onError)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [onError])

  /** 从 URL 上传图片 */
  const uploadImageFromUrl = useCallback(async (url: string): Promise<string | null> => {
    setIsUploading(true)
    try {
      const res = await editorService.uploadImageFromUrl(url)
      toast.success('图片上传成功')
      return res.url
    } catch {
      handleApiError(new Error('上传失败'), '上传失败', onError)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [onError])

  // ------------------- 公式渲染 -------------------

  /** 渲染 LaTeX */
  const renderLatex = useCallback(async (
    latex: string,
    displayMode = false
  ): Promise<string | null> => {
    try {
      const res = await editorService.renderLatex({ latex, displayMode })
      return res.html
    } catch {
      handleApiError(new Error('公式渲染失败'), '公式渲染失败', onError)
      return null
    }
  }, [onError])

  /** 验证 LaTeX */
  const validateLatex = useCallback(async (
    latex: string
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      return await editorService.validateLatex(latex)
    } catch {
      return { valid: false, error: '验证失败' }
    }
  }, [])

  // ------------------- 模板 & 目录 -------------------

  /** 应用模板 */
  const applyTemplate = useCallback(async (
    template: string,
    content: string
  ): Promise<string | null> => {
    try {
      const result = await editorService.applyTemplate(template, content)
      toast.success('模板应用成功')
      return result
    } catch {
      handleApiError(new Error('模板应用失败'), '模板应用失败', onError)
      return null
    }
  }, [onError])

  /** 生成目录 */
  const generateToc = useCallback(async (
    content: string
  ): Promise<{ level: number; text: string; anchor: string }[]> => {
    try {
      return await editorService.generateToc(content)
    } catch {
      handleApiError(new Error('生成目录失败'), '生成目录失败', onError)
      return []
    }
  }, [onError])

  // ------------------- 自动保存 -------------------

  useEffect(() => {
    if (!autoSave) return

    const timer = setInterval(() => {
      if (latestContentRef.current && saveStatus !== 'saving') {
        saveDocument(latestContentRef.current)
      }
    }, autoSaveInterval)

    autoSaveTimerRef.current = timer

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [autoSave, autoSaveInterval, saveDocument, saveStatus])

  return {
    // 状态
    isSaving,
    isUploading,
    saveStatus,
    lastSavedAt,
    // 操作
    saveDocument,
    loadDocument,
    deleteDocument,
    listDocuments,
    uploadImage,
    uploadImageFromUrl,
    renderLatex,
    validateLatex,
    applyTemplate,
    generateToc,
  }
}

export default useEditor

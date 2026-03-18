'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { editorService, type ImageUploadResponse } from '@/lib/api'

// ============================================================
// 类型定义
// ============================================================

export interface UseImageUploaderOptions {
  /** 最大文件大小（字节），默认 10MB */
  maxSize?: number
  /** 允许的文件类型 */
  allowedTypes?: string[]
  /** 上传成功回调 */
  onSuccess?: (url: string, response: ImageUploadResponse) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseImageUploaderState {
  /** 上传中 */
  isUploading: boolean
  /** 进度（0-100） */
  progress: number
  /** 上次上传结果 */
  lastResult: ImageUploadResponse | null
  /** 上次错误 */
  lastError: string | null
}

export interface UseImageUploaderActions {
  /** 上传文件 */
  upload: (file: File) => Promise<string | null>
  /** 从 URL 上传 */
  uploadFromUrl: (url: string) => Promise<string | null>
  /** 粘贴上传 */
  uploadFromClipboard: (clipboardData: DataTransfer) => Promise<string | null>
  /** 拖拽上传 */
  uploadFromDrop: (dataTransfer: DataTransfer) => Promise<string | null>
  /** 校验文件 */
  validateFile: (file: File) => { valid: boolean; error?: string }
}

export type UseImageUploaderReturn = UseImageUploaderState & UseImageUploaderActions

// ============================================================
// 常量
// ============================================================

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

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

function isImageType(type: string): boolean {
  return type.startsWith('image/')
}

function getImageFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = []
  if (dataTransfer.files?.length) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i]
      if (isImageType(file.type)) {
        files.push(file)
      }
    }
  }
  return files
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 图片上传业务 Hook
 * 
 * 职责：
 * - 文件/URL/剪贴板/拖拽上传
 * - 文件校验（类型、大小）
 * - 上传进度跟踪
 * 
 * 使用场景：
 * - 编辑器图片插入
 * - 文档图片上传
 * - 用户头像上传
 */
export function useImageUploader(options: UseImageUploaderOptions = {}): UseImageUploaderReturn {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onSuccess,
    onError,
  } = options

  // ------------------- 状态 -------------------
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastResult, setLastResult] = useState<ImageUploadResponse | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  // ------------------- 校验 -------------------

  /** 校验文件是否合法 */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!isImageType(file.type)) {
      return { valid: false, error: '请上传图片文件' }
    }
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: '不支持的图片格式' }
    }
    if (file.size > maxSize) {
      return { valid: false, error: `图片大小不能超过 ${maxSize / 1024 / 1024}MB` }
    }
    return { valid: true }
  }, [allowedTypes, maxSize])

  // ------------------- 上传操作 -------------------

  /** 上传文件 */
  const upload = useCallback(async (file: File): Promise<string | null> => {
    // 校验
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      setLastError(validation.error || '校验失败')
      return null
    }

    setIsUploading(true)
    setProgress(0)
    setLastError(null)

    try {
      const res = await editorService.uploadImage(file)
      setLastResult(res)
      setProgress(100)
      toast.success('图片上传成功')
      onSuccess?.(res.url, res)
      return res.url
    } catch {
      const msg = handleApiError(new Error('上传失败'), '上传失败', onError)
      setLastError(msg)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, onSuccess, onError])

  /** 从 URL 上传 */
  const uploadFromUrl = useCallback(async (url: string): Promise<string | null> => {
    if (!url) {
      toast.error('请输入图片 URL')
      return null
    }

    setIsUploading(true)
    setLastError(null)

    try {
      const res = await editorService.uploadImageFromUrl(url)
      setLastResult(res)
      setProgress(100)
      toast.success('图片上传成功')
      onSuccess?.(res.url, res)
      return res.url
    } catch {
      const msg = handleApiError(new Error('上传失败'), '上传失败', onError)
      setLastError(msg)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [onSuccess, onError])

  /** 从剪贴板上传 */
  const uploadFromClipboard = useCallback(async (clipboardData: DataTransfer): Promise<string | null> => {
    const files = getImageFiles(clipboardData)
    if (files.length === 0) {
      toast.error('剪贴板中没有图片')
      return null
    }
    return upload(files[0])
  }, [upload])

  /** 从拖拽数据上传 */
  const uploadFromDrop = useCallback(async (dataTransfer: DataTransfer): Promise<string | null> => {
    const files = getImageFiles(dataTransfer)
    if (files.length === 0) {
      toast.error('请拖拽图片文件')
      return null
    }
    return upload(files[0])
  }, [upload])

  return {
    // 状态
    isUploading,
    progress,
    lastResult,
    lastError,
    // 操作
    upload,
    uploadFromUrl,
    uploadFromClipboard,
    uploadFromDrop,
    validateFile,
  }
}

export default useImageUploader

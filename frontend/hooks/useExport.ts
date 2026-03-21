'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { exportService, type ExportFormat } from '@/lib/api'
import { useEditorStore } from '@/store/editorStore'
import { downloadBlob, extractFilename } from '@/lib/download'
import { UpgradeModal } from '@/components/pricing/UpgradeModal'

// ============================================================
// 类型定义
// ============================================================

export interface UseExportOptions {
  /** 导出成功回调 */
  onSuccess?: (filename: string) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseExportReturn {
  /** 执行导出 */
  exportDoc: (format: ExportFormat) => Promise<boolean>
  /** 导出为 DOCX */
  exportToDocx: () => Promise<boolean>
  /** 导出为 PDF */
  exportToPdf: () => Promise<boolean>
  /** 导出为 Excel */
  exportToExcel: () => Promise<boolean>
  /** 导出为图片 */
  exportToImage: () => Promise<boolean>
  /** 升级弹窗状态（供外部控制） */
  upgradeModalOpen: boolean
  setUpgradeModalOpen: (open: boolean) => void
}

// ============================================================
// 常量
// ============================================================

const CONTENT_MAX_LENGTH = 50_000
const FILE_EXT: Record<ExportFormat, string> = {
  docx:  'docx',
  pdf:   'pdf',
  excel: 'xlsx',
  image: 'png',
}

// ============================================================
// 工具函数
// ============================================================

function handleApiError(error: unknown, fallbackMsg: string, onError?: (error: Error) => void): { message: string; code?: string } {
  const err = error as any
  let message = fallbackMsg
  let code: string | undefined

  if (err.response?.data instanceof Blob) {
    try {
      const text = (err.response.data as Blob).text()
      const data = JSON.parse(text)
      message = data.error ?? fallbackMsg
      code = data.code
    } catch { /* 忽略解析失败 */ }
  } else if (err.response?.data?.error) {
    message = err.response.data.error
    code = err.response.data.code
  } else if (err.code === 'ECONNABORTED') {
    message = '请求超时，文档可能过大，请稍后重试'
  }

  toast.error(message)
  onError?.(err)
  return { message, code }
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 文档导出业务 Hook
 * 
 * 职责：
 * - 导出校验（内容非空、长度限制）
 * - 多格式导出（DOCX、PDF、Excel、图片）
 * - 文件下载处理
 */
export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { onSuccess, onError } = options
  const { content, template, exportStatus, setExportStatus } = useEditorStore()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  /** 导出校验 */
  const validate = useCallback((): boolean => {
    if (!content.trim()) {
      toast.error('请先输入或粘贴 Markdown 内容')
      return false
    }
    if (content.length > CONTENT_MAX_LENGTH) {
      toast.error(`内容过长，请控制在 ${CONTENT_MAX_LENGTH / 1000} 万字符以内`)
      return false
    }
    return true
  }, [content])

  /** 执行导出 */
  const exportDoc = useCallback(async (format: ExportFormat): Promise<boolean> => {
    // 防重复点击
    if (exportStatus === 'loading') return false
    // 前置校验
    if (!validate()) return false

    setExportStatus('loading', '导出中，请稍候...')

    try {
      const res = await exportService.export(format, { markdown: content, template })
      const filename = extractFilename(content, FILE_EXT[format])
      downloadBlob(res.blob, filename)
      
      setExportStatus('success', '导出成功')
      toast.success(`已下载：${filename}`, { duration: 1500 })
      onSuccess?.(filename)
      return true
    } catch (error) {
      const { message, code } = handleApiError(error, '导出失败，请重试', onError)
      if (code === 'INSUFFICIENT_BALANCE' || code === 'QUOTA_EXCEEDED') {
        setUpgradeModalOpen(true)
      }
      setExportStatus('error', '导出失败')
      return false
    }
  }, [content, template, exportStatus, validate, setExportStatus, onSuccess, onError])

  // 便捷方法
  const exportToDocx = useCallback(() => exportDoc('docx'), [exportDoc])
  const exportToPdf = useCallback(() => exportDoc('pdf'), [exportDoc])
  const exportToExcel = useCallback(() => exportDoc('excel'), [exportDoc])
  const exportToImage = useCallback(() => exportDoc('image'), [exportDoc])

  return {
    exportDoc,
    exportToDocx,
    exportToPdf,
    exportToExcel,
    exportToImage,
    upgradeModalOpen,
    setUpgradeModalOpen,
  }
}

export default useExport

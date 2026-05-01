'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { exportService, type ExportFormat } from '@/lib/api'
import { useEditorStore } from '@/store/editorStore'
import { useAuthStore } from '@/store/authStore'
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

async function handleApiError(error: unknown, fallbackMsg: string, onError?: (error: Error) => void): Promise<{ message: string; code?: string }> {
  const err = error as any
  let message = fallbackMsg
  let code: string | undefined

  if (err.response?.data instanceof Blob) {
    try {
      const text = await (err.response.data as Blob).text()
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

  const toastMsg = code === 'INSUFFICIENT_BALANCE'
    ? '余额不足，请先充值'
    : code === 'QUOTA_EXCEEDED'
      ? '免费次数已用完，请充值后继续使用'
      : message

  toast.error(toastMsg, { duration: 2000 })
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
  const {
    content,
    currentTemplate,
    templateBinding,
    exportStatus,
    setExportStatus,
    getPreviewTemplateConfig,
  } = useEditorStore()
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
      const previewConfig = getPreviewTemplateConfig()
      const templateId = currentTemplate?.id ?? templateBinding?.templateId

      // 构建有效的模板绑定：
      // 1. 如果有预览配置（模板面板已打开且有草稿），使用预览配置
      // 2. 如果模板绑定有 configSnapshot，直接使用
      // 3. 如果有当前模板但没有快照，使用当前模板配置作为快照
      let effectiveTemplateBinding: typeof templateBinding = templateBinding
      if (previewConfig && templateId) {
        // 模板面板有草稿配置，优先使用
        effectiveTemplateBinding = {
          templateId,
          appliedAt: templateBinding?.appliedAt ?? new Date().toISOString(),
          configSnapshot: previewConfig,
        }
      } else if (templateId && !templateBinding?.configSnapshot && currentTemplate?.config) {
        // 有当前模板但没有快照，使用当前模板配置作为快照
        effectiveTemplateBinding = {
          templateId,
          appliedAt: new Date().toISOString(),
          configSnapshot: currentTemplate.config,
        }
      }

      // 调试日志：显示完整的样式配置
      console.log('[useExport] 导出配置:', {
        templateId,
        previewConfig: previewConfig?.styles,
        effectiveBindingSnapshot: effectiveTemplateBinding?.configSnapshot?.styles,
        heading_1_bold_preview: previewConfig?.styles?.heading_1?.bold,
        heading_1_bold_binding: effectiveTemplateBinding?.configSnapshot?.styles?.heading_1?.bold,
      })

      // 调试：打印完整的 API 请求 payload
      const apiPayload = {
        markdown: content,
        template: templateId,
        templateBinding: effectiveTemplateBinding,
      }
      console.log('[useExport] API 请求 payload:', JSON.stringify(apiPayload, null, 2))

      const res = await exportService.export(format, {
        markdown: content,
        template: templateId,
        templateBinding: effectiveTemplateBinding,
      })
      const filename = extractFilename(content, FILE_EXT[format])
      downloadBlob(res.blob, filename)
      
      // 导出成功后刷新用户信息（更新配额/余额显示）
      useAuthStore.getState().refreshUser()
      
      setExportStatus('success', '导出成功')
      toast.success(`已下载：${filename}`, { duration: 1500 })
      onSuccess?.(filename)
      return true
    } catch (error) {
      const { code } = await handleApiError(error, '导出失败，请重试', onError)
      setExportStatus('error', code === 'INSUFFICIENT_BALANCE' || code === 'QUOTA_EXCEEDED' ? '余额不足' : '导出失败')
      return false
    }
  }, [content, currentTemplate, templateBinding, exportStatus, validate, setExportStatus, getPreviewTemplateConfig, onSuccess, onError])

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

import { api } from './instance'
import type { Template } from '@/store/editorStore'

/**
 * 导出格式类型
 */
export type ExportFormat = 'docx' | 'pdf' | 'excel' | 'image'

/**
 * 导出 API 路径映射
 */
const EXPORT_API_PATH: Record<ExportFormat, string> = {
  docx: '/api/export/docx',
  pdf: '/api/export/pdf',
  excel: '/api/export/excel',
  image: '/api/export/image',
}

/**
 * 导出文件扩展名映射
 */
const EXPORT_FILE_EXT: Record<ExportFormat, string> = {
  docx: 'docx',
  pdf: 'pdf',
  excel: 'xlsx',
  image: 'png',
}

/**
 * 导出请求参数
 */
export interface ExportParams {
  markdown: string
  template?: Template
}

/**
 * 导出响应结果
 */
export interface ExportResponse {
  blob: Blob
  filename: string
}

/**
 * 导出服务 - 处理文档导出为各种格式
 */
export const exportService = {
  /**
   * 导出为 DOCX 格式
   */
  async exportToDocx(params: ExportParams): Promise<ExportResponse> {
    const res = await api.post(EXPORT_API_PATH.docx, params, {
      responseType: 'blob',
    })
    return {
      blob: res.data,
      filename: '',
    }
  },

  /**
   * 导出为 PDF 格式
   */
  async exportToPdf(params: ExportParams): Promise<ExportResponse> {
    const res = await api.post(EXPORT_API_PATH.pdf, params, {
      responseType: 'blob',
    })
    return {
      blob: res.data,
      filename: '',
    }
  },

  /**
   * 导出为 Excel 格式
   */
  async exportToExcel(params: ExportParams): Promise<ExportResponse> {
    const res = await api.post(EXPORT_API_PATH.excel, params, {
      responseType: 'blob',
    })
    return {
      blob: res.data,
      filename: '',
    }
  },

  /**
   * 导出为图片格式
   */
  async exportToImage(params: ExportParams): Promise<ExportResponse> {
    const res = await api.post(EXPORT_API_PATH.image, params, {
      responseType: 'blob',
    })
    return {
      blob: res.data,
      filename: '',
    }
  },

  /**
   * 通用导出方法
   */
  async export(format: ExportFormat, params: ExportParams): Promise<ExportResponse> {
    const res = await api.post(EXPORT_API_PATH[format], params, {
      responseType: 'blob',
    })
    return {
      blob: res.data,
      filename: '',
    }
  },
}

/**
 * 获取导出文件扩展名
 */
export function getExportExtension(format: ExportFormat): string {
  return EXPORT_FILE_EXT[format]
}

export default exportService

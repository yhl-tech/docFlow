import { api } from './instance'
import type {
  FontInfo,
  TemplateBinding,
  TemplateDefinition,
} from '@/types/editor-template'

/**
 * 编辑器增强功能相关类型定义
 */

export type EditorTemplate = TemplateDefinition

// 文档保存状态
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// 文档元数据
export interface DocumentMeta {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  wordCount: number
}

// 图片上传响应
export interface ImageUploadResponse {
  url: string
  width?: number
  height?: number
}

// 公式渲染请求
export interface RenderLatexParams {
  latex: string
  displayMode?: boolean
}

// 公式渲染响应
export interface RenderLatexResponse {
  html: string
  svg?: string
}

// 模板信息
export interface TemplateInfo {
  id: string
  name: string
  description: string
  thumbnail?: string
}

// 文档保存请求
export interface SaveDocumentParams {
  content: string
  title?: string
  template?: string
  templateBinding?: TemplateBinding | null
}

// 文档保存响应
export interface SaveDocumentResponse {
  id: string
  savedAt: string
  wordCount: number
}

// Word 文档解析响应
export interface ParseDocxResponse {
  text: string
  equations: string[]
  filename: string
  /** pandoc：公式与导出 Word 一致；docxlatex：兜底 */
  parse_source?: 'pandoc' | 'docxlatex'
  /** 字符级样式列表（bold/italic/underline/fontFamily），用于在编辑器中重放 Word 样式 */
  style_runs?: WordStyleRun[]
}

// 字符级样式（与后端 docx_to_style_runs 返回结构一致）
export interface WordStyleRun {
  start: number
  end: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  font_family?: string | null
}

/**
 * 编辑器增强服务 - 处理编辑器相关的辅助功能
 */
export const editorService = {
  /**
   * 上传图片到服务器
   */
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData()
    formData.append('image', file)

    const res = await api.post('/api/editor/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },

  /**
   * 上传图片（通过 URL）
   */
  async uploadImageFromUrl(url: string): Promise<ImageUploadResponse> {
    const res = await api.post('/api/editor/upload-image', { url })
    return res.data
  },

  /**
   * 渲染 LaTeX 公式为 HTML
   */
  async renderLatex(params: RenderLatexParams): Promise<RenderLatexResponse> {
    const res = await api.post('/api/editor/render-latex', params)
    return res.data
  },

  /**
   * 验证 LaTeX 公式是否有效
   */
  async validateLatex(latex: string): Promise<{ valid: boolean; error?: string }> {
    const res = await api.post('/api/editor/validate-latex', { latex })
    return res.data
  },

  /**
   * 获取可用模板列表
   */
  async getTemplates(): Promise<TemplateDefinition[]> {
    const res = await api.get('/api/editor/templates')
    return res.data
  },

  async getFonts(): Promise<FontInfo[]> {
    const res = await api.get('/api/editor/fonts')
    return res.data
  },

  async createTemplate(template: TemplateDefinition): Promise<TemplateDefinition> {
    const res = await api.post('/api/editor/templates', template)
    return res.data
  },

  async getTemplateDetail(templateId: string): Promise<TemplateDefinition> {
    const res = await api.get(`/api/editor/templates/${templateId}`)
    return res.data
  },

  async updateTemplate(templateId: string, template: TemplateDefinition): Promise<TemplateDefinition> {
    const res = await api.put(`/api/editor/templates/${templateId}`, template)
    return res.data
  },

  async duplicateTemplate(templateId: string): Promise<TemplateDefinition> {
    const res = await api.post(`/api/editor/templates/${templateId}/duplicate`)
    return res.data
  },

  async deleteTemplate(templateId: string): Promise<void> {
    await api.delete(`/api/editor/templates/${templateId}`)
  },

  async validateTemplate(template: TemplateDefinition): Promise<{ valid: boolean; errors: string[] }> {
    const res = await api.post('/api/editor/templates/validate', { template })
    return res.data
  },

  /**
   * 应用模板
   */
  async applyTemplate(template: string, content: string): Promise<string> {
    const res = await api.post('/api/editor/apply-template', { template, content })
    return res.data.content
  },

  /**
   * 保存文档
   */
  async saveDocument(params: SaveDocumentParams): Promise<SaveDocumentResponse> {
    const res = await api.post('/api/editor/save', params)
    return res.data
  },

  async saveDocumentTemplateBinding(documentId: string, templateBinding: TemplateBinding): Promise<{ ok: boolean }> {
    const res = await api.put(`/api/editor/document/${documentId}/template-binding`, {
      templateBinding,
    })
    return res.data
  },

  /**
   * 加载文档
   */
  async loadDocument(id: string): Promise<{ content: string; meta: DocumentMeta; templateBinding?: TemplateBinding | null }> {
    const res = await api.get(`/api/editor/document/${id}`)
    return res.data
  },

  /**
   * 获取文档列表
   */
  async listDocuments(): Promise<DocumentMeta[]> {
    const res = await api.get('/api/editor/documents')
    return res.data
  },

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/api/editor/document/${id}`)
  },

  /**
   * 生成文档目录（TOC）
   */
  async generateToc(content: string): Promise<{ level: number; text: string; anchor: string }[]> {
    const res = await api.post('/api/editor/generate-toc', { content })
    return res.data
  },

  /**
   * 解析 Word (.docx) 文档，提取文本和数学公式
   */
  async parseDocx(file: File): Promise<ParseDocxResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/api/editor/parse-docx', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },

  /**
   * 解析 Word (.docx) 文档，保留原始样式返回 HTML
   */
  async parseDocxHtml(file: File): Promise<{ html: string; filename: string; parse_source: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/api/editor/parse-docx-html', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },
}

export default editorService

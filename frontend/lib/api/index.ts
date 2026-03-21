/**
 * API 模块统一导出入口
 *
 * 按功能模块划分的 API 服务：
 * - instance: API 实例配置（axios 实例、拦截器）
 * - export: 文档导出服务（DOCX、PDF、Excel、图片）
 * - ai: AI 对话服务（聊天、润色、翻译）
 * - editor: 编辑器增强服务（图片上传、公式渲染、文档管理）
 *
 * 使用示例：
 * ```ts
 * import { aiService, exportService, editorService } from '@/lib/api'
 *
 * // AI 对话
 * const response = await aiService.chat({ message: '你好' })
 *
 * // 导出文档
 * await exportService.exportToDocx({ markdown: '# Hello' })
 *
 * // 编辑器增强
 * const url = await editorService.uploadImage(file)
 * ```
 */

export { api, createApi } from './instance'

// 导出服务
export { default as aiService, default } from './ai'
export { default as exportService } from './export'
export { default as editorService } from './editor'
export { default as authService } from './auth'
export { default as paymentService } from './payment'

// 导出类型
export type {
  AIModel,
  RewriteType,
  ExpandSubType,
  ToneSubType,
  TranslateSubType,
  ChatRole,
  ChatMessage,
  ChatParams,
  ChatResponse,
  RewriteParams,
  RewriteResponse,
} from './ai'

export type {
  ExportFormat,
  ExportParams,
  ExportResponse,
} from './export'

export type {
  EditorTemplate,
  SaveStatus,
  DocumentMeta,
  ImageUploadResponse,
  RenderLatexParams,
  RenderLatexResponse,
  TemplateInfo,
  SaveDocumentParams,
  SaveDocumentResponse,
} from './editor'

export type { UserInfo } from './auth'
export type { PlanType, PayChannel } from './payment'

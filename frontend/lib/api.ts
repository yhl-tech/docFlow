/**
 * API 入口文件（向后兼容）
 *
 * @deprecated 请使用 @/lib/api/index.ts 中的模块化导出
 * import { api, aiService, exportService, editorService } from '@/lib/api'
 *
 * 此文件仅用于向后兼容，保持现有代码无需修改
 */

export { api, createApi } from './api/instance'

// 导出服务（兼容旧用法）
export { default as aiService } from './api/ai'
export { default as exportService } from './api/export'
export { default as editorService } from './api/editor'

// 重新导出类型
export type { ExportFormat, ExportParams, ExportResponse } from './api/export'
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
} from './api/ai'
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
  ParseDocxResponse,
} from './api/editor'

// 默认导出（兼容旧代码 import api from '@/lib/api'）
export { default } from './api/instance'

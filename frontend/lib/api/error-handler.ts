/**
 * 统一错误解析
 */
export interface ApiErrorDetail {
  error: string
  code: string
  suggestion?: string
  request_id?: string
}

/**
 * 解析 API 错误
 */
export function parseApiError(error: unknown): ApiErrorDetail {
  const err = error as any

  // 处理 axios 错误
  if (err.response) {
    // Blob 响应需要特殊处理
    if (err.response.data instanceof Blob) {
      return {
        error: '文件解析失败',
        code: 'UNKNOWN',
      }
    }

    const data = err.response.data
    if (data?.error) {
      return {
        error: data.error,
        code: data.code || 'UNKNOWN',
        suggestion: data.suggestion,
        request_id: data.request_id,
      }
    }

    // HTTP 状态码处理
    switch (err.response.status) {
      case 401:
        return { error: '请先登录', code: 'UNAUTHORIZED' }
      case 403:
        return { error: '没有权限', code: 'FORBIDDEN' }
      case 404:
        return { error: '资源不存在', code: 'NOT_FOUND' }
      case 422:
        return { error: data?.detail || '请求参数错误', code: 'VALIDATION_ERROR' }
      case 429:
        return { error: '请求过于频繁，请稍后重试', code: 'RATE_LIMITED' }
      case 500:
        return { error: '服务器内部错误', code: 'INTERNAL_ERROR' }
    }
  }

  // 网络错误
  if (err.code === 'ECONNABORTED') {
    return {
      error: '请求超时，请稍后重试',
      code: 'TIMEOUT',
      suggestion: '文档可能过大，建议减少内容或稍后重试',
    }
  }

  if (!navigator.onLine) {
    return { error: '网络连接已断开', code: 'OFFLINE' }
  }

  return {
    error: err.message || '未知错误',
    code: err.code || 'UNKNOWN',
  }
}

/**
 * 根据错误码获取友好的 toast 消息
 */
export function getErrorToastMessage(error: ApiErrorDetail): string {
  const messages: Record<string, string> = {
    // 导出相关
    PANDOC_NOT_FOUND: 'Word 导出暂时不可用',
    PDF_ENGINE_NOT_AVAILABLE: 'PDF 导出暂时不可用',
    EXPORT_TIMEOUT: '导出超时，请稍后重试',

    // 计费相关
    INSUFFICIENT_BALANCE: '余额不足，请先充值',
    QUOTA_EXCEEDED: '免费次数已用完，请充值后继续使用',

    // 模板相关
    TEMPLATE_VALIDATION_ERROR: '模板配置无效',
    TEMPLATE_NOT_FOUND: '模板不存在',

    // 内容相关
    CONTENT_TOO_LARGE: '内容超长，请控制在 50000 字符以内',

    // 认证相关
    UNAUTHORIZED: '请先登录',
    FORBIDDEN: '没有权限执行此操作',

    // 网络相关
    TIMEOUT: '请求超时，请检查网络',
    OFFLINE: '网络连接已断开',

    // 其他
    NOT_FOUND: '资源不存在',
    RATE_LIMITED: '请求过于频繁，请稍后重试',
    VALIDATION_ERROR: error.error,
    INTERNAL_ERROR: '服务器内部错误',
  }

  return messages[error.code] || error.error
}

/**
 * 判断是否为业务错误（非网络/系统错误）
 */
export function isBusinessError(error: ApiErrorDetail): boolean {
  const businessCodes = [
    'PANDOC_NOT_FOUND',
    'PDF_ENGINE_NOT_AVAILABLE',
    'EXPORT_TIMEOUT',
    'INSUFFICIENT_BALANCE',
    'QUOTA_EXCEEDED',
    'TEMPLATE_VALIDATION_ERROR',
    'TEMPLATE_NOT_FOUND',
    'CONTENT_TOO_LARGE',
    'VALIDATION_ERROR',
  ]
  return businessCodes.includes(error.code)
}

/**
 * 获取错误建议
 */
export function getErrorSuggestion(error: ApiErrorDetail): string | null {
  if (error.suggestion) return error.suggestion

  const suggestions: Record<string, string> = {
    PANDOC_NOT_FOUND: '请联系管理员安装 Pandoc',
    PDF_ENGINE_NOT_AVAILABLE: '请联系管理员检查 PDF 转换工具',
    EXPORT_TIMEOUT: '建议减少文档内容或分批导出',
    INSUFFICIENT_BALANCE: '前往充值页面',
    QUOTA_EXCEEDED: '前往充值页面',
    CONTENT_TOO_LARGE: '请将内容控制在 50000 字符以内',
  }

  return suggestions[error.code] || null
}

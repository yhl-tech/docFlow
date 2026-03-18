import { api } from './instance'

/**
 * AI 对话相关类型定义
 */

// 可用的 AI 模型
export type AIModel = 'deepseek-v3' | 'deepseek-r1' | 'qwen-turbo' | 'qwen-plus' | 'qwen-max' | 'kimi' | 'custom'

// 文本润色类型
export type RewriteType = '改写' | '扩写' | '缩写' | '润色'

// 扩写子类型
export type ExpandSubType = '简单扩写' | '丰富细节' | '增加论据'

// 语气调整子类型
export type ToneSubType = '向上汇报' | '向下传达' | '对外宣传' | '口语化'

// 翻译子类型
export type TranslateSubType = '中译英' | '英译中' | '中译日'

// 聊天消息角色
export type ChatRole = 'user' | 'assistant' | 'system'

// 聊天消息
export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp?: number
}

// AI 对话请求参数
export interface ChatParams {
  message: string
  model?: AIModel
  history?: ChatMessage[]
  enable思考?: boolean
  enable指令?: boolean
}

// AI 对话响应
export interface ChatResponse {
  content: string
  model: AIModel
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// 文本润色请求参数
export interface RewriteParams {
  text: string
  type: RewriteType
  expandSubType?: ExpandSubType
  toneSubType?: ToneSubType
  translateSubType?: TranslateSubType
}

// 文本润色响应
export interface RewriteResponse {
  result: string
  originalLength: number
  resultLength: number
}

/**
 * AI 对话服务 - 处理 AI 聊天和文本润色功能
 */
export const aiService = {
  /**
   * 通用 AI 对话
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const res = await api.post('/api/ai/chat', params)
    return res.data
  },

  /**
   * 流式 AI 对话（用于实时对话场景）
   */
  async *chatStream(params: ChatParams) {
    const baseURL = process.env.NODE_ENV === 'production'
      ? '/docFlow'
      : (process.env.NEXT_PUBLIC_API_URL_DEV ?? 'http://localhost:8000')
    const response = await fetch(`${baseURL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok || !response.body) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 按行分割，处理 SSE 格式
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6) // 去掉 "data: " 前缀

          // 检查是否是 [DONE] 消息
          if (data === '[DONE]') {
            return
          }

          try {
            const json = JSON.parse(data)
            // 提取 delta.content
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch {
            // 解析失败，忽略该行
          }
        }
      }
    }
  },

  /**
   * 文本润色 - 改写、扩写、缩写、润色
   */
  async rewrite(params: RewriteParams): Promise<RewriteResponse> {
    const res = await api.post('/api/ai/rewrite', params)
    return res.data
  },

  /**
   * 扩写（带子类型）
   */
  async expand(text: string, subType: ExpandSubType): Promise<RewriteResponse> {
    return this.rewrite({ text, type: '扩写', expandSubType: subType })
  },

  /**
   * 改变语气
   */
  async changeTone(text: string, subType: ToneSubType): Promise<RewriteResponse> {
    return this.rewrite({ text, type: '改写', toneSubType: subType })
  },

  /**
   * 翻译
   */
  async translate(text: string, subType: TranslateSubType): Promise<RewriteResponse> {
    return this.rewrite({ text, type: '改写', translateSubType: subType })
  },

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<AIModel[]> {
    const res = await api.get('/api/ai/models')
    return res.data
  },
}

export default aiService

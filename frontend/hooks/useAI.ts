'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { aiService, type AIModel, type ChatMessage } from '@/lib/api'

// ============================================================
// 类型定义
// ============================================================

export interface UseAIOptions {
  /** 默认模型 */
  defaultModel?: AIModel
  /** 成功回调 */
  onSuccess?: (content: string) => void
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 流式输出回调（每收到一个 chunk 调用） */
  onStreamChunk?: (chunk: string, accumulated: string) => void
  /** 流式输出完成回调 */
  onStreamDone?: (fullContent: string) => void
}

export interface UseAIState {
  /** 加载中 */
  isLoading: boolean
  /** 消息列表 */
  messages: ChatMessage[]
  /** 当前模型 */
  currentModel: AIModel
  /** 当前流式输出内容 */
  streamingContent: string
}

export interface UseAIActions {
  /** 发送消息（非流式） */
  sendMessage: (message: string, options?: { enable思考?: boolean; enable指令?: boolean }) => Promise<string | null>
  /** 发送消息（流式） */
  sendMessageStream: (message: string, options?: { enable思考?: boolean; enable指令?: boolean }) => Promise<string | null>
  /** 文本润色 */
  rewriteText: (text: string, type: '改写' | '扩写' | '缩写' | '润色', subOption?: string) => Promise<string | null>
  /** 翻译 */
  translateText: (text: string, direction: '中译英' | '英译中' | '中译日') => Promise<string | null>
  /** 改变语气 */
  changeTone: (text: string, tone: '向上汇报' | '向下传达' | '对外宣传' | '口语化') => Promise<string | null>
  /** 扩写 */
  expandText: (text: string, type: '简单扩写' | '丰富细节' | '增加论据') => Promise<string | null>
  /** 清空历史 */
  clearHistory: () => void
  /** 切换模型 */
  setModel: (model: AIModel) => void
}

export type UseAIReturn = UseAIState & UseAIActions

// ============================================================
// 工具函数
// ============================================================

function handleApiError(error: unknown, fallbackMsg: string, onError?: (error: Error) => void): string {
  const err = error as { response?: { data?: { error?: string } }; message?: string }
  const message = err.response?.data?.error ?? err.message ?? fallbackMsg
  toast.error(message)
  onError?.(error as Error)
  return message
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * AI 对话业务 Hook
 * 
 * 职责：
 * - AI 聊天（非流式/流式）
 * - 文本润色、翻译、语气调整
 * - 会话历史管理
 * - 模型切换
 */
export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const { defaultModel = 'deepseek-v3', onSuccess, onError, onStreamChunk, onStreamDone } = options

  // ------------------- 状态 -------------------
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState<AIModel>(defaultModel)
  const [streamingContent, setStreamingContent] = useState('')

  // ------------------- Refs -------------------
  const messagesRef = useRef<ChatMessage[]>([])
  // 保持 messagesRef 最新
  useState(() => {
    messagesRef.current = messages
  })

  // ------------------- 发送消息（非流式） -------------------

  const sendMessage = useCallback(async (
    message: string,
    options?: { enable思考?: boolean; enable指令?: boolean }
  ): Promise<string | null> => {
    setIsLoading(true)

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    messagesRef.current = [...messagesRef.current, userMsg]
    setMessages(messagesRef.current)

    try {
      const response = await aiService.chat({
        message,
        model: currentModel,
        history: messagesRef.current,
        ...options,
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      }
      messagesRef.current = [...messagesRef.current, assistantMsg]
      setMessages(messagesRef.current)

      onSuccess?.(response.content)
      return response.content
    } catch {
      handleApiError(new Error('AI 响应失败'), 'AI 响应失败', onError)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [currentModel, onSuccess, onError])

  // ------------------- 发送消息（流式） -------------------

  const sendMessageStream = useCallback(async (
    message: string,
    options?: { enable思考?: boolean; enable指令?: boolean }
  ): Promise<string | null> => {
    setIsLoading(true)
    setStreamingContent('')

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    messagesRef.current = [...messagesRef.current, userMsg]
    setMessages([...messagesRef.current])

    let fullContent = ''

    try {
      for await (const chunk of aiService.chatStream({
        message,
        model: currentModel,
        history: messagesRef.current.filter(m => m.role !== 'system'),
        ...options,
      })) {
        fullContent += chunk
        setStreamingContent(fullContent)
        onStreamChunk?.(chunk, fullContent)
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      }
      messagesRef.current = [...messagesRef.current, assistantMsg]
      setMessages([...messagesRef.current])

      setStreamingContent('')
      onStreamDone?.(fullContent)
      onSuccess?.(fullContent)
      return fullContent
    } catch {
      handleApiError(new Error('AI 响应失败'), 'AI 响应失败', onError)
      setStreamingContent('')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [currentModel, onSuccess, onError, onStreamChunk, onStreamDone])

  // ------------------- 文本润色 -------------------

  const rewriteText = useCallback(async (
    text: string,
    type: '改写' | '扩写' | '缩写' | '润色',
    subOption?: string
  ): Promise<string | null> => {
    setIsLoading(true)
    try {
      const response = await aiService.rewrite({
        text,
        type: type as import('@/lib/api').RewriteType,
        ...((type === '扩写' && subOption) ? { expandSubType: subOption } : {}),
        ...((type === '改写' && subOption) ? (
          ['向上汇报', '向下传达', '对外宣传', '口语化'].includes(subOption)
            ? { toneSubType: subOption }
            : ['中译英', '英译中', '中译日'].includes(subOption)
              ? { translateSubType: subOption }
              : {}
        ) : {}),
      } as any)
      onSuccess?.(response.result)
      return response.result
    } catch {
      handleApiError(new Error('润色失败'), '润色失败', onError)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])

  const translateText = useCallback(async (
    text: string,
    direction: '中译英' | '英译中' | '中译日'
  ): Promise<string | null> => {
    return rewriteText(text, '改写', direction)
  }, [rewriteText])

  const changeTone = useCallback(async (
    text: string,
    tone: '向上汇报' | '向下传达' | '对外宣传' | '口语化'
  ): Promise<string | null> => {
    return rewriteText(text, '改写', tone)
  }, [rewriteText])

  const expandText = useCallback(async (
    text: string,
    type: '简单扩写' | '丰富细节' | '增加论据'
  ): Promise<string | null> => {
    return rewriteText(text, '扩写', type)
  }, [rewriteText])

  // ------------------- 其他 -------------------

  const clearHistory = useCallback(() => {
    messagesRef.current = []
    setMessages([])
  }, [])

  const setModel = useCallback((model: AIModel) => {
    setCurrentModel(model)
  }, [])

  return {
    // 状态
    isLoading,
    messages,
    currentModel,
    streamingContent,
    // 操作
    sendMessage,
    sendMessageStream,
    rewriteText,
    translateText,
    changeTone,
    expandText,
    clearHistory,
    setModel,
  }
}

export default useAI

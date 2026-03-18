import { create } from 'zustand'
import type { AIModel } from '@/lib/api'

// ============================================================
// 类型定义
// ============================================================

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface AIState {
  // 对话相关
  messages: AIMessage[]
  currentModel: AIModel
  isStreaming: boolean
  streamingContent: string
  
  // 编辑器相关（AI 内容输出到编辑器）
  pendingEditorContent: string | null
  
  // 设置
  enable思考: boolean
  enable指令: boolean
  
  // Actions
  addMessage: (message: AIMessage) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void
  setModel: (model: AIModel) => void
  setStreaming: (streaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
  finishStreaming: () => void
  setPendingEditorContent: (content: string | null) => void
  consumePendingContent: () => string | null
  toggle思考: () => void
  toggle指令: () => void
}

// ============================================================
// Store 实现
// ============================================================

export const useAIStore = create<AIState>((set, get) => ({
  // 初始状态
  messages: [],
  currentModel: 'qwen-turbo',
  isStreaming: false,
  streamingContent: '',
  pendingEditorContent: null,
  enable思考: false,
  enable指令: false,

  // 添加消息
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  // 更新最后一条消息
  updateLastMessage: (content) => set((state) => {
    if (state.messages.length === 0) return state
    const messages = [...state.messages]
    messages[messages.length - 1] = {
      ...messages[messages.length - 1],
      content,
    }
    return { messages }
  }),

  // 清空消息
  clearMessages: () => set({
    messages: [],
    streamingContent: '',
    isStreaming: false,
    pendingEditorContent: null,
  }),

  // 切换模型
  setModel: (model) => set({ currentModel: model }),

  // 设置流式状态
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  // 设置流式内容
  setStreamingContent: (content) => set({ streamingContent: content }),

  // 追加流式内容
  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk
  })),

  // 完成流式输出
  finishStreaming: () => {
    const state = get()
    if (state.streamingContent) {
      // 将流式内容作为最后一条消息
      const lastMessage = state.messages[state.messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        // 更新最后一条消息
        set((s) => ({
          messages: s.messages.map((m, i) => 
            i === s.messages.length - 1 
              ? { ...m, content: s.streamingContent }
              : m
          ),
          streamingContent: '',
          isStreaming: false,
        }))
      } else {
        // 添加助手消息
        set((s) => ({
          messages: [...s.messages, {
            role: 'assistant',
            content: s.streamingContent,
            timestamp: Date.now(),
          }],
          streamingContent: '',
          isStreaming: false,
        }))
      }
    } else {
      set({ isStreaming: false })
    }
  },

  // 设置待写入编辑器的内容
  setPendingEditorContent: (content) => set({ pendingEditorContent: content }),

  // 消费待写入编辑器的内容（消费后清空）
  consumePendingContent: () => {
    const content = get().pendingEditorContent
    set({ pendingEditorContent: null })
    return content
  },

  // 切换思考
  toggle思考: () => set((state) => ({ enable思考: !state.enable思考 })),

  // 切换指令
  toggle指令: () => set((state) => ({ enable指令: !state.enable指令 })),
}))

// ============================================================
// 工具函数
// ============================================================

/** AI 模型选项 */
export const AI_MODELS: { value: AIModel; label: string }[] = [
  { value: 'qwen-turbo', label: 'Qwen Turbo' },
  // { value: 'qwen-plus', label: 'Qwen Plus' },
  // { value: 'qwen-max', label: 'Qwen Max' },
  // { value: 'deepseek-v3', label: 'DeepSeek V3' },
  // { value: 'deepseek-r1', label: 'DeepSeek R1' },
]

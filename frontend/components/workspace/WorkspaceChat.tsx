'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Send, Brain, Copy, Check, FileEdit, Upload, Loader2, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import { aiService, editorService, type AIModel, type ChatMessage } from '@/lib/api'
import { useAIStore, AI_MODELS } from '@/store/aiStore'
import { useEditorStore } from '@/store/editorStore'


// ============================================================
// 类型定义
// ============================================================

interface QuickAction {
  icon: string
  title: string
  desc: string
  action?: () => void
}

interface ResizablePanelProps {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  children: React.ReactNode
}

// 解析思考内容的辅助函数
function parseThinkingContent(content: string): { thinking: string | null; answer: string } {
  // 匹配 <thinking>...</thinking> 标签
  const thinkingRegex = new RegExp('<thinking>([\\s\\S]*?)</thinking>')
  const thinkingMatch = content.match(thinkingRegex)
  if (thinkingMatch) {
    const thinking = thinkingMatch[1].trim()
    const answer = content.replace(thinkingRegex, '').trim()
    return { thinking, answer }
  }

  // 匹配<think>...</think> 标签
  const thinkRegex = new RegExp('<think>([\\s\\S]*?)</think>')
  const thinkMatch = content.match(thinkRegex)
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim()
    const answer = content.replace(thinkRegex, '').trim()
    return { thinking, answer }
  }

  return { thinking: null, answer: content }
}

// ============================================================
// 常量
// ============================================================

const QUICK_ACTIONS: QuickAction[] = [
  { icon: '📋', title: '粘贴 AI 内容', desc: '粘贴 DeepSeek / 豆包 / Kimi 等 AI 内容' },
  { icon: '📁', title: '上传文件润色', desc: '上传 Word  润色 / 提取' },
]

// ============================================================
// 可调整宽度的面板组件
// ============================================================

function ResizablePanel({
  minWidth = 320,
  maxWidth = 600,
  defaultWidth = 400,
  children,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minWidth, maxWidth])

  return (
    <div
      ref={containerRef}
      style={{ width }}
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
      {/* 拖拽分隔线 - 增加透明点击区域 */}
      <div
        role="separator"
        aria-orientation="vertical"
        className="absolute -right-2 top-0 z-20 h-full w-5 cursor-col-resize select-none"
        onMouseDown={handleMouseDown}
      >
        <div
          className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 select-none bg-slate-200 transition-colors ${
            isDragging ? 'bg-slate-500' : 'hover:bg-slate-400'
          }`}
        />
      </div>
    </div>
  )
}

// ============================================================
// 组件
// ============================================================

export function WorkspaceChat() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showModelSelect, setShowModelSelect] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  // 记录每条消息的思考过程展开状态
  const [thinkingExpanded, setThinkingExpanded] = useState<Record<number, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  /** 对话列表滚动容器，仅在此容器内滚动，避免 scrollIntoView 触发整页滚动 */
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // 全局状态
  const {
    messages,
    currentModel,
    isStreaming,
    streamingContent,
    enable思考,
    setModel,
    toggle思考,
    addMessage,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    finishStreaming,
    clearMessages,
  } = useAIStore()

  const { setContent, setPendingWordStyles } = useEditorStore()

  // 自动滚动到底部（仅滚动对话列表容器，不触发整页滚动）
  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streamingContent])

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setStreaming(true)

    // 添加用户消息
    addMessage({ role: 'user', content: userMessage, timestamp: Date.now() })

    let fullContent = ''

    try {
      for await (const chunk of aiService.chatStream({
        message: userMessage,
        model: currentModel,
        history: messages as ChatMessage[],
        enable思考,
      })) {
        fullContent += chunk
        appendStreamingContent(chunk)
      }

      finishStreaming()

      // 将内容写入编辑器（延迟执行避免 flushSync 警告）
      queueMicrotask(() => setContent(fullContent))
      toast.success('已写入编辑器')
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'AI 响应失败')
    } finally {
      setIsLoading(false)
      setStreaming(false)
    }
  }, [input, isLoading, currentModel, messages, enable思考, addMessage, setStreaming, appendStreamingContent, finishStreaming, setContent])

  // 快捷操作
  const handleQuickAction = (action: QuickAction) => {
    if (action.action) {
      action.action()
    }
  }

  // 文件上传处理
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型（只支持 docx）
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 Word(.docx) 文件')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('正在解析文档...')

    try {
      // 调用后端 API 解析 Word 文档（包括公式和字符级样式）
      const result = await editorService.parseDocx(file)

      // 合并状态更新：同时设置内容和 Word 样式，确保它们在同一次渲染中更新
      // 避免竞争条件：setContent 和 setPendingWordStyles 分散调用可能导致应用时机不一致
      useEditorStore.setState({
        content: result.text,
        pendingWordStyles: result.style_runs?.length ? result.style_runs : null,
      })

      toast.success('文档已导入编辑器', { id: toastId })

      // 添加系统消息提示用户
      addMessage({
        role: 'user',
        content: `📄 已上传文件：${file.name}`,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('文件解析失败:', error)
      toast.error('文件解析失败，请重试', { id: toastId })
    } finally {
      setIsUploading(false)
      // 清空 input 以便再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [setContent, setPendingWordStyles, addMessage])

  // 触发文件选择
  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  // 复制消息
  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // 插入编辑器
  const insertToEditor = (content: string) => {
    queueMicrotask(() => setContent(content))
    toast.success('已写入编辑器')
  }

  // 清空对话
  const handleClear = () => {
    clearMessages()
    toast.info('对话已清空')
  }

  // 回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <ResizablePanel minWidth={400} maxWidth={800} defaultWidth={520}>
      <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-slate-100 bg-white">
        {/* 顶部标题栏 - 不参与滚动 */}
        <div className="flex min-h-0 items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-medium text-sm tracking-wide text-slate-600">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            AI 对话
          </h2>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              清空对话
            </button>
          )}
        </div>

        {/* 消息列表区域 - 仅此区域可滚动，输入框固定底部 */}
        <div ref={chatScrollRef} className="chat-scroll min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
          {messages.length === 0 && !streamingContent ? (
            /* 欢迎区域 - 极简白 */
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <span className="text-sm font-semibold tracking-tight">DF</span>
              </div>
              <h1 className="mb-1 text-lg font-medium tracking-tight text-slate-800">文流 DocFlow</h1>
              <p className="mb-10 text-[13px] text-slate-400">晚上好，准备开始创作什么文档？</p>

              {/* 快捷操作 - 极简线条 */}
              <div className="grid w-full max-w-sm grid-cols-1 gap-2 px-2">
                {QUICK_ACTIONS.map((a, index) => (
                  <button
                    key={a.title}
                    onClick={index === 1 ? triggerFileUpload : () => handleQuickAction(a)}
                    disabled={index === 1 && isUploading}
                    className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white py-2.5 pl-3 pr-4 text-left transition-all hover:border-slate-200 hover:bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {index === 1 && isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <span className="text-base opacity-70 group-hover:opacity-100">{a.icon}</span>
                    )}
                    <p className="text-[13px] font-medium text-slate-600 group-hover:text-slate-800">
                      {index === 1 && isUploading ? '正在解析...' : a.desc}
                    </p>
                  </button>
                ))}
                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            /* 消息列表 */
            <div className="space-y-3">
              {messages.map((msg, index) => {
                // 解析思考内容
                const { thinking, answer } = parseThinkingContent(msg.content)
                const hasThinking = !!thinking
                const isExpanded = thinkingExpanded[index] ?? false

                return (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-100 bg-white text-slate-700'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="chat-prose prose-sm max-w-none text-slate-700">
                        {/* 思考过程 - 折叠显示 */}
                        {hasThinking && (
                          <div className="mb-3 rounded-lg bg-amber-50 border border-amber-100 overflow-hidden">
                            <button
                              onClick={() => setThinkingExpanded(prev => ({ ...prev, [index]: !prev[index] }))}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-amber-700 hover:bg-amber-100/50 transition-colors"
                            >
                              <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="font-medium">AI 思考过程</span>
                              {isExpanded ? (
                                <ChevronDown className="ml-auto h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="ml-auto h-3.5 w-3.5" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3">
                                <div className="whitespace-pre-wrap text-xs text-amber-600/80 font-mono leading-relaxed">
                                  {thinking}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* 最终答案 */}
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeHighlight, rehypeKatex]}>
                          {answer || msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm">{msg.content}</div>
                    )}
                    {msg.role === 'assistant' && (
                      <div className="mt-2 flex items-center gap-3 border-t border-slate-50 pt-2">
                        <button
                          onClick={() => copyMessage(msg.content, index)}
                          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-700"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3 w-3" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              复制
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => insertToEditor(msg.content)}
                          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-700"
                        >
                          <FileEdit className="h-3 w-3" />
                          插入编辑器
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )})}

              {/* 流式输出 */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-xl border border-slate-100 bg-white px-4 py-2.5">
                    <div className="chat-prose prose-sm max-w-none text-slate-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeHighlight, rehypeKatex]}>
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 底部输入区 - 固定底部，不参与滚动 */}
        <div className="min-h-0 border-t border-slate-100 bg-white px-4 py-3">
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white focus-within:border-slate-200 focus-within:shadow-sm">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入指令（如：写一份年终总结）"
              className="w-full resize-none bg-transparent px-4 pb-2 pt-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between border-t border-slate-50 px-4 py-3">
              {/* 左侧功能按钮 */}
              <div className="flex items-center gap-2">
                {/* 模型选择 */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelSelect(!showModelSelect)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50"
                  >
                    {AI_MODELS.find(m => m.value === currentModel)?.label || 'DeepSeek V3'}
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                  {showModelSelect && (
                    <div className="absolute bottom-full left-0 z-10 mb-2 min-w-[140px] rounded-lg border border-slate-100 bg-white py-1 shadow-xl shadow-slate-200/50">
                      {AI_MODELS.map((model) => (
                        <button
                          key={model.value}
                          onClick={() => {
                            setModel(model.value)
                            setShowModelSelect(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                            currentModel === model.value ? 'font-medium text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {model.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 思考模式 */}
                <button
                  onClick={toggle思考}
                  className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    enable思考
                      ? 'border-slate-300 bg-slate-100 text-slate-700'
                      : 'border-slate-100 bg-slate-50/80 text-slate-500 hover:border-slate-200 hover:text-slate-700'
                  }`}
                >
                  <Brain className="h-3.5 w-3.5" />
                  思考
                </button>

              </div>

              {/* 发送按钮 */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </ResizablePanel>
  )
}

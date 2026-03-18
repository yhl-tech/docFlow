'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import { toast } from 'sonner'
import { Minimize2 } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { aiService } from '@/lib/api'
import { KaTeXNode } from './extensions/KaTeXNode'
import { FloatingAIToolbar } from './FloatingAIToolbar'

/**
 * 将各种 AI 输出的非标准公式定界符统一转为 $$...$$
 * 在 DOM paste 拦截层调用，确保 tiptap-markdown 始终拿到规范的 Markdown
 */
function preprocessMath(text: string): string {
  // 统一换行符（Windows 剪贴板可能是 CRLF）
  let s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // 1. 豆包 / 标准 LaTeX 多行 \[...\]  →  $$...$$
  s = s.replace(/\\\[\n([\s\S]*?)\n\\\]/g, (_, c) => `$$\n${c}\n$$`)
  // 2. DeepSeek 风格：[ 独占一行 ... ] 独占一行  →  $$...$$
  s = s.replace(/(^|\n)\[\n([\s\S]*?)\n\](\n|$)/g, (_, pre, c, post) => `${pre}$$\n${c}\n$$${post}`)
  // 3. 单行 \[...\]  →  $$...$$
  s = s.replace(/\\\[([^\n]*?)\\\]/g, (_, c) => `$$${c}$$`)
  // 4. \(...\) 行内公式  →  $...$
  s = s.replace(/\\\(([^\n]*?)\\\)/g, (_, c) => `$${c}$`)
  return s
}

interface TipTapEditorProps {
  /** 编辑器实例就绪时回调，供工具栏拿到 Editor 实例 */
  onReady?: (editor: Editor) => void
  /** 点击公式节点时回调，用于打开编辑弹窗 */
  onEditFormula?: (latex: string, displayMode: boolean, pos: number) => void
}

export function TipTapEditor({ onReady, onEditFormula }: TipTapEditorProps) {
  const { content, setContent, isFullscreen, setFullscreen } = useEditorStore()
  const [isRewriting, setIsRewriting] = useState(false)
  // 防止外部更新 content 时触发死循环
  const skipUpdate = useRef(false)
  // 用 ref 稳定持有回调，避免 useEditor extensions 重新初始化
  const onEditFormulaRef = useRef(onEditFormula)
  useEffect(() => { onEditFormulaRef.current = onEditFormula }, [onEditFormula])
  const stableEditCallback = useCallback(
    (latex: string, displayMode: boolean, pos: number) => {
      onEditFormulaRef.current?.(latex, displayMode, pos)
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // 编辑器引用，供 handleAIAction 访问最新实例
  const editorRef = useRef<Editor | null>(null)

  const handleAIAction = useCallback(async (action: string, option?: string) => {
    const editor = editorRef.current
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    if (!selectedText.trim()) return

    const params: Parameters<typeof aiService.rewrite>[0] = {
      text: selectedText,
      type: action as any,
      ...(action === '扩写' && option ? { expandSubType: option as any } : {}),
      ...(action === '改变语气' && option ? { toneSubType: option as any } : {}),
      ...(action === '翻译' && option ? { translateSubType: option as any } : {}),
    }

    setIsRewriting(true)
    const toastId = toast.loading(`${action}中…`)
    try {
      const res = await aiService.rewrite(params)
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, res.result).run()
      toast.success('已替换选中内容', { id: toastId })
    } catch {
      toast.error('AI 处理失败，请重试', { id: toastId })
    } finally {
      setIsRewriting(false)
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // 关闭 StarterKit 内置的 heading，保留默认配置（支持 H1-H6）
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Placeholder.configure({
        placeholder: '',
      }),
      Markdown.configure({
        html: false,              // 不允许 HTML 输入（安全）
        transformPastedText: true, // 粘贴 Markdown 时自动转为富文本
        transformCopiedText: false,
      }),
      // KaTeX 公式扩展 - 支持在编辑器中实时渲染 LaTeX 公式
      KaTeXNode.configure({
        inline: true,
        onEditFormula: stableEditCallback,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none',
      },
    },
    onUpdate({ editor }) {
      if (skipUpdate.current) return
      const md = (editor.storage as any).markdown.getMarkdown()
      setContent(md)
    },
    onCreate({ editor }) {
      // 初始化时从 store 加载内容
      if (content) {
        skipUpdate.current = true
        editor.commands.setContent(content)
        skipUpdate.current = false
      }
      editorRef.current = editor
      onReady?.(editor)
    },
  })

  // 同步 editorRef，确保 handleAIAction 始终持有最新实例
  useEffect(() => {
    if (editor) editorRef.current = editor
  }, [editor])

  // 响应外部 content 变化（如 AI 对话填入内容）
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = (editor.storage as any).markdown.getMarkdown()
    if (current !== content) {
      skipUpdate.current = true
      editor.commands.setContent(content)
      skipUpdate.current = false
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // 拦截粘贴事件：把非标准公式定界符（\[...\]、[...]等）预处理为 $$...$$
  // 在 capture 阶段运行，早于 tiptap-markdown 的粘贴插件。
  // 构造只含 text/plain 的合成事件，防止 tiptap-markdown 优先消费 text/html
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    let handling = false

    const onPaste = (e: ClipboardEvent) => {
      if (handling) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text) return
      const converted = preprocessMath(text)
      if (converted === text) return // 无需转换，交给默认流程

      e.preventDefault()
      e.stopImmediatePropagation()

      // 构造只含 text/plain 的新事件，tiptap-markdown 拿不到 text/html
      // 从而走纯文本 Markdown 解析路径
      const dt = new DataTransfer()
      dt.setData('text/plain', converted)
      const synthetic = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      })
      handling = true
      dom.dispatchEvent(synthetic)
      handling = false
    }

    dom.addEventListener('paste', onPaste, true)
    return () => dom.removeEventListener('paste', onPaste, true)
  }, [editor])

  const containerRef = useRef<HTMLDivElement>(null)

  // 监听插入图片事件
  useEffect(() => {
    if (!editor) return
    const onInsertImage = (e: Event) => {
      const base64 = (e as CustomEvent).detail
      if (base64 && editor) {
        editor.chain().focus().setImage({ src: base64 }).run()
      }
    }
    window.addEventListener('editor-insert-image', onInsertImage)
    return () => window.removeEventListener('editor-insert-image', onInsertImage)
  }, [editor])

  // ESC 退出全屏
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen, setFullscreen])

  // 全屏层内容（当 isFullscreen 为 true 时通过 Portal 渲染到 body）
  const fullscreenLayer = (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b flex items-center justify-between px-4 z-10">
        <span className="text-sm font-medium text-gray-600">全屏编辑</span>
        <button
          onClick={() => setFullscreen(false)}
          className="text-sm text-gray-500 hover:text-primary flex items-center gap-1"
        >
          <Minimize2 className="w-4 h-4" />
          退出全屏
        </button>
      </div>

      <div className="h-full flex items-center justify-center p-8 pt-16">
        <div className="max-w-4xl w-full h-full rounded-lg border border-slate-200/80 bg-white shadow-lg p-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AI 浮动工具栏（仅编辑器内选中时出现） */}
      <FloatingAIToolbar
        onAction={handleAIAction}
        isLoading={isRewriting}
        scopeRef={containerRef}
      />
    </div>
  )

  // 非全屏时的普通编辑区
  const normalEditor = (
    <div ref={containerRef} className="editor-scroll relative h-full overflow-y-auto bg-slate-100/60 px-6 py-6">
      <div className="mx-auto min-h-full max-w-[680px] rounded-sm border border-slate-200/80 bg-white px-12 py-10 shadow-sm">
        <EditorContent editor={editor} />
      </div>
      <FloatingAIToolbar
        onAction={handleAIAction}
        isLoading={isRewriting}
        scopeRef={containerRef}
      />
    </div>
  )

  // 全屏时用 Portal 渲染到 body，脱离 overflow-hidden 裁剪
  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(fullscreenLayer, document.body)
  }

  return normalEditor
}

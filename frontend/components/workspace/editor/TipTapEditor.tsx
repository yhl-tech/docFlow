"use client"

import React, { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import { Markdown } from "tiptap-markdown"
import { toast } from "sonner"
import { Minimize2 } from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { aiService } from "@/lib/api"
import { KaTeXNode } from "./extensions/KaTeXNode"
import StyleKeyExtension from "./extensions/StyleKeyExtension"
import { WordStyleApplierPlugin } from "./extensions/WordStyleApplier"
import FontFamily from "@tiptap/extension-font-family"
import { FloatingAIToolbar } from "./FloatingAIToolbar"

/**
 * style-key 标记逻辑已迁移到 StyleKeyExtension（MutationObserver 方案）。
 * 这里只保留工具函数。
 */
function preprocessMath(text: string): string {
  // 统一换行符（Windows 剪贴板可能是 CRLF）
  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  // 1. 豆包 / 标准 LaTeX 多行 \[...\]  →  $$...$$
  s = s.replace(/\\\[\n([\s\S]*?)\n\\\]/g, (_, c) => `$$\n${c}\n$$`)
  // 2. DeepSeek 风格：[ 独占一行 ... ] 独占一行  →  $$...$$
  s = s.replace(
    /(^|\n)\[\n([\s\S]*?)\n\](\n|$)/g,
    (_, pre, c, post) => `${pre}$$\n${c}\n$$${post}`,
  )
  // 3. 单行 \[...\]  →  $$...$$
  s = s.replace(/\\\[([^\n]*?)\\\]/g, (_, c) => `$$${c}$$`)
  // 4. \(...\) 行内公式  →  $...$
  s = s.replace(/\\\(([^\n]*?)\\\)/g, (_, c) => `$${c}$`)
  return s
}

/** 直接调用 startTracking */
function debounceStyleKey(editor: Editor) {
  editor.commands.startTracking()
}

interface TipTapEditorProps {
  /** 编辑器实例就绪时回调，供工具栏拿到 Editor 实例 */
  onReady?: (editor: Editor) => void
  /** 点击公式节点时回调，用于打开编辑弹窗 */
  onEditFormula?: (latex: string, displayMode: boolean, pos: number) => void
}

/* 将模板配置映射为编辑区 CSS 变量 */
function buildTemplateStyle(
  config: import("@/types/editor-template").TemplateConfig | null,
): React.CSSProperties {
  // 当 config 为 null 时，使用默认 CSS 变量
  if (!config) {
    return {
      "--tpl-title-size": "1.5rem",
      "--tpl-title-weight": "700",
      "--tpl-title-align": "center",
      "--tpl-h1-size": "1.25rem",
      "--tpl-h1-align": "left",
      "--tpl-h2-align": "left",
      "--tpl-h3-align": "left",
      "--tpl-h4-align": "left",
      "--tpl-h5-align": "left",
      "--tpl-body-weight": "400",
      "--tpl-body-align": "left",
    } as React.CSSProperties
  }
  const { styles, layout } = config
  const body = styles?.body ?? {}
  const h1 = styles?.heading_1 ?? {}
  const h2 = styles?.heading_2 ?? {}
  const h3 = styles?.heading_3 ?? {}
  const h4 = styles?.heading_4 ?? {}
  const h5 = styles?.heading_5 ?? {}
  const title = styles?.document_title ?? {}
  const subtitle = styles?.document_subtitle ?? styles?.subject_info ?? {}

  const FONT_ID_MAP: Record<string, string> = {
    FangSong_GB2312: '"仿宋_GB2312", "FangSong", serif',
    FangSong: '"FangSong", "仿宋", serif',
    STFangsong: '"STFangsong", "华文仿宋", serif',
    SimHei: '"SimHei", "黑体", sans-serif',
    HuaWenHeiTi: '"HuaWenHeiTi", "华文黑体", "SimHei", "黑体", sans-serif',
    DengXian: '"DengXian", "等线", sans-serif',
    KaiTi_GB2312: '"KaiTi_GB2312", "KaiTi", "楷体", serif',
    KaiTi: '"KaiTi", "楷体", serif',
    STKaiti: '"STKaiti", "华文楷体", serif',
    FZXiaoBiaoSong: '"FZXiaoBiaoSong", "方正小标宋", serif',
    SimSun: '"SimSun", "宋体", serif',
    NSimSun: '"NSimSun", "新宋体", serif',
    STSong: '"STSong", "华文宋体", serif',
    STZhongsong: '"STZhongsong", "华文中宋", serif',
    "Microsoft YaHei": '"Microsoft YaHei", "微软雅黑", sans-serif',
  }
  const fontVar = (id?: string) => (id ? (FONT_ID_MAP[id] ?? id) : undefined)

  const result = {
    "--tpl-body-font": fontVar(body.fontFamily) ?? "inherit",
    "--tpl-body-size": body.fontSizePt ? `${body.fontSizePt}pt` : undefined,
    "--tpl-body-weight": body.bold ? "700" : "400",
    "--tpl-body-align": body.align ?? "left",
    "--tpl-body-line-height":
      (layout?.defaultLineHeight ?? body.lineHeight)?.toString() ?? undefined,
    "--tpl-body-indent": `${layout?.defaultFirstLineIndentChars ?? body.firstLineIndentChars ?? 0}em`,
    "--tpl-paragraph-space-before": `${layout?.defaultParagraphSpacingBeforePt ?? 0}pt`,
    "--tpl-paragraph-space-after": `${layout?.defaultParagraphSpacingAfterPt ?? 0}pt`,
    "--tpl-title-font": fontVar(title.fontFamily) ?? "inherit",
    "--tpl-title-size": title.fontSizePt ? `${title.fontSizePt}pt` : undefined,
    "--tpl-title-align": title.align ?? "center",
    "--tpl-title-weight": title.bold ? "700" : "400",
    "--tpl-subtitle-font": fontVar(subtitle.fontFamily) ?? "inherit",
    "--tpl-subtitle-size": subtitle.fontSizePt
      ? `${subtitle.fontSizePt}pt`
      : undefined,
    "--tpl-subtitle-align": subtitle.align ?? "center",
    "--tpl-subtitle-weight": subtitle.bold ? "700" : "400",
    "--tpl-h1-font": fontVar(h1.fontFamily) ?? "inherit",
    "--tpl-h1-size": h1.fontSizePt ? `${h1.fontSizePt}pt` : undefined,
    "--tpl-h1-weight": h1.bold ? "700" : "400",
    "--tpl-h1-align": h1.align ?? "left",
    "--tpl-h2-font": fontVar(h2.fontFamily) ?? "inherit",
    "--tpl-h2-size": h2.fontSizePt ? `${h2.fontSizePt}pt` : undefined,
    "--tpl-h2-weight": h2.bold ? "700" : "400",
    "--tpl-h2-align": h2.align ?? "left",
    "--tpl-h3-font": fontVar(h3.fontFamily) ?? "inherit",
    "--tpl-h3-size": h3.fontSizePt ? `${h3.fontSizePt}pt` : undefined,
    "--tpl-h3-weight": h3.bold ? "700" : "400",
    "--tpl-h3-align": h3.align ?? "left",
    "--tpl-h4-font": fontVar(h4.fontFamily) ?? "inherit",
    "--tpl-h4-size": h4.fontSizePt ? `${h4.fontSizePt}pt` : undefined,
    "--tpl-h4-weight": h4.bold ? "700" : "400",
    "--tpl-h4-align": h4.align ?? "left",
    "--tpl-h5-font": fontVar(h5.fontFamily) ?? "inherit",
    "--tpl-h5-size": h5.fontSizePt ? `${h5.fontSizePt}pt` : undefined,
    "--tpl-h5-weight": h5.bold ? "700" : "400",
    "--tpl-h5-align": h5.align ?? "left",
    "--tpl-margin": layout
      ? `${layout.marginTopMm ?? 25}mm ${layout.marginRightMm ?? 20}mm ${layout.marginBottomMm ?? 25}mm ${layout.marginLeftMm ?? 20}mm`
      : undefined,
  } as React.CSSProperties

  return result
}

export function TipTapEditor({ onReady, onEditFormula }: TipTapEditorProps) {
  const {
    content,
    setContent,
    isFullscreen,
    setFullscreen,
    templatePanelOpen,
    draftTemplateConfig,
    templateBinding,
    setEditorInstance,
    pendingWordStyles,
    setPendingWordStyles,
    updateDraftStyle,
  } = useEditorStore()
  // 使用 useMemo 确保响应式更新
  const previewConfig = useMemo(() => {
    if (templatePanelOpen && draftTemplateConfig) {
      return draftTemplateConfig
    }
    return templateBinding?.configSnapshot ?? null
  }, [templatePanelOpen, draftTemplateConfig, templateBinding])
  const [isRewriting, setIsRewriting] = useState(false)
  // 防止外部更新 content 时触发死循环
  const skipUpdate = useRef(false)
  // 用 ref 稳定持有回调，避免 useEditor extensions 重新初始化
  const onEditFormulaRef = useRef(onEditFormula)
  useEffect(() => {
    onEditFormulaRef.current = onEditFormula
  }, [onEditFormula])
  const stableEditCallback = useCallback(
    (latex: string, displayMode: boolean, pos: number) => {
      onEditFormulaRef.current?.(latex, displayMode, pos)
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // 编辑器引用，供 handleAIAction 访问最新实例
  const editorRef = useRef<Editor | null>(null)

  const handleAIAction = useCallback(
    async (action: string, option?: string) => {
      const editor = editorRef.current
      if (!editor) return

      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, " ")
      if (!selectedText.trim()) return

      const params: Parameters<typeof aiService.rewrite>[0] = {
        text: selectedText,
        type: action as any,
        ...(action === "扩写" && option
          ? { expandSubType: option as any }
          : {}),
        ...(action === "改变语气" && option
          ? { toneSubType: option as any }
          : {}),
        ...(action === "翻译" && option
          ? { translateSubType: option as any }
          : {}),
      }

      setIsRewriting(true)
      const toastId = toast.loading(`${action}中…`)
      try {
        const res = await aiService.rewrite(params)
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, res.result)
          .run()
        toast.success("已替换选中内容", { id: toastId })
      } catch {
        toast.error("AI 处理失败，请重试", { id: toastId })
      } finally {
        setIsRewriting(false)
      }
    },
    [],
  )

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
        placeholder: "",
      }),
      Markdown.configure({
        html: false, // 不允许 HTML 输入（安全）
        transformPastedText: true, // 粘贴 Markdown 时自动转为富文本
        transformCopiedText: false,
      }),
      // KaTeX 公式扩展 - 支持在编辑器中实时渲染 LaTeX 公式
      KaTeXNode.configure({
        inline: true,
        onEditFormula: stableEditCallback,
      }),
      FontFamily,
      StyleKeyExtension,
      WordStyleApplierPlugin,
    ],
    editorProps: {
      attributes: {
        class: "tiptap-editor outline-none",
      },
    },
    onUpdate({ editor }) {
      if (skipUpdate.current) return
      const md = (editor.storage as any).markdown.getMarkdown()
      setContent(md)
      // 防抖重新计算 style-key（文档结构变化时才需要）
      debounceStyleKey(editor)
    },
    onCreate({ editor }) {
      // 为文档标题段落添加 class（支持 p 和 h1）
      // 为副标题添加 class（第二个段落）
      // 必须放在 setContent 之前，因为 setContent 之后可能延迟渲染
      const markDocumentTitle = () => {
        const dom = editor.view.dom as HTMLElement
        if (!dom) return
        // 优先查找 h1（Markdown # 标题格式）
        const firstH1 = dom.querySelector("h1:first-of-type")
        if (firstH1) {
          firstH1.classList.add("document-title")
        } else {
          const firstP = dom.querySelector("p:first-of-type")
          if (firstP) {
            firstP.classList.add("document-title")
          }
        }
        // 标记副标题（第二个段落）
        const blocks = dom.querySelectorAll(
          ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
        )
        if (blocks.length >= 2) {
          const secondBlock = blocks[1]
          if (!secondBlock.classList.contains("document-title")) {
            secondBlock.classList.add("document-subtitle")
          }
        }
      }

      // 初始化时从 store 加载内容
      if (content) {
        skipUpdate.current = true
        editor.commands.setContent(content)
        skipUpdate.current = false
        // 内容加载后计算 style-key 并标记
        setTimeout(() => {
          markDocumentTitle()
        }, 100)
      } else {
        // 无内容时直接标记
        setTimeout(() => {
          markDocumentTitle()
        }, 100)
      }

      editorRef.current = editor
      setEditorInstance(editor)
      onReady?.(editor)
    },
  })

  // 同步 editorRef，确保 handleAIAction 始终持有最新实例
  useEffect(() => {
    if (editor) editorRef.current = editor
  }, [editor])

  // 监听用户在文档标题上的加粗操作，同步到模板设置
  useEffect(() => {
    if (!editor || !previewConfig) return

    let prevBoldState: boolean | null = null

    const updateBold = () => {
      const dom = editor.view.dom as HTMLElement
      const titleEl = dom.querySelector('[data-style-key="document_title"]')
      if (!titleEl) return

      const hasStrong = titleEl.querySelector("strong") !== null
      const templateBold = previewConfig?.styles?.document_title?.bold

      if (prevBoldState !== null && prevBoldState !== hasStrong) {
        updateDraftStyle("document_title", { bold: hasStrong })
      }
      prevBoldState = hasStrong
    }

    // 监听选区变化
    const handleSelectionUpdate = () => {
      updateBold()
    }

    editor.on("selectionUpdate", handleSelectionUpdate)

    // 初始检测
    updateBold()

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, previewConfig?.styles?.document_title?.bold, updateDraftStyle])

  // 响应外部 content 变化（如 AI 对话填入内容）
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = (editor.storage as any).markdown.getMarkdown()
    if (current !== content) {
      skipUpdate.current = true
      editor.commands.setContent(content)
      skipUpdate.current = false
      // 内容加载后等待渲染完成再标记
      setTimeout(() => {
        const dom = editor.view.dom as HTMLElement
        if (!dom) return
        const firstH1 = dom.querySelector("h1:first-of-type")
        if (firstH1) {
          firstH1.classList.add("document-title")
        } else {
          const firstP = dom.querySelector("p:first-of-type")
          if (firstP) {
            firstP.classList.add("document-title")
          }
        }
        // 标记副标题（第二个段落）
        const blocks = dom.querySelectorAll(
          ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
        )
        if (blocks.length >= 2) {
          const secondBlock = blocks[1]
          if (!secondBlock.classList.contains("document-title")) {
            secondBlock.classList.add("document-subtitle")
          }
        }
      }, 100)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Word 样式应用：content 加载后触发 WordStyleApplier 插件
  // 监听 content 和 pendingWordStyles 两者，确保样式在内容稳定后应用
  useEffect(() => {
    if (!editor || editor.isDestroyed || !pendingWordStyles?.length) return

    // 等待一小段时间确保 setContent 已经完全应用
    const timer = setTimeout(() => {
      // 再次检查 editor 状态和 style 数据
      if (!editor || editor.isDestroyed) return

      // 获取当前文档文本，验证内容已稳定
      const currentDoc = editor.state.doc
      const docText = currentDoc.textContent

      // 如果文档为空或非常短（内容可能还没加载完），跳过本次
      // 内容太短可能是 setContent 还在进行中
      if (docText.length < 10 && content.length > 10) {
        return
      }

      const tr = editor.state.tr.setMeta("applyWordStyles", pendingWordStyles)
      editor.view.dispatch(tr)
      // 消费后清空，防止重复应用
      setPendingWordStyles(null)
    }, 200) // 200ms 延迟确保 setContent 完全应用

    return () => clearTimeout(timer)
  }, [content, pendingWordStyles, editor, setPendingWordStyles])

  // 拦截粘贴事件：把非标准公式定界符（\[...\]、[...]等）预处理为 $$...$$
  // 在 capture 阶段运行，早于 tiptap-markdown 的粘贴插件。
  // 构造只含 text/plain 的合成事件，防止 tiptap-markdown 优先消费 text/html
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    let handling = false

    const onPaste = (e: ClipboardEvent) => {
      if (handling) return
      const text = e.clipboardData?.getData("text/plain")
      if (!text) return
      const converted = preprocessMath(text)
      if (converted === text) return // 无需转换，交给默认流程

      e.preventDefault()
      e.stopImmediatePropagation()

      // 构造只含 text/plain 的新事件，tiptap-markdown 拿不到 text/html
      // 从而走纯文本 Markdown 解析路径
      const dt = new DataTransfer()
      dt.setData("text/plain", converted)
      const synthetic = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      })
      handling = true
      dom.dispatchEvent(synthetic)
      handling = false
    }

    dom.addEventListener("paste", onPaste, true)
    return () => dom.removeEventListener("paste", onPaste, true)
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
    window.addEventListener("editor-insert-image", onInsertImage)
    return () =>
      window.removeEventListener("editor-insert-image", onInsertImage)
  }, [editor])

  // ESC 退出全屏
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setFullscreen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isFullscreen, setFullscreen])

  // 全屏层内容（当 isFullscreen 为 true 时通过 Portal 渲染到 body）
  const templateStyle = buildTemplateStyle(previewConfig)

  // 追踪标题的实际样式（当没有模板时，跟踪用户手动设置的样式）
  const [titleActualBold, setTitleActualBold] = useState<boolean>(true)

  // 当没有模板绑定时，监听标题的实际样式
  useEffect(() => {
    if (!editor) return

    const updateTitleBold = () => {
      const dom = editor.view.dom as HTMLElement
      const titleEl = dom.querySelector('[data-style-key="document_title"]')
      if (!titleEl) return
      const hasStrong = titleEl.querySelector("strong") !== null
      setTitleActualBold(hasStrong)
    }

    // 监听选区变化（Bold 切换会触发这个）
    editor.on("selectionUpdate", updateTitleBold)
    // 监听内容变化
    editor.on("update", updateTitleBold)

    // 初始检测
    updateTitleBold()

    return () => {
      editor.off("selectionUpdate", updateTitleBold)
      editor.off("update", updateTitleBold)
    }
  }, [editor])

  // 当没有模板时，使用标题的实际样式
  const finalStyle = useMemo(() => {
    if (previewConfig) {
      // 有模板时，使用模板配置
      return templateStyle
    }
    // 没有模板时，根据标题的实际加粗状态设置 CSS 变量
    return {
      ...templateStyle,
      "--tpl-title-weight": titleActualBold ? "700" : "400",
    }
  }, [templateStyle, previewConfig, titleActualBold])

  // 追踪模板设置的变化（只在模板面板主动修改时触发）
  const lastTemplateBoldRef = useRef<boolean | undefined>(undefined)
  const lastUserBoldRef = useRef<boolean | undefined>(undefined)

  // 当模板设置改变加粗时，同步标题上的 strong 标签
  useEffect(() => {
    if (!editor || !previewConfig) return
    const templateBold = previewConfig.styles?.document_title?.bold
    const dom = editor.view.dom as HTMLElement
    const titleEl = dom.querySelector('[data-style-key="document_title"]')
    if (!titleEl) return

    const titleText = titleEl.textContent?.trim() || ""
    const hasStrong = titleEl.querySelector("strong") !== null

    // 检测是否是模板设置主动变化（与上次记录的值不同）
    const templateChanged = lastTemplateBoldRef.current !== templateBold
    if (templateChanged) {
      lastTemplateBoldRef.current = templateBold
      lastUserBoldRef.current = hasStrong

      if (templateBold === false && hasStrong) {
        // 模板要求不加粗，但标题被加粗了 → 取消加粗
        const pos = editor.view.posAtDOM(titleEl, 0)
        if (pos >= 0) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + titleText.length })
            .toggleBold()
            .run()
        }
      } else if (templateBold === true && !hasStrong) {
        // 模板要求加粗，但标题没加粗 → 添加加粗
        const pos = editor.view.posAtDOM(titleEl, 0)
        if (pos >= 0) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + titleText.length })
            .toggleBold()
            .run()
        }
      }
    }
  }, [previewConfig?.styles?.document_title?.bold, editor])

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
        <div
          ref={containerRef}
          id="editor-root"
          className="max-w-4xl w-full h-full rounded-lg border border-slate-200/80 bg-white shadow-lg p-8 tpl-paper"
          style={finalStyle}
        >
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
    <div
      ref={containerRef}
      id="editor-root"
      className="editor-scroll relative h-full overflow-y-auto bg-slate-100/60 px-6 py-6"
    >
      <div
        className="mx-auto min-h-full max-w-[680px] rounded-sm border border-slate-200/80 bg-white shadow-sm tpl-paper"
        style={finalStyle}
      >
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
  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(fullscreenLayer, document.body)
  }

  return normalEditor
}

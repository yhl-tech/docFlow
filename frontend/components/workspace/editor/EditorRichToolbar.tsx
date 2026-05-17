"use client"

import { useState, useRef, useEffect, type RefObject } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import type { Editor } from "@tiptap/react"
import {
  Undo2,
  Redo2,
  PanelLeftOpen,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Table,
  ImageIcon,
  Trash2,
  ChevronDown,
  Maximize2,
  Minimize2,
  Quote,
  Code2,
  LayoutTemplate,
  FileDown,
  Sigma,
  Save,
} from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { useExport } from "@/hooks/useExport"
import { editorService } from "@/lib/api/editor"
import { MathFormulaDialog } from "./MathFormulaDialog"
import { TemplateMiniSelector } from "@/components/workspace/template-market/TemplateMiniSelector"
import { UpgradeModal } from "@/components/pricing/UpgradeModal"

/* ─── 分组胶囊容器 ─── */
function PillGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-px rounded-lg border border-slate-200 bg-slate-50/80 p-px backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}

/* ─── 单个工具按钮 ─── */
function ToolBtn({
  onClick,
  title,
  active,
  danger,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`
        relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-all duration-100
        ${active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
          : danger
            ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
            : "text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm"
        }
      `}
    >
      {children}
    </button>
  )
}

/* ─── 分隔竖线（胶囊内） ─── */
function Sep() {
  return <div className="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-200" />
}

/* ── 标题下拉 ── */
function HeadingDropdown({ editorRef }: { editorRef: RefObject<Editor | null> }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const headings = [
    { label: "正文", action: () => editorRef.current?.chain().focus().setParagraph().run() },
    { label: "标题 1", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "标题 2", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "标题 3", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "标题 4", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 4 }).run() },
  ]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const dropdown = open && btnRef.current ? (
    <div
      className="fixed z-[100001] w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80"
      style={{
        top: btnRef.current.getBoundingClientRect().bottom + 6,
        left: btnRef.current.getBoundingClientRect().left,
      }}
    >
      {headings.map((h) => (
        <button
          key={h.label}
          onMouseDown={(e) => { e.preventDefault(); h.action(); setOpen(false) }}
          className="block w-full px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50"
        >
          {h.label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm"
      >
        {(() => {
          const ed = editorRef.current
          if (ed?.isActive("heading", { level: 1 })) return "H1"
          if (ed?.isActive("heading", { level: 2 })) return "H2"
          if (ed?.isActive("heading", { level: 3 })) return "H3"
          if (ed?.isActive("heading", { level: 4 })) return "H4"
          return "正文"
        })()}
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </>
  )
}

/* ── 表格选择器（6×8 网格） ── */
function TablePicker({ editorRef }: { editorRef: RefObject<Editor | null> }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ r: 0, c: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const ROWS = 6, COLS = 8

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) {
        setHover({ r: 0, c: 0 })
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function insertTable(rows: number, cols: number) {
    const ed = editorRef.current
    if (!ed) {
      console.error('[insertTable] editorRef.current 为空')
      return
    }

    // 使用统一的 getPreviewTemplateConfig 方法获取配置
    // 这个方法内部有完整的回退逻辑：draftTemplateConfig -> templateBinding.configSnapshot -> currentTemplate.config -> 默认配置
    const state = useEditorStore.getState()
    const previewConfig = state.getPreviewTemplateConfig()

    // 详细记录配置来源
    const configSource = state.draftTemplateConfig
      ? 'draftTemplateConfig'
      : state.templateBinding?.configSnapshot
        ? 'templateBinding.configSnapshot'
        : state.currentTemplate?.config
          ? 'currentTemplate.config'
          : 'default'

    console.log('[insertTable] 配置获取:', {
      configSource,
      hasTableStyles: !!previewConfig?.tableStyles,
      tableStyles: previewConfig?.tableStyles,
    })

    const ts = previewConfig?.tableStyles
    const cellPad = ts?.cellPadding ?? {}

    // 详细记录 tableNumbering 配置
    console.log('[insertTable] === tableNumbering 配置 ===', {
      ts: ts,
      tsKeys: ts ? Object.keys(ts) : [],
      enabled: ts?.tableNumbering?.enabled,
      prefix: ts?.tableNumbering?.prefix,
      suffix: ts?.tableNumbering?.suffix,
      startNumber: ts?.tableNumbering?.startNumber,
      fullConfig: ts?.tableNumbering,
      'tableNumbering in ts': ts && 'tableNumbering' in ts,
    })

    // 计算当前文档中表格的数量，用于生成编号
    let tableCount = 0
    ed.state.doc.descendants((node) => {
      if (node.type.name === 'table') tableCount++
    })
    const tableNumber = tableCount + 1

    console.log('[insertTable] === 编号计算 ===', {
      existingTables: tableCount,
      newTableNumber: tableNumber,
    })

    // 获取表格编号配置
    const tableNumbering = ts?.tableNumbering
    const shouldNumber = tableNumbering?.enabled === true
    const prefix = tableNumbering?.prefix ?? '表 '
    const suffix = tableNumbering?.suffix ?? '  '
    const numberingText = `${prefix}${tableNumber}${suffix}`

    // 插入表格，并在表格前添加编号
    ed.chain().focus().insertTable({
      rows,
      cols,
      withHeaderRow: true,
    }).command(({ tr, state }) => {
      // 在事务中查找刚插入的表格位置（在文档末尾，因为是刚插入的）
      let tablePos = -1
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'table' && tablePos < 0) {
          tablePos = pos
        }
      })

      // 如果启用了编号且找到了表格位置，在表格前插入编号段落
      if (shouldNumber && tablePos >= 0) {
        const paragraphNode = state.schema.nodes.paragraph?.create(
          { textAlign: 'center' },
          [state.schema.text(numberingText)]
        )
        if (paragraphNode) {
          tr.insert(tablePos, paragraphNode)
          console.log('[insertTable] ✅ 编号段落已插入到位置', tablePos, '内容:', numberingText)
        } else {
          console.log('[insertTable] ❌ 无法创建编号段落节点')
        }
      } else if (!shouldNumber) {
        console.log('[insertTable] ⏭️ 编号未启用，跳过插入', {
          tableNumbering: tableNumbering,
          tablePos,
          enabled: tableNumbering?.enabled,
        })
      } else if (tablePos < 0) {
        console.log('[insertTable] ⚠️ 未找到表格位置，无法插入编号')
      }
      return true
    }).run()

    // 检查插入后文档状态 - 详细验证编号
    setTimeout(() => {
      const { doc } = ed.state
      let tableCountDebug = 0
      let rowCount = 0
      let cellCount = 0
      let paragraphCount = 0
      let firstParagraphText = ''
      
      doc.descendants((node, pos) => {
        if (node.type.name === 'table') tableCountDebug++
        if (node.type.name === 'tableRow') rowCount++
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') cellCount++
        if (node.type.name === 'paragraph') {
          paragraphCount++
          if (pos === 0 && node.content.size > 0) {
            firstParagraphText = node.textContent
          }
        }
      })
      
      console.log('[insertTable] === 插入后文档状态 ===', { 
        tableCount: tableCountDebug, 
        rowCount, 
        cellCount,
        paragraphCount,
      })

      // 检查 DOM 中的表格和编号
      const tables = document.querySelectorAll('.tiptap table')
      console.log('[insertTable] === DOM 检查 ===', {
        domTableCount: tables.length,
      })

      // 检查表格前的编号文本 - 详细验证
      if (tables.length > 0) {
        const firstTable = tables[0]
        const prevSibling = firstTable.previousSibling
        const parentText = firstTable.parentElement?.textContent ?? ''
        
        // TipTap 编辑器的结构：表格通常在 paragraph 内部或之后
        // 检查文档结构
        let docStructure = ''
        let nodeIndex = 0
        doc.descendants((node, pos) => {
          if (nodeIndex < 5) { // 只记录前5个节点
            docStructure += `\n  [${nodeIndex}] ${node.type.name}${node.textContent ? ` "${node.textContent.substring(0, 30)}"` : ''}`
            nodeIndex++
          }
          return true
        })

        console.log('[insertTable] === 文档结构（前5个节点）===' + docStructure)
        console.log('[insertTable] === 表格前的内容 ===', {
          prevSiblingType: prevSibling?.nodeName ?? '无',
          prevSiblingText: prevSibling?.textContent ?? '无',
          parentText: parentText.substring(0, 100),
          firstParagraphText: firstParagraphText,
        })

        // 检查编号是否在正确的位置 - 使用配置的前缀
        const currentConfig = useEditorStore.getState().getPreviewTemplateConfig()
        const prefix = currentConfig?.tableStyles?.tableNumbering?.prefix ?? '表 '
        const suffix = currentConfig?.tableStyles?.tableNumbering?.suffix ?? '  '
        const expectedPattern = new RegExp(`${prefix}\\d+${suffix}`)
        
        const editorContent = document.querySelector('.editor-content, .tiptap, [contenteditable]')
        let fullText = ''
        if (editorContent) {
          fullText = editorContent.textContent ?? ''
        } else {
          fullText = parentText
        }
        
        const hasTableNumber = expectedPattern.test(fullText)
        const matches = fullText.match(new RegExp(`${prefix}\\d+${suffix}`, 'g'))
        
        console.log('[insertTable] === 编号验证 ===', {
          expectedPattern: `${prefix}X${suffix}`,
          fullText: fullText.substring(0, 150),
          hasTableNumber,
          matches,
          configPrefix: prefix,
          configSuffix: suffix,
          tableNumberingEnabled: currentConfig?.tableStyles?.tableNumbering?.enabled,
        })
      } else {
        console.log('[insertTable] ⚠️ 未在 DOM 中找到表格')
      }
    }, 100)

    // 插入后更新表格属性（对齐、边框等）
    if (previewConfig?.tableStyles) {
      setTimeout(() => {
        // 重新获取最新配置
        const currentState = useEditorStore.getState()
        const currentConfig = currentState.getPreviewTemplateConfig()
        
        console.log('[insertTable] setTimeout 配置:', {
          configSource: currentState.draftTemplateConfig
            ? 'draftTemplateConfig'
            : currentState.templateBinding?.configSnapshot
              ? 'templateBinding.configSnapshot'
              : currentState.currentTemplate?.config
                ? 'currentTemplate.config'
                : 'default',
          hasTableStyles: !!currentConfig?.tableStyles,
          tableStyles: currentConfig?.tableStyles,
        })
        
        const currentTs = currentConfig?.tableStyles
        
        const { tr, doc } = ed.state
        let tablePos = -1
        doc.descendants((node, pos) => {
          if (node.type.name === 'table' && tablePos < 0) {
            tablePos = pos
            return false
          }
        })
        if (tablePos >= 0) {
          const currentCellPad = currentTs?.cellPadding ?? {}
          const newAttrs = {
            tableAlign: currentTs?.tableAlignment ?? 'left',
            tableWidth: currentTs?.tableWidth ?? 100,
            borderColor: currentTs?.border?.color ?? '#000000',
            borderWidthPt: currentTs?.border?.widthPt ?? 0.5,
            borderStyle: currentTs?.border?.style ?? 'solid',
            shadingFill: currentTs?.shading?.fill ?? 'transparent',
            cellPadTop: currentCellPad.top ?? 0.14,
            cellPadRight: currentCellPad.right ?? 0,
            cellPadBottom: currentCellPad.bottom ?? 0.14,
            cellPadLeft: currentCellPad.left ?? 0,
            headerBg: currentTs?.headerStyle?.shading?.fill ?? '#f0f0f0',
            headerFontSizePt: currentTs?.headerStyle?.font?.fontSizePt ?? 0,
            headerBold: currentTs?.headerStyle?.font?.bold === true,
            dataRowBg: currentTs?.dataRowStyle?.shading?.fill ?? 'transparent',
            dataRowFontSizePt: currentTs?.dataRowStyle?.font?.fontSizePt ?? 0,
            dataRowBold: currentTs?.dataRowStyle?.font?.bold ?? false,
          }
          console.log('[insertTable] === 表格属性设置 ===', {
            tablePos,
            dataRowBold: newAttrs.dataRowBold,
            dataRowBg: newAttrs.dataRowBg,
            headerBold: newAttrs.headerBold,
            headerBg: newAttrs.headerBg,
            configSource: currentState.draftTemplateConfig
              ? 'draftTemplateConfig'
              : currentState.templateBinding?.configSnapshot
                ? 'templateBinding.configSnapshot'
                : currentState.currentTemplate?.config
                  ? 'currentTemplate.config'
                  : 'default',
          })
          ed.chain().command(({ tr }) => {
            const node = ed.state.doc.nodeAt(tablePos)
            if (!node) return false
            tr.setNodeMarkup(tablePos, undefined, newAttrs)
            return true
          }).run()
        }
      }, 50)
    }

    setOpen(false)
  }

  const dropdown = open && btnRef.current ? (
    <div
      className="fixed z-[100001] rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/80"
      style={{
        top: btnRef.current.getBoundingClientRect().bottom + 6,
        left: btnRef.current.getBoundingClientRect().left,
      }}
    >
      <p className="mb-2 text-center text-xs text-slate-500">
        {hover.r > 0 && hover.c > 0 ? `${hover.r} × ${hover.c} 表格` : "拖动选择表格大小"}
      </p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => (
            <div
              key={`${r}-${c}`}
              onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
              onMouseDown={(e) => { e.preventDefault(); insertTable(r + 1, c + 1) }}
              className={`w-5 h-5 rounded-sm cursor-pointer transition-all duration-75 ${
                r < hover.r && c < hover.c
                  ? "bg-indigo-400 border-indigo-300 ring-1 ring-indigo-300/60 scale-110"
                  : "border border-slate-100 bg-slate-50 hover:border-slate-200"
              }`}
            />
          ))
        )}
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        title="插入表格"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-white hover:text-slate-800 hover:shadow-sm"
      >
        <Table className="w-3.5 h-3.5" />
      </button>
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </>
  )
}

/* ─── 主工具栏 ─── */
const EXPORT_BTNS: { format: "docx" | "pdf" | "excel" | "image"; label: string; title: string }[] = [
  { format: "docx", label: "导出 Word", title: "导出 Word (.docx)" },
]

interface EditingFormula {
  latex: string
  displayMode: boolean
  pos: number
}

interface EditorRichToolbarProps {
  editorRef: RefObject<Editor | null>
  editorReady: boolean
  onClear: () => void
  editingFormula?: EditingFormula | null
  onClearEdit?: () => void
  panelOpen?: boolean
  onTogglePanel?: () => void
  aiPanelOpen?: boolean
  onToggleAI?: () => void
}

export function EditorRichToolbar({
  editorRef,
  editorReady,
  onClear,
  editingFormula,
  onClearEdit,
  panelOpen,
  onTogglePanel,
  aiPanelOpen,
  onToggleAI,
}: EditorRichToolbarProps) {
  const {
    exportStatus,
    isFullscreen,
    toggleFullscreen,
    currentTemplate,
    templates,
    setTemplates,
    setAvailableFonts,
    setCurrentTemplate,
    content,
    templateBinding,
    setCurrentDocumentId,
  } = useEditorStore()
  const { exportDoc, upgradeModalOpen, setUpgradeModalOpen } = useExport()
  const isExporting = exportStatus === "loading"
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templateBtnRef = useRef<HTMLButtonElement>(null)
  const [miniSelectorOpen, setMiniSelectorOpen] = useState(false)

  async function handleSave() {
    if (!content.trim()) {
      toast.error('请先输入内容再保存')
      return
    }
    setIsSaving(true)
    try {
      const res = await editorService.saveDocument({
        content,
        title: '',
        template: templateBinding?.templateId,
        templateBinding: templateBinding ?? undefined,
      })
      setCurrentDocumentId(res.id)
      toast.success('已保存')
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  /* 首次挂载时预拉取模板列表，确保面板打开时有数据 */
  useEffect(() => {
    if (templates.length > 0) return
    Promise.all([editorService.getTemplates(), editorService.getFonts()])
      .then(([tpls, fonts]) => {
        setTemplates(tpls as any)
        setAvailableFonts(fonts)
        // 不自动选中默认模板，由用户主动选择
      })
      .catch(() => {/* 静默失败，面板打开时再重试 */})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* 监听模板配置变化，给已插入的表格补充编号 */
  const { draftTemplateConfig } = useEditorStore()
  const prevConfigRef = useRef<string>('')
  
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    
    // 获取当前配置
    const config = draftTemplateConfig ?? templateBinding?.configSnapshot ?? null
    const tableNumbering = config?.tableStyles?.tableNumbering
    if (!tableNumbering?.enabled) return

    // 生成配置的唯一标识，用于检测是否真的变化了
    const configKey = JSON.stringify({
      enabled: tableNumbering.enabled,
      prefix: tableNumbering.prefix,
      suffix: tableNumbering.suffix,
    })
    
    // 如果配置内容没变，跳过
    if (prevConfigRef.current === configKey) return
    prevConfigRef.current = configKey

    // 遍历文档，检查每个表格
    let modified = false
    const tr = ed.state.tr
    
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'table') return
      
      // 找到表格前一个位置的节点
      if (pos === 0) return
      
      // 获取前一个兄弟节点
      const $pos = ed.state.doc.resolve(pos)
      const before = $pos.nodeBefore
      
      // 检查是否是编号段落（只包含"表 X"格式的文本）
      const prefix = tableNumbering.prefix ?? '表 '
      const suffix = tableNumbering.suffix ?? '  '
      const expectedPattern = new RegExp(`^${prefix}\\d+${suffix}$`)
      
      const isNumberingParagraph = 
        before?.type.name === 'paragraph' &&
        before.content.size > 0 &&
        before.content.firstChild?.type.name === 'text' &&
        expectedPattern.test(before.textContent)
      
      if (!isNumberingParagraph) {
        // 插入编号段落
        const numberingText = `${prefix}1${suffix}`
        const paragraphNode = ed.state.schema.nodes.paragraph?.create({}, [
          ed.state.schema.text(numberingText)
        ])
        if (paragraphNode) {
          tr.insert(pos, paragraphNode)
          modified = true
        }
      }
    })

    if (modified) {
      ed.view.dispatch(tr)
      console.log('[TableNumbering] 已补充表格编号')
    }
  }, [draftTemplateConfig, templateBinding, editorRef, editorReady])

  // 图片上传处理
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB")
      return
    }

    // 从模板配置获取图片样式
    const previewConfig = useEditorStore.getState().draftTemplateConfig 
      ?? useEditorStore.getState().templateBinding?.configSnapshot 
      ?? null
    const imageStyles = previewConfig?.imageStyles
    const wrapType = imageStyles?.position?.wrapType ?? 'inline'
    const imgAlign = imageStyles?.position?.horizontalAlign ?? 'left'

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      editorRef.current?.chain().focus().setImage({
        src: base64,
        wrapType,
        imgAlign,
      } as any).run()
      toast.success("图片已插入")
    }
    reader.onerror = () => {
      toast.error("图片读取失败")
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const e = editorRef.current

  return (
    <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 py-2">
      {/* 单行胶囊分组布局 */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* ── 面板展开 + AI对话（撤销左侧） ── */}
        {((!panelOpen && onTogglePanel) || onToggleAI) && (
          <PillGroup>
            {!panelOpen && onTogglePanel && (
              <ToolBtn onClick={onTogglePanel} title="展开文档面板">
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </ToolBtn>
            )}
            {onToggleAI && (
              <ToolBtn onClick={onToggleAI} title="AI 对话" active={aiPanelOpen}>
                <MessageSquare className="w-3.5 h-3.5" />
              </ToolBtn>
            )}
          </PillGroup>
        )}

        {/* ── 历史操作组 ── */}
        <PillGroup>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().undo().run()} title="撤销 (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().redo().run()} title="重做 (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </ToolBtn>
        </PillGroup>

        {/* ── 文本格式化组 ── */}
        <PillGroup>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleBold().run()} active={e?.isActive("bold")} title="加粗 (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleItalic().run()} active={e?.isActive("italic")} title="斜体 (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleUnderline().run()} active={e?.isActive("underline")} title="下划线 (Ctrl+U)">
            <Underline className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleStrike().run()} active={e?.isActive("strike")} title="删除线">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          <HeadingDropdown editorRef={editorRef} />
        </PillGroup>

        {/* ── 列表 & 结构组 ── */}
        <PillGroup>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleBulletList().run()} active={e?.isActive("bulletList")} title="无序列表">
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleOrderedList().run()} active={e?.isActive("orderedList")} title="有序列表">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleBlockquote().run()} active={e?.isActive("blockquote")} title="引用块">
            <Quote className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editorRef.current?.chain().focus().toggleCodeBlock().run()} active={e?.isActive("codeBlock")} title="代码块">
            <Code2 className="w-3.5 h-3.5" />
          </ToolBtn>
        </PillGroup>

        {/* ── 插入组 ── */}
        <PillGroup>
          <TablePicker editorRef={editorRef} />
          <MathFormulaDialog editorRef={editorRef} editingFormula={editingFormula} onClearEdit={onClearEdit} />
          <Sep />
          {/* 插入图片 */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click() }}
            title="插入图片"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-white hover:text-slate-800 hover:shadow-sm"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <ToolBtn onClick={onClear} title="清空内容" danger>
            <Trash2 className="h-3.5 w-3.5" />
          </ToolBtn>
        </PillGroup>

        {/* ── 右侧功能组 ── */}
        <div className="ml-auto flex items-center gap-2">
          {/* 全屏切换 */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全屏" : "全屏编辑"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-white hover:text-slate-700 hover:shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* 模板按钮 + 迷你选择器 */}
          <div className="relative">
            <button
              ref={templateBtnRef}
              onClick={() => setMiniSelectorOpen((v) => !v)}
              title="模板设置"
              className={`
                inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all
                ${currentTemplate
                  ? "border-indigo-200 bg-indigo-50/80 text-indigo-600 hover:bg-indigo-50"
                  : "border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-white hover:shadow-sm"
                }
              `}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="max-w-[80px] truncate">
                {currentTemplate ? currentTemplate.name : "选择模板"}
              </span>
            </button>
            <TemplateMiniSelector
              anchorRef={templateBtnRef}
              open={miniSelectorOpen}
              onClose={() => setMiniSelectorOpen(false)}
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            title="保存文档 (Ctrl+S)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? '保存中…' : '保存'}</span>
          </button>

          {/* 导出按钮 */}
          {EXPORT_BTNS.map(({ format, label, title }) => (
            <button
              key={format}
              onClick={() => exportDoc(format)}
              disabled={isExporting}
              title={title}
              className={`
                inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5
                text-xs font-medium text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-100/80 hover:text-indigo-700
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 配额不足 / 余额不足时自动弹出的升级弹窗 */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab="member"
      />
    </div>
  )
}

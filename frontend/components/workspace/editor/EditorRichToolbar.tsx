"use client"

import { useState, useRef, useEffect, type RefObject } from "react"
import { toast } from "sonner"
import type { Editor } from "@tiptap/react"
import {
  Undo2,
  Redo2,
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
} from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { useExport } from "@/hooks/useExport"
import { editorService } from "@/lib/api/editor"
import { MathFormulaDialog } from "./MathFormulaDialog"
import { TemplatePanel } from "./TemplatePanel"
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
  const ref = useRef<HTMLDivElement>(null)
  const headings = [
    { label: "正文", action: () => editorRef.current?.chain().focus().setParagraph().run() },
    { label: "标题 1", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "标题 2", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "标题 3", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "标题 4", action: () => editorRef.current?.chain().focus().toggleHeading({ level: 4 }).run() },
  ]

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
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
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-28 rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/80">
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
      )}
    </div>
  )
}

/* ── 表格选择器（6×8 网格） ── */
function TablePicker({ editorRef }: { editorRef: RefObject<Editor | null> }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ r: 0, c: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const ROWS = 6, COLS = 8

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setHover({ r: 0, c: 0 }); setOpen(false) } }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function insertTable(rows: number, cols: number) {
    editorRef.current?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        title="插入表格"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-white hover:text-slate-800 hover:shadow-sm"
      >
        <Table className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/80">
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
      )}
    </div>
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
  onClear: () => void
  editingFormula?: EditingFormula | null
  onClearEdit?: () => void
}

export function EditorRichToolbar({
  editorRef,
  onClear,
  editingFormula,
  onClearEdit,
}: EditorRichToolbarProps) {
  const {
    exportStatus,
    isFullscreen,
    toggleFullscreen,
    setUploadStatus,
    currentTemplate,
    templates,
    setTemplates,
    setAvailableFonts,
    setCurrentTemplate,
    openTemplatePanel,
  } = useEditorStore()
  const { exportDoc, upgradeModalOpen, setUpgradeModalOpen } = useExport()
  const isExporting = exportStatus === "loading"
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      }).run()
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

          {/* 模板按钮 */}
          <button
            onClick={openTemplatePanel}
            title="排版设置"
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

      {/* 模板设置面板 */}
      <TemplatePanel />

      {/* 配额不足 / 余额不足时自动弹出的升级弹窗 */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab="member"
      />
    </div>
  )
}

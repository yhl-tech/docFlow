"use client"

import { useState, useRef, type RefObject } from "react"
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
  FileText,
  FileSpreadsheet,
  FileImage,
  FileDown,
} from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { useExport } from "@/hooks/useExport"
import { MathFormulaDialog } from "./MathFormulaDialog"
import { UpgradeModal } from "@/components/pricing/UpgradeModal"

/* ─── 子组件 ─── */

function Divider() {
  return <div className="mx-0.5 h-4 w-px flex-shrink-0 bg-slate-100" />
}

function ToolBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded transition-colors ${
        active
          ? "bg-slate-100 text-slate-800"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  )
}

/* ── 标题下拉 ── */
function HeadingDropdown({
  editorRef,
}: {
  editorRef: RefObject<Editor | null>
}) {
  const [open, setOpen] = useState(false)
  const headings = [
    {
      label: "正文",
      action: () => editorRef.current?.chain().focus().setParagraph().run(),
    },
    {
      label: "标题 1",
      action: () =>
        editorRef.current?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "标题 2",
      action: () =>
        editorRef.current?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "标题 3",
      action: () =>
        editorRef.current?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "标题 4",
      action: () =>
        editorRef.current?.chain().focus().toggleHeading({ level: 4 }).run(),
    },
  ]
  return (
    <div className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className="flex h-7 items-center gap-0.5 rounded px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
      >
        H <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-30 w-28"
          onMouseLeave={() => setOpen(false)}
        >
          {headings.map((h) => (
            <button
              key={h.label}
              onMouseDown={(e) => {
                e.preventDefault()
                h.action()
                setOpen(false)
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
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
  const ROWS = 6,
    COLS = 8

  function insertTable(rows: number, cols: number) {
    editorRef.current
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
        title="插入表格"
        className="flex h-7 w-7 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Table className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-30"
          onMouseLeave={() => {
            setHover({ r: 0, c: 0 })
            setOpen(false)
          }}
        >
          <p className="mb-2 text-center text-xs text-slate-500">
            {hover.r > 0 && hover.c > 0
              ? `${hover.r} × ${hover.c} 表格`
              : "拖动选择表格大小"}
          </p>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          >
            {Array(ROWS)
              .fill(0)
              .map((_, r) =>
                Array(COLS)
                  .fill(0)
                  .map((_, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertTable(r + 1, c + 1)
                      }}
                      className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${
                        r < hover.r && c < hover.c
                          ? "bg-slate-200 border-slate-300"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    />
                  )),
              )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 主工具栏 ─── */

const EXPORT_BTNS: {
  format: "docx" | "pdf" | "excel" | "image"
  label: string
  className: string
  title: string
}[] = [
  {
    format: "docx",
    label: "导出word",
    className: "border-slate-200 text-slate-700 hover:bg-slate-50",
    title: "导出 Word (.docx)",
  },
  // { format: 'pdf',   label: 'PDF',  icon: FileDown,         className: 'border-slate-200 text-slate-700 hover:bg-slate-50',        title: '导出 PDF' },
  // { format: 'excel', label: 'XLS',  icon: FileSpreadsheet,  className: 'border-slate-200 text-slate-700 hover:bg-slate-50',        title: '导出 Excel (.xlsx)' },
  // { format: 'image', label: '图片', icon: FileImage,        className: 'border-slate-200 text-slate-700 hover:bg-slate-50',        title: '导出图片 (.png)' },
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
  const { exportStatus, isFullscreen, toggleFullscreen, setUploadStatus } =
    useEditorStore()
  const { exportDoc, upgradeModalOpen, setUpgradeModalOpen } = useExport()
  const isExporting = exportStatus === "loading"
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      editorRef.current?.chain().focus().setImage({ src: base64 }).run()
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
    <div className="flex-shrink-0 border-b border-slate-100 bg-white">
      {/* ── 第一行：格式化按钮 ── */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap">
        {/* 撤销 / 重做 */}
        <ToolBtn
          onClick={() => editorRef.current?.chain().focus().undo().run()}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => editorRef.current?.chain().focus().redo().run()}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolBtn>

        <Divider />

        {/* 加粗 / 斜体 / 下划线 / 删除线 */}
        <ToolBtn
          onClick={() => editorRef.current?.chain().focus().toggleBold().run()}
          active={e?.isActive("bold")}
          title="加粗 (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleItalic().run()
          }
          active={e?.isActive("italic")}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleUnderline().run()
          }
          active={e?.isActive("underline")}
          title="下划线 (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleStrike().run()
          }
          active={e?.isActive("strike")}
          title="删除线"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>

        <Divider />

        {/* 标题 */}
        <HeadingDropdown editorRef={editorRef} />

        <Divider />

        {/* 列表 */}
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleBulletList().run()
          }
          active={e?.isActive("bulletList")}
          title="无序列表"
        >
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleOrderedList().run()
          }
          active={e?.isActive("orderedList")}
          title="有序列表"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>

        <Divider />

        {/* 引用块 */}
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleBlockquote().run()
          }
          active={e?.isActive("blockquote")}
          title="引用块"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* 代码块 */}
        <ToolBtn
          onClick={() =>
            editorRef.current?.chain().focus().toggleCodeBlock().run()
          }
          active={e?.isActive("codeBlock")}
          title="代码块"
        >
          <Code2 className="w-3.5 h-3.5" />
        </ToolBtn>

        <Divider />

        {/* 表格 */}
        <TablePicker editorRef={editorRef} />

        {/* LaTeX 公式 */}
        <MathFormulaDialog
          editorRef={editorRef}
          editingFormula={editingFormula}
          onClearEdit={onClearEdit}
        />

        {/* 插入图片 - 支持本地上传 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="插入图片">
          <ImageIcon className="w-3.5 h-3.5" />
        </ToolBtn>

        <Divider />

        {/* 清空 */}
        <ToolBtn onClick={onClear} title="清空内容">
          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
        </ToolBtn>

        <div className="ml-auto">
          <ToolBtn
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全屏" : "全屏编辑"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </ToolBtn>
        </div>
      </div>

      {/* ── 第二行：导出 ── */}
      <div className="relative flex items-center justify-center gap-2 border-t border-slate-50 px-3 py-1.5 bg-white">
        <span className="text-xs text-amber-600 font-medium">直接粘贴大模型生成文字到下方</span>
        <div className="absolute right-3 flex items-center gap-1.5">
          {EXPORT_BTNS.map(
            ({ format, label, className, title }) => (
              <button
                key={format}
                onClick={() => exportDoc(format)}
                disabled={isExporting}
                title={title}
                className={`
                flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5
                text-xs font-medium text-slate-700 transition-all hover:bg-slate-200
                disabled:cursor-not-allowed disabled:opacity-50
                ${className}
              `}
              >
                <span>{label}</span>
              </button>
            ),
          )}
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

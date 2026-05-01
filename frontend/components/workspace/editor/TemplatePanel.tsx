"use client"

import { useEffect, useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Copy, Info, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useEditorStore } from "@/store/editorStore"
import { editorService } from "@/lib/api/editor"
import type {
  TemplateDefinition,
  StyleSlotConfig,
} from "@/types/editor-template"

/* ─── 常量 ─── */
const KIND_LABELS: Record<string, string> = {
  gov_doc: "公文",
  notice: "通知",
  report: "报告",
  lesson_plan: "教案",
  general: "通用",
  custom: "自定义",
}

const PAPER_SIZES = ["A4", "B5", "16K", "Letter"]
const INDENT_OPTIONS = [
  { value: 0, label: "无" },
  { value: 2, label: "2字符" },
  { value: 4, label: "4字符" },
]
const ALIGN_OPTIONS: { value: StyleSlotConfig["align"]; label: string }[] = [
  { value: "left", label: "左" },
  { value: "center", label: "中" },
  { value: "right", label: "右" },
  { value: "justify", label: "两端" },
]

/* ─── 小组件 ─── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </h3>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-24 flex-shrink-0 text-xs text-slate-500">{label}</span>
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled,
}: {
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
      />
      {unit && <span className="text-xs text-slate-400">{unit}</span>}
    </div>
  )
}

function Select<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ─── 样式槽位行 ─── */
function StyleSlotRow({
  slotKey,
  slot,
  availableFonts,
  editable,
  fontSizeRange,
  onChange,
  onBoldToggle,
}: {
  slotKey: string
  slot: StyleSlotConfig
  availableFonts: { id: string; name: string }[]
  editable: boolean
  fontSizeRange: { min: number; max: number }
  onChange: (patch: Record<string, unknown>) => void
  onBoldToggle?: () => void
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{slot.label}</span>
        {slot.bold !== undefined && (
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              if (editable && onBoldToggle) {
                onBoldToggle()
              }
            }}
            disabled={!editable}
            className={`rounded px-1.5 py-0.5 text-xs font-bold transition-colors ${
              slot.bold
                ? "bg-slate-700 text-white"
                : "border border-slate-200 text-slate-500 hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            B
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* 字体 */}
        <select
          value={slot.fontFamily ?? ""}
          onChange={(e) => editable && onChange({ fontFamily: e.target.value })}
          disabled={!editable}
          className="min-w-[110px] flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {availableFonts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        {/* 字号 */}
        <NumberInput
          value={slot.fontSizePt}
          onChange={(v) => editable && onChange({ fontSizePt: v })}
          min={fontSizeRange.min}
          max={fontSizeRange.max}
          step={0.5}
          unit="pt"
          disabled={!editable}
        />
        {/* 对齐 */}
        {slot.align !== undefined && (
          <select
            value={slot.align ?? "left"}
            onChange={(e) =>
              editable &&
              onChange({ align: e.target.value as StyleSlotConfig["align"] })
            }
            disabled={!editable}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {ALIGN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value ?? ""}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

/* ─── 主面板 ─── */
export function TemplatePanel() {
  const {
    templates,
    availableFonts,
    currentTemplate,
    currentDocumentId,
    templatePanelOpen,
    draftTemplateConfig,
    setTemplates,
    setAvailableFonts,
    setCurrentTemplate,
    updateDraftStyle,
    updateDraftLayout,
    closeTemplatePanel,
    applyDraftTemplate,
    editorInstance,
  } = useEditorStore()

  const [activeSection, setActiveSection] = useState<"styles" | "layout">(
    "styles",
  )
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  /* 加载模板和字体列表 */
  useEffect(() => {
    if (!templatePanelOpen) return
    if ((templates ?? []).length > 0) return
    setLoadingTemplates(true)
    Promise.all([editorService.getTemplates(), editorService.getFonts()])
      .then(([tpls, fonts]) => {
        setTemplates(tpls as any)
        setAvailableFonts(fonts)
      })
      .catch(() => toast.error("模板列表加载失败"))
      .finally(() => setLoadingTemplates(false))
  }, [templatePanelOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTemplate = useCallback(
    (tpl: TemplateDefinition) => {
      setCurrentTemplate(tpl as any)
    },
    [setCurrentTemplate],
  )

  const handleDuplicate = useCallback(
    async (tpl: TemplateDefinition) => {
      try {
        const copied = await editorService.duplicateTemplate(tpl.id)
        setTemplates([...(templates ?? []), copied as any])
        setCurrentTemplate(copied as any)
        toast.success("已复制为「" + copied.name + "」")
      } catch {
        toast.error("复制失败")
      }
    },
    [templates, setTemplates, setCurrentTemplate],
  )

  const handleApply = useCallback(async () => {
    if (!currentTemplate || !draftTemplateConfig) return

    let appliedTemplate = currentTemplate
    if (currentTemplate.source === "user") {
      try {
        const saved = await editorService.updateTemplate(currentTemplate.id, {
          ...currentTemplate,
          config: structuredClone(draftTemplateConfig),
        })
        appliedTemplate = saved as any
        setTemplates(
          (templates ?? []).map((tpl) =>
            tpl.id === saved.id ? (saved as any) : tpl,
          ),
        )
        setCurrentTemplate(saved as any)
      } catch {
        toast.error("模板配置保存失败")
        return
      }
    }

    applyDraftTemplate()
    const { templateBinding } = useEditorStore.getState()
    if (currentDocumentId && templateBinding) {
      void editorService
        .saveDocumentTemplateBinding(currentDocumentId, templateBinding)
        .catch(() => {
          toast.error("模板快照保存失败")
        })
    }
    toast.success(`已应用模板：${appliedTemplate.name ?? ""}`)
  }, [
    applyDraftTemplate,
    currentTemplate,
    draftTemplateConfig,
    currentDocumentId,
    templates,
    setTemplates,
    setCurrentTemplate,
  ])

  const handleDelete = useCallback(
    async (tpl: TemplateDefinition) => {
      if (tpl.source !== "user") return
      try {
        await editorService.deleteTemplate(tpl.id)
        const nextTemplates = (templates ?? []).filter(
          (item) => item.id !== tpl.id,
        )
        setTemplates(nextTemplates)
        if (currentTemplate?.id === tpl.id) {
          const fallback =
            nextTemplates.find((item) => item.source === "builtin") ??
            nextTemplates[0] ??
            null
          setCurrentTemplate(fallback as any)
        }
        toast.success("模板已删除")
      } catch {
        toast.error("删除失败")
      }
    },
    [templates, setTemplates, currentTemplate, setCurrentTemplate],
  )

  /* ─── 派生状态（必须在 hooks 之后、early return 之前） ─── */
  const builtinTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.source === "builtin"),
    [templates],
  )
  const userTemplates = useMemo(
    () => (templates ?? []).filter((t) => t.source === "user"),
    [templates],
  )
  const allTemplates = useMemo(
    () => [...builtinTemplates, ...userTemplates],
    [builtinTemplates, userTemplates],
  )

  if (!templatePanelOpen) return null

  const isBuiltin = currentTemplate?.source === "builtin"
  const editableSlots = currentTemplate?.capabilities?.editableStyleSlots ?? []
  const constraints = currentTemplate?.constraints
  const fontSizeRange = constraints?.fontSizeRangePt ?? { min: 8, max: 72 }
  const formSections = currentTemplate?.schema?.formSchema?.sections ?? []
  const stylesSection = formSections.find((s) => s.key === "styles")
  const styleKeys: string[] = stylesSection?.styleKeys ?? editableSlots

  const panel = (
    <div className="fixed inset-0 z-[9000] flex">
      {/* 遮罩 */}
      <div className="flex-1 bg-black/20" onClick={closeTemplatePanel} />

      {/* 面板主体 */}
      <div className="flex h-full w-[480px] flex-col bg-white shadow-2xl">
        {/* ── 头部 ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">模板设置</h2>
            {currentTemplate && (
              <p className="mt-0.5 text-xs text-slate-400">
                {currentTemplate.name} ·{" "}
                {KIND_LABELS[currentTemplate.kind] ?? currentTemplate.kind} ·{" "}
                {currentTemplate.source === "builtin" ? "内置" : "我的模板"}
              </p>
            )}
          </div>
          <button
            onClick={closeTemplatePanel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 模板选择区 ── */}
        <div className="flex-shrink-0 border-b border-slate-100 px-5 py-3">
          {loadingTemplates ? (
            <div className="py-2 text-center text-xs text-slate-400">
              加载中…
            </div>
          ) : (
            <div className="template-panel-scroll max-h-52 space-y-1 overflow-y-auto">
              {builtinTemplates.length > 0 && (
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  内置模板
                </p>
              )}
              {builtinTemplates.map((tpl) => (
                <TemplateRow
                  key={tpl.id}
                  tpl={tpl}
                  active={currentTemplate?.id === tpl.id}
                  onSelect={() => handleSelectTemplate(tpl)}
                  onDuplicate={() => handleDuplicate(tpl)}
                  onDelete={() => handleDelete(tpl)}
                />
              ))}
              {userTemplates.length > 0 && (
                <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  我的模板
                </p>
              )}
              {userTemplates.map((tpl) => (
                <TemplateRow
                  key={tpl.id}
                  tpl={tpl}
                  active={currentTemplate?.id === tpl.id}
                  onSelect={() => handleSelectTemplate(tpl)}
                  onDuplicate={() => handleDuplicate(tpl)}
                  onDelete={() => handleDelete(tpl)}
                />
              ))}
              {allTemplates.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">
                  暂无可用模板
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Tab 切换 ── */}
        {currentTemplate && (
          <div className="flex flex-shrink-0 border-b border-slate-100">
            {(["styles", "layout"] as const).map((key) => {
              const labels = { styles: "字体字号", layout: "页面布局" }
              return (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeSection === key
                      ? "border-b-2 border-slate-700 text-slate-800"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {labels[key]}
                </button>
              )
            })}
          </div>
        )}

        {/* ── 设置内容区 ── */}
        <div className="template-panel-scroll flex-1 overflow-y-auto px-5 py-4">
          {!currentTemplate && (
            <div className="py-12 text-center text-sm text-slate-400">
              请先在上方选择一个模板
            </div>
          )}

          {/* 字体字号 Tab */}
          {currentTemplate &&
            activeSection === "styles" &&
            draftTemplateConfig && (
              <div className="space-y-2">
                {isBuiltin && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    内置模板不可直接修改，请先复制为自己的模板再调整
                  </div>
                )}
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    预览字体为近似效果，导出以服务端实际字体为准
                  </p>
                </div>
                {styleKeys.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    此模板无可配置的样式槽位
                  </p>
                ) : (
                  styleKeys.map((sk) => {
                    const slot = draftTemplateConfig.styles[sk]
                    if (!slot) return null

                    const editable = !isBuiltin && editableSlots.includes(sk)

                    // 加粗功能：只更新模板配置，由 CSS 样式控制显示
                    const handleBoldToggle = () => {
                      if (!editable) return
                      updateDraftStyle(sk, { bold: !slot.bold })
                    }

                    return (
                      <StyleSlotRow
                        key={sk}
                        slotKey={sk}
                        slot={slot}
                        availableFonts={availableFonts}
                        editable={editable}
                        fontSizeRange={fontSizeRange}
                        onChange={(patch) => {
                          updateDraftStyle(sk, patch)
                        }}
                        onBoldToggle={handleBoldToggle}
                      />
                    )
                  })
                )}
              </div>
            )}

          {/* 布局 Tab */}
          {currentTemplate &&
            activeSection === "layout" &&
            draftTemplateConfig && (
              <div>
                {isBuiltin && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    内置模板不可直接修改，请先复制为自己的模板再调整
                  </div>
                )}
                <SectionTitle>纸张与页边距</SectionTitle>
                <FieldRow label="纸张大小">
                  <Select
                    value={draftTemplateConfig.layout.paperSize}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("paperSize", v)
                    }
                    options={PAPER_SIZES.map((s) => ({ value: s, label: s }))}
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="页边距上">
                  <NumberInput
                    value={draftTemplateConfig.layout.marginTopMm}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("marginTopMm", v)
                    }
                    min={5}
                    max={100}
                    unit="mm"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="页边距下">
                  <NumberInput
                    value={draftTemplateConfig.layout.marginBottomMm}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("marginBottomMm", v)
                    }
                    min={5}
                    max={100}
                    unit="mm"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="页边距左">
                  <NumberInput
                    value={draftTemplateConfig.layout.marginLeftMm}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("marginLeftMm", v)
                    }
                    min={5}
                    max={100}
                    unit="mm"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="页边距右">
                  <NumberInput
                    value={draftTemplateConfig.layout.marginRightMm}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("marginRightMm", v)
                    }
                    min={5}
                    max={100}
                    unit="mm"
                    disabled={isBuiltin}
                  />
                </FieldRow>

                <div className="my-3 border-t border-slate-100" />
                <SectionTitle>段落</SectionTitle>
                <FieldRow label="行间距">
                  <NumberInput
                    value={draftTemplateConfig.layout.defaultLineHeight}
                    onChange={(v) =>
                      !isBuiltin && updateDraftLayout("defaultLineHeight", v)
                    }
                    min={1}
                    max={5}
                    step={0.1}
                    unit="倍"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="段前间距">
                  <NumberInput
                    value={
                      draftTemplateConfig.layout.defaultParagraphSpacingBeforePt
                    }
                    onChange={(v) =>
                      !isBuiltin &&
                      updateDraftLayout("defaultParagraphSpacingBeforePt", v)
                    }
                    min={0}
                    max={72}
                    unit="pt"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="段后间距">
                  <NumberInput
                    value={
                      draftTemplateConfig.layout.defaultParagraphSpacingAfterPt
                    }
                    onChange={(v) =>
                      !isBuiltin &&
                      updateDraftLayout("defaultParagraphSpacingAfterPt", v)
                    }
                    min={0}
                    max={72}
                    unit="pt"
                    disabled={isBuiltin}
                  />
                </FieldRow>
                <FieldRow label="首行缩进">
                  <Select
                    value={
                      draftTemplateConfig.layout.defaultFirstLineIndentChars ??
                      0
                    }
                    onChange={(v) =>
                      !isBuiltin &&
                      updateDraftLayout(
                        "defaultFirstLineIndentChars",
                        Number(v),
                      )
                    }
                    options={INDENT_OPTIONS}
                    disabled={isBuiltin}
                  />
                </FieldRow>
              </div>
            )}
        </div>

        {/* ── 底部操作区 ── */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={closeTemplatePanel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            disabled={!currentTemplate}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            应用模板
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(panel, document.body)
}

/* ─── 模板行 ─── */
function TemplateRow({
  tpl,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  tpl: TemplateDefinition
  active: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const kindLabel = KIND_LABELS[tpl.kind] ?? tpl.kind
  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
        active ? "bg-slate-800 text-white" : "hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate text-xs font-medium ${active ? "text-white" : "text-slate-700"}`}
          >
            {tpl.name}
          </p>
          <span
            className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
              active
                ? "bg-slate-600 text-slate-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {kindLabel}
          </span>
        </div>
        {tpl.description && (
          <p
            className={`mt-0.5 truncate text-[10px] ${active ? "text-slate-300" : "text-slate-400"}`}
          >
            {tpl.description}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDuplicate()
        }}
        title="复制为我的模板"
        className={`ml-2 flex-shrink-0 rounded p-1 transition-colors ${
          active
            ? "text-slate-300 hover:text-white"
            : "text-slate-300 hover:text-slate-600"
        }`}
      >
        <Copy className="h-3 w-3" />
      </button>
      {tpl.source === "user" && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete()
          }}
          title="删除模板"
          className={`ml-1 flex-shrink-0 rounded p-1 transition-colors ${
            active
              ? "text-slate-300 hover:text-white"
              : "text-slate-300 hover:text-red-500"
          }`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

"use client"

import { useEffect, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Palette,
  AlignLeft,
  List,
  LayoutTemplate,
  Hash,
  Table,
  Image,
  Code2,
  Type,
} from "lucide-react"
import { toast } from "sonner"
import { useEditorStore } from "@/store/editorStore"
import { editorService } from "@/lib/api/editor"
import type { TemplateDefinition } from "@/types/editor-template"
import { TemplateList } from "./template/TemplateList"
import { StyleEditor } from "./template/StyleEditor"
import { LayoutEditor } from "./template/LayoutEditor"
import { TemplatePreview } from "./template/TemplatePreview"
import { ListStyleEditor } from "./template/ListStyleEditor"
import { CodeBlockEditor } from "./template/CodeBlockEditor"
import { TableStyleEditor } from "./template/TableStyleEditor"
import { ImageStyleEditor } from "./template/ImageStyleEditor"
import { HeaderFooterEditor } from "./template/HeaderFooterEditor"
import { PageNumberEditor } from "./template/PageNumberEditor"
import { HeadingStyleEditor } from "./template/HeadingStyleEditor"
import { PageStyleEditor } from "./template/PageStyleEditor"
import { ParagraphStyleEditor } from "./template/ParagraphStyleEditor"

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
    updateDraftLayoutFull,
    updateDraftListStyles,
    updateDraftCodeBlockStyles,
    updateDraftTableStyles,
    updateDraftImageStyles,
    updateDraftHeaderFooter,
    updateDraftHeadingStyles,
    updateDraftParagraphStyles,
    updateDraftEnglishFont,
    closeTemplatePanel,
    applyDraftTemplate,
    editorInstance,
  } = useEditorStore()

  const [activeSection, setActiveSection] = useState<
    | "styles"
    | "headingStyles"
    | "layout"
    | "paragraph"
    | "listStyles"
    | "table"
    | "codeBlock"
    | "image"
    | "pageNumber"
  >("styles")
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

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

  const handleStyleChange = useCallback(
    (slotKey: string, patch: Record<string, unknown>) => {
      if (slotKey === "__englishFont__") {
        updateDraftEnglishFont(patch)
      } else {
        updateDraftStyle(slotKey, patch)
      }
    },
    [updateDraftStyle, updateDraftEnglishFont],
  )

  const handleHeadingStylesChange = useCallback(
    (headingLevel: string, patch: Record<string, unknown>) => {
      updateDraftHeadingStyles(headingLevel, patch)
    },
    [updateDraftHeadingStyles],
  )

  const handleLayoutChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftLayoutFull(patch)
    },
    [updateDraftLayoutFull],
  )

  const handleListStylesChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftListStyles(patch)
    },
    [updateDraftListStyles],
  )

  const handleCodeBlockStylesChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftCodeBlockStyles(patch)
    },
    [updateDraftCodeBlockStyles],
  )

  const handleTableStylesChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftTableStyles(patch)
    },
    [updateDraftTableStyles],
  )

  const handleImageStylesChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftImageStyles(patch)
    },
    [updateDraftImageStyles],
  )

  const handleHeaderFooterChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftHeaderFooter(patch)
    },
    [updateDraftHeaderFooter],
  )

  const handleParagraphStylesChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftParagraphStyles(patch)
    },
    [updateDraftParagraphStyles],
  )

  const handlePageNumberChange = useCallback(
    (patch: Record<string, unknown>) => {
      updateDraftLayoutFull({
        pageNumber: { ...draftTemplateConfig?.layout?.pageNumber, ...patch },
      })
    },
    [updateDraftLayoutFull, draftTemplateConfig],
  )

  if (!templatePanelOpen) return null

  /* ─── 侧边导航数据结构 ─── */
  type SectionKey =
    | "styles"
    | "headingStyles"
    | "paragraph"
    | "listStyles"
    | "layout"
    | "pageNumber"
    | "table"
    | "image"
    | "codeBlock"

  interface NavItem {
    key: SectionKey
    label: string
    icon: React.ComponentType<{ className?: string }>
  }

  const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
    {
      label: "文字",
      items: [
        { key: "styles", label: "默认样式", icon: Palette },
        { key: "headingStyles", label: "标题样式", icon: Type },
        { key: "paragraph", label: "段落样式", icon: AlignLeft },
        { key: "listStyles", label: "列表样式", icon: List },
      ],
    },
    {
      label: "页面",
      items: [
        { key: "layout", label: "页面布局", icon: LayoutTemplate },
        { key: "pageNumber", label: "页码", icon: Hash },
      ],
    },
    {
      label: "元素",
      items: [
        { key: "table", label: "表格", icon: Table },
        { key: "image", label: "图片", icon: Image },
        { key: "codeBlock", label: "代码块", icon: Code2 },
      ],
    },
  ]

  const KIND_LABELS: Record<string, string> = {
    gov_doc: "公文",
    notice: "通知",
    report: "报告",
    lesson_plan: "教案",
    general: "通用",
    custom: "自定义",
  }

  /* ─── 内置模板徽章 ─── */
  function BuiltinBadge() {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-200">
        <span className="h-1 w-1 rounded-full bg-amber-400" />
        内置
      </span>
    )
  }

  const panel = (
    <div className="fixed inset-0 z-[9000] flex">
      {/* 遮罩 */}
      <div className="flex-1 bg-black/20" onClick={closeTemplatePanel} />

      {/* 面板主体 */}
      <div className="flex h-full w-[680px] flex-col bg-white shadow-2xl">
        {/* ── 头部 ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">模板设置</h2>
            {currentTemplate && (
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span>{currentTemplate.name}</span>
                <span className="text-slate-300">·</span>
                <span>
                  {KIND_LABELS[currentTemplate.kind] ?? currentTemplate.kind}
                </span>
                <span className="text-slate-300">·</span>
                {currentTemplate.source === "builtin" ? (
                  <BuiltinBadge />
                ) : (
                  <span className="text-emerald-600">我的模板</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="mx-2 h-4 w-px bg-slate-200" />

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showPreview
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {showPreview ? "隐藏预览" : "显示预览"}
            </button>
            <button
              onClick={closeTemplatePanel}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 模板选择区 ── */}
        <div className="flex-shrink-0 border-b border-slate-100 px-5 py-3">
          <TemplateList
            templates={templates ?? []}
            currentTemplateId={currentTemplate?.id}
            onSelect={handleSelectTemplate}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            loading={loadingTemplates}
          />
        </div>

        {/* ── 内容区：左侧导航 + 右侧配置 ── */}
        {currentTemplate && draftTemplateConfig && (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* 左侧：导航栏 */}
            <div className="flex w-44 flex-shrink-0 flex-col border-r border-slate-100 overflow-y-auto template-panel-scroll bg-slate-50/50">
              <div className="py-4">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {group.label}
                    </p>
                    <nav className="space-y-0.5 px-1">
                      {group.items.map(({ key, label, icon: Icon }) => {
                        const active = activeSection === key
                        return (
                          <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`
                              group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-100
                              ${
                                active
                                  ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/60"
                                  : "text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm"
                              }
                            `}
                          >
                            <Icon
                              className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${active ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"}`}
                            />
                            {label}
                          </button>
                        )
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：配置面板（可滚动） */}
            <div className="min-w-0 flex-1 overflow-y-auto template-panel-scroll">
              <div className="px-6 py-5">
                {activeSection === "styles" && (
                  <StyleEditor
                    template={currentTemplate}
                    config={draftTemplateConfig}
                    fonts={availableFonts}
                    onStyleChange={handleStyleChange}
                  />
                )}
                {activeSection === "headingStyles" && (
                  <HeadingStyleEditor
                    headingStyles={draftTemplateConfig.headingStyles}
                    fonts={availableFonts}
                    disabled={currentTemplate.source === "builtin"}
                    onChange={handleHeadingStylesChange}
                  />
                )}
                {activeSection === "layout" && (
                  <>
                    <LayoutEditor
                      template={currentTemplate}
                      layout={draftTemplateConfig.layout}
                      onLayoutChange={handleLayoutChange}
                    />
                    <div className="mt-6">
                      <HeaderFooterEditor
                        headerFooter={draftTemplateConfig.layout.headerFooter}
                        fonts={availableFonts}
                        onChange={handleHeaderFooterChange}
                        disabled={currentTemplate.source === "builtin"}
                      />
                    </div>
                  </>
                )}
                {activeSection === "listStyles" && (
                  <ListStyleEditor
                    listStyles={draftTemplateConfig.listStyles}
                    fonts={availableFonts}
                    onChange={handleListStylesChange}
                    disabled={currentTemplate.source === "builtin"}
                  />
                )}
                {activeSection === "table" && (
                  <TableStyleEditor
                    tableStyles={draftTemplateConfig.tableStyles}
                    fonts={availableFonts}
                    onChange={handleTableStylesChange}
                    disabled={currentTemplate.source === "builtin"}
                  />
                )}
                {activeSection === "codeBlock" && (
                  <CodeBlockEditor
                    codeBlockStyles={draftTemplateConfig.codeBlockStyles}
                    fonts={availableFonts}
                    onChange={handleCodeBlockStylesChange}
                    disabled={currentTemplate.source === "builtin"}
                  />
                )}
                {activeSection === "image" && (
                  <ImageStyleEditor
                    imageStyles={draftTemplateConfig.imageStyles}
                    onChange={handleImageStylesChange}
                    disabled={currentTemplate.source === "builtin"}
                  />
                )}
                {activeSection === "paragraph" && (
                  <ParagraphStyleEditor
                    paragraphStyles={draftTemplateConfig.paragraphStyles}
                    layout={draftTemplateConfig.layout}
                    editable={currentTemplate.source !== "builtin"}
                    onParagraphChange={handleParagraphStylesChange}
                    onLayoutChange={handleLayoutChange}
                  />
                )}
                {activeSection === "pageNumber" && (
                  <PageNumberEditor
                    pageNumber={draftTemplateConfig.layout.pageNumber}
                    onChange={handlePageNumberChange}
                    disabled={currentTemplate.source === "builtin"}
                  />
                )}
              </div>
            </div>

            {/* 右侧：预览区 */}
            {showPreview && (
              <div className="flex w-64 flex-shrink-0 flex-col overflow-y-auto template-panel-scroll border-l border-slate-100">
                <TemplatePreview config={draftTemplateConfig} />
              </div>
            )}
          </div>
        )}

        {!currentTemplate && (
          <div className="flex-1 overflow-y-auto px-5 py-12 text-center text-sm text-slate-400">
            请先在上方选择一个模板
          </div>
        )}

        {/* ── 底部操作区 ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 px-5 py-3">
          {currentTemplate?.source === "builtin" && (
            <p className="text-xs text-amber-600">
              内置模板仅支持查看，如需修改请复制后编辑
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={closeTemplatePanel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={!currentTemplate}
              className="rounded-lg bg-slate-800 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              应用模板
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(panel, document.body)
}

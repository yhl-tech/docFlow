'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '@/store/editorStore'
import { editorService } from '@/lib/api/editor'
import type { TemplateDefinition } from '@/types/editor-template'
import { TemplateList } from './template/TemplateList'
import { StyleEditor } from './template/StyleEditor'
import { LayoutEditor } from './template/LayoutEditor'
import { TemplatePreview } from './template/TemplatePreview'
import { ListStyleEditor } from './template/ListStyleEditor'
import { CodeBlockEditor } from './template/CodeBlockEditor'
import { TableStyleEditor } from './template/TableStyleEditor'
import { ImageStyleEditor } from './template/ImageStyleEditor'

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
    closeTemplatePanel,
    applyDraftTemplate,
    editorInstance,
  } = useEditorStore()

  const [activeSection, setActiveSection] = useState<
    'styles' | 'layout' | 'listStyles' | 'codeBlock' | 'table' | 'image'
  >('styles')
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
      .catch(() => toast.error('模板列表加载失败'))
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
        toast.success('已复制为「' + copied.name + '」')
      } catch {
        toast.error('复制失败')
      }
    },
    [templates, setTemplates, setCurrentTemplate],
  )

  const handleDelete = useCallback(
    async (tpl: TemplateDefinition) => {
      if (tpl.source !== 'user') return
      try {
        await editorService.deleteTemplate(tpl.id)
        const nextTemplates = (templates ?? []).filter((item) => item.id !== tpl.id)
        setTemplates(nextTemplates)
        if (currentTemplate?.id === tpl.id) {
          const fallback =
            nextTemplates.find((item) => item.source === 'builtin') ??
            nextTemplates[0] ??
            null
          setCurrentTemplate(fallback as any)
        }
        toast.success('模板已删除')
      } catch {
        toast.error('删除失败')
      }
    },
    [templates, setTemplates, currentTemplate, setCurrentTemplate],
  )

  const handleApply = useCallback(async () => {
    if (!currentTemplate || !draftTemplateConfig) return

    let appliedTemplate = currentTemplate
    if (currentTemplate.source === 'user') {
      try {
        const saved = await editorService.updateTemplate(currentTemplate.id, {
          ...currentTemplate,
          config: structuredClone(draftTemplateConfig),
        })
        appliedTemplate = saved as any
        setTemplates(
          (templates ?? []).map((tpl) => (tpl.id === saved.id ? (saved as any) : tpl)),
        )
        setCurrentTemplate(saved as any)
      } catch {
        toast.error('模板配置保存失败')
        return
      }
    }

    applyDraftTemplate()
    const { templateBinding } = useEditorStore.getState()
    if (currentDocumentId && templateBinding) {
      void editorService
        .saveDocumentTemplateBinding(currentDocumentId, templateBinding)
        .catch(() => {
          toast.error('模板快照保存失败')
        })
    }
    toast.success(`已应用模板：${appliedTemplate.name ?? ''}`)
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
      updateDraftStyle(slotKey, patch)
    },
    [updateDraftStyle],
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

  if (!templatePanelOpen) return null

  const KIND_LABELS: Record<string, string> = {
    gov_doc: '公文',
    notice: '通知',
    report: '报告',
    lesson_plan: '教案',
    general: '通用',
    custom: '自定义',
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
              <p className="mt-0.5 text-xs text-slate-400">
                {currentTemplate.name} · {KIND_LABELS[currentTemplate.kind] ?? currentTemplate.kind} ·
                {currentTemplate.source === 'builtin' ? '内置' : '我的模板'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showPreview
                  ? 'bg-slate-800 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {showPreview ? '隐藏预览' : '显示预览'}
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

        {/* ── 内容区：预览 + 编辑 ── */}
        {currentTemplate && draftTemplateConfig && (
          <div className="flex flex-1 overflow-hidden">
            {/* 左侧：编辑区 */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Tab 切换 ── */}
              <div className="flex flex-shrink-0 border-b border-slate-100">
                {([
                  { key: 'styles' as const, label: '字体字号' },
                  { key: 'layout' as const, label: '页面布局' },
                  { key: 'listStyles' as const, label: '列表样式' },
                  { key: 'table' as const, label: '表格样式' },
                  { key: 'codeBlock' as const, label: '代码块' },
                  { key: 'image' as const, label: '图片样式' },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      activeSection === key
                        ? 'border-b-2 border-slate-700 text-slate-800'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── 设置内容区 ── */}
              <div className="template-panel-scroll flex-1 overflow-y-auto px-5 py-4">
                {activeSection === 'styles' && (
                  <StyleEditor
                    template={currentTemplate}
                    config={draftTemplateConfig}
                    fonts={availableFonts}
                    onStyleChange={handleStyleChange}
                  />
                )}
                {activeSection === 'layout' && (
                  <LayoutEditor
                    template={currentTemplate}
                    layout={draftTemplateConfig.layout}
                    fonts={availableFonts}
                    onLayoutChange={handleLayoutChange}
                  />
                )}
                {activeSection === 'listStyles' && (
                  <ListStyleEditor
                    listStyles={draftTemplateConfig.listStyles}
                    fonts={availableFonts}
                    onChange={handleListStylesChange}
                    disabled={currentTemplate.source === 'builtin'}
                  />
                )}
                {activeSection === 'table' && (
                  <TableStyleEditor
                    tableStyles={draftTemplateConfig.tableStyles}
                    fonts={availableFonts}
                    onChange={handleTableStylesChange}
                    disabled={currentTemplate.source === 'builtin'}
                  />
                )}
                {activeSection === 'codeBlock' && (
                  <CodeBlockEditor
                    codeBlockStyles={draftTemplateConfig.codeBlockStyles}
                    fonts={availableFonts}
                    onChange={handleCodeBlockStylesChange}
                    disabled={currentTemplate.source === 'builtin'}
                  />
                )}
                {activeSection === 'image' && (
                  <ImageStyleEditor
                    imageStyles={draftTemplateConfig.imageStyles}
                    onChange={handleImageStylesChange}
                    disabled={currentTemplate.source === 'builtin'}
                  />
                )}
              </div>
            </div>

            {/* 右侧：预览区 */}
            {showPreview && (
              <div className="w-64 flex-shrink-0 border-l border-slate-100">
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

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}

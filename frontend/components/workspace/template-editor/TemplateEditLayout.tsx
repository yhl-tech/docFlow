'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { editorService } from '@/lib/api/editor'
import { useEditorStore } from '@/store/editorStore'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'
import type { TemplateDefinition, TemplateConfig, FontInfo } from '@/types/editor-template'
import { TemplateEditNav, type EditSection } from './TemplateEditNav'
import { TemplateEditPanel } from './TemplateEditPanel'
import { TemplateEditPreview } from './TemplateEditPreview'

interface TemplateEditLayoutProps {
  templateId: string
}

export function TemplateEditLayout({ templateId }: TemplateEditLayoutProps) {
  const { openTemplateEditor, setTemplateEditMeta } = useWorkspaceNavStore()
  const [template, setTemplate] = useState<TemplateDefinition | null>(null)
  const [draftConfig, setDraftConfig] = useState<TemplateConfig | null>(null)
  const [fonts, setFonts] = useState<FontInfo[]>([])
  const [activeSection, setActiveSection] = useState<EditSection>('styles')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      editorService.getTemplateDetail(templateId),
      editorService.getFonts(),
    ])
      .then(([tpl, fontList]) => {
        setTemplate(tpl as any)
        setDraftConfig(structuredClone((tpl as any).config ?? null))
        setFonts(fontList)
      })
      .catch(() => toast.error('加载模板失败'))
      .finally(() => setIsLoading(false))
  }, [templateId])

  const handleChange = useCallback((patch: Partial<TemplateConfig>) => {
    setDraftConfig((prev) => prev ? { ...prev, ...patch } : prev)
  }, [])

  const handleSave = useCallback(async () => {
    if (!template || !draftConfig || template.source !== 'user') return
    setIsSaving(true)
    try {
      const saved = await editorService.updateTemplate(templateId, {
        ...template,
        config: structuredClone(draftConfig),
      } as any)
      setTemplate(saved as any)
      toast.success('模板已保存')
      const { templates, setTemplates, currentTemplate, setCurrentTemplate } = useEditorStore.getState()
      const updated = templates.map((t) => t.id === saved.id ? (saved as any) : t)
      setTemplates(updated)
      if (currentTemplate?.id === saved.id) setCurrentTemplate(saved as any)
    } catch {
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }, [template, draftConfig, templateId])

  const handleDuplicateAndEdit = useCallback(async () => {
    if (!template) return
    try {
      const copy = await editorService.duplicateTemplate(templateId)
      toast.success(`已复制为「${copy.name}」`)
      openTemplateEditor(copy.id)
    } catch {
      toast.error('复制失败')
    }
  }, [template, templateId, openTemplateEditor])

  // Register header meta so WorkspaceHeader can show the right title and save button
  useEffect(() => {
    if (!template) return
    const isBuiltin = template.source === 'builtin'
    setTemplateEditMeta({
      title: (template as any).name ?? '编辑模板',
      isBuiltin,
      isSaving,
      onSave: handleSave,
    })
  }, [template, isSaving, handleSave, setTemplateEditMeta])

  // Clear meta on unmount
  useEffect(() => {
    return () => setTemplateEditMeta(null)
  }, [setTemplateEditMeta])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        加载中…
      </div>
    )
  }

  if (!template || !draftConfig) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        模板不存在
      </div>
    )
  }

  const isBuiltin = template.source === 'builtin'

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {isBuiltin && (
        <div className="flex shrink-0 items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2">
          <span className="text-xs text-amber-700">内置模板不可修改，可复制后自由编辑</span>
          <button
            onClick={handleDuplicateAndEdit}
            className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
          >
            复制并编辑
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TemplateEditNav activeSection={activeSection} onSelect={setActiveSection} />
        <TemplateEditPanel
          section={activeSection}
          template={template as any}
          config={draftConfig}
          fonts={fonts}
          disabled={isBuiltin}
          onChange={handleChange}
        />
        <TemplateEditPreview config={draftConfig} />
      </div>
    </div>
  )
}

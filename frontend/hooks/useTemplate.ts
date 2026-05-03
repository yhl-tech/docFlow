'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useEditorStore } from '@/store/editorStore'
import { editorService } from '@/lib/api/editor'
import type { TemplateDefinition } from '@/types/editor-template'

/**
 * 模板相关业务 Hook
 *
 * 职责：
 * - 模板选择
 * - 模板复制
 * - 模板删除
 * - 样式配置更新
 * - 布局配置更新
 * - 模板应用
 */
export function useTemplate() {
  const {
    templates,
    currentTemplate,
    templateBinding,
    draftTemplateConfig,
    currentDocumentId,
    setTemplates,
    setCurrentTemplate,
    updateDraftStyle,
    updateDraftLayout,
    applyDraftTemplate,
  } = useEditorStore()

  /** 选择模板 */
  const selectTemplate = useCallback(
    (tpl: TemplateDefinition) => {
      setCurrentTemplate(tpl as any)
    },
    [setCurrentTemplate],
  )

  /** 复制模板 */
  const duplicateTemplate = useCallback(
    async (tpl: TemplateDefinition) => {
      try {
        const copied = await editorService.duplicateTemplate(tpl.id)
        setTemplates([...(templates ?? []), copied as any])
        setCurrentTemplate(copied as any)
        toast.success(`已复制为「${copied.name}」`)
        return copied
      } catch {
        toast.error('复制失败')
        return null
      }
    },
    [templates, setTemplates, setCurrentTemplate],
  )

  /** 删除模板 */
  const deleteTemplate = useCallback(
    async (tpl: TemplateDefinition) => {
      if (tpl.source !== 'user') return false
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
        return true
      } catch {
        toast.error('删除失败')
        return false
      }
    },
    [templates, setTemplates, currentTemplate, setCurrentTemplate],
  )

  /** 更新样式配置 */
  const updateStyle = useCallback(
    (slotKey: string, patch: Record<string, unknown>) => {
      updateDraftStyle(slotKey, patch)
    },
    [updateDraftStyle],
  )

  /** 更新布局配置 */
  const updateLayout = useCallback(
    (field: string, value: unknown) => {
      updateDraftLayout(field, value)
    },
    [updateDraftLayout],
  )

  /** 应用模板 */
  const applyTemplate = useCallback(async () => {
    if (!currentTemplate || !draftTemplateConfig) return false

    // 用户模板先保存
    if (currentTemplate.source === 'user') {
      try {
        const saved = await editorService.updateTemplate(currentTemplate.id, {
          ...currentTemplate,
          config: structuredClone(draftTemplateConfig),
        })
        setTemplates(
          (templates ?? []).map((tpl) => (tpl.id === saved.id ? (saved as any) : tpl)),
        )
        setCurrentTemplate(saved as any)
      } catch {
        toast.error('模板配置保存失败')
        return false
      }
    }

    // 应用到当前文档
    applyDraftTemplate()

    // 持久化快照
    const { templateBinding: binding } = useEditorStore.getState()
    if (currentDocumentId && binding) {
      await editorService
        .saveDocumentTemplateBinding(currentDocumentId, binding)
        .catch(() => {
          toast.error('模板快照保存失败')
        })
    }

    toast.success(`已应用模板：${currentTemplate.name ?? ''}`)
    return true
  }, [
    currentTemplate,
    draftTemplateConfig,
    currentDocumentId,
    templates,
    setTemplates,
    setCurrentTemplate,
    applyDraftTemplate,
  ])

  return {
    // 状态
    templates,
    currentTemplate,
    templateBinding,
    draftTemplateConfig,

    // 操作
    selectTemplate,
    duplicateTemplate,
    deleteTemplate,
    updateStyle,
    updateLayout,
    applyTemplate,
  }
}

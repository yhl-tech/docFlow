'use client'

import { Info } from 'lucide-react'
import type { TemplateDefinition, TemplateConfig } from '@/types/editor-template'
import { StyleSlotRow } from './StyleSlotRow'

interface StyleEditorProps {
  template: TemplateDefinition
  config: TemplateConfig
  fonts: { id: string; name: string }[]
  onStyleChange: (slotKey: string, patch: Record<string, unknown>) => void
}

/**
 * 字体字号编辑器组件
 */
export function StyleEditor({ template, config, fonts, onStyleChange }: StyleEditorProps) {
  const isBuiltin = template.source === 'builtin'
  const editableSlots = template.capabilities?.editableStyleSlots ?? []
  const constraints = template.constraints
  const fontSizeRange = constraints?.fontSizeRangePt ?? { min: 8, max: 72 }
  const formSections = template.schema?.formSchema?.sections ?? []
  const stylesSection = formSections.find((s) => s.key === 'styles')
  const styleKeys: string[] = stylesSection?.styleKeys ?? editableSlots

  return (
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
          const slot = config.styles[sk]
          if (!slot) return null

          const editable = !isBuiltin && editableSlots.includes(sk)

          return (
            <StyleSlotRow
              key={sk}
              slot={slot}
              fonts={fonts}
              editable={editable}
              fontSizeRange={fontSizeRange}
              onChange={(patch) => onStyleChange(sk, patch)}
              onBoldToggle={
                slot.bold !== undefined && editable
                  ? () => onStyleChange(sk, { bold: !slot.bold })
                  : undefined
              }
              onItalicToggle={
                slot.italic !== undefined && editable
                  ? () => onStyleChange(sk, { italic: !slot.italic })
                  : undefined
              }
            />
          )
        })
      )}
    </div>
  )
}

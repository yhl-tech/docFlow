'use client'

import { Info } from 'lucide-react'
import type { LayoutConfig, FontInfo } from '@/types/editor-template'
import { NumberInput } from './StyleSlotRow'

const PAPER_SIZES = ['A4', 'B5', '16K', 'Letter', 'Folio', '8K']
const PAPER_DIRECTIONS = [
  { value: 'portrait', label: '纵向' },
  { value: 'landscape', label: '横向' },
]

interface PageStyleEditorProps {
  layout: LayoutConfig
  editable: boolean
  onLayoutChange: (patch: Record<string, unknown>) => void
}

export function PageStyleEditor({
  layout,
  editable,
  onLayoutChange,
}: PageStyleEditorProps) {
  const handleChange = (field: string, value: unknown) => {
    if (!editable) return
    onLayoutChange({ [field]: value })
  }

  return (
    <div>
      {editable === false && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          内置模板不可直接修改，请先复制为自己的模板再调整
        </div>
      )}

      <div className="mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">纸张大小</label>
            <select
              value={layout.paperSize ?? 'A4'}
              onChange={(e) => handleChange('paperSize', e.target.value)}
              disabled={!editable}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {PAPER_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">纸张方向</label>
            <select
              value={layout.paperDirection ?? 'portrait'}
              onChange={(e) => handleChange('paperDirection', e.target.value)}
              disabled={!editable}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {PAPER_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">页边距</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">上</label>
            <NumberInput
              value={layout.marginTopMm}
              onChange={(v) => handleChange('marginTopMm', v)}
              min={5}
              max={100}
              unit="mm"
              disabled={!editable}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">下</label>
            <NumberInput
              value={layout.marginBottomMm}
              onChange={(v) => handleChange('marginBottomMm', v)}
              min={5}
              max={100}
              unit="mm"
              disabled={!editable}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">左</label>
            <NumberInput
              value={layout.marginLeftMm}
              onChange={(v) => handleChange('marginLeftMm', v)}
              min={5}
              max={100}
              unit="mm"
              disabled={!editable}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">右</label>
            <NumberInput
              value={layout.marginRightMm}
              onChange={(v) => handleChange('marginRightMm', v)}
              min={5}
              max={100}
              unit="mm"
              disabled={!editable}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

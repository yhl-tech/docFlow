'use client'

import type { LayoutConfig, PaperDirection } from '@/types/editor-template'

interface PaperEditorProps {
  layout: LayoutConfig
  onLayoutChange: (patch: Partial<LayoutConfig>) => void
  disabled?: boolean
}

const PAPER_SIZES = [
  { value: 'A4', label: 'A4 (210×297mm)' },
  { value: 'A3', label: 'A3 (297×420mm)' },
  { value: 'Letter', label: 'Letter (216×279mm)' },
  { value: 'Legal', label: 'Legal (216×356mm)' },
  { value: '16K', label: '16K (185×260mm)' },
  { value: '8K', label: '8K (270×390mm)' },
]

const PAPER_DIRECTIONS: { value: PaperDirection; label: string; icon: string }[] = [
  { value: 'portrait', label: '纵向', icon: '▯' },
  { value: 'landscape', label: '横向', icon: '▮' },
]

/**
 * 纸张设置编辑器组件
 */
export function PaperEditor({ layout, onLayoutChange, disabled }: PaperEditorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">纸张大小</label>
        <select
          value={layout.paperSize ?? 'A4'}
          onChange={(e) => {
            const size = e.target.value
            const sizeMap: Record<string, { w: number; h: number }> = {
              A4: { w: 210, h: 297 },
              A3: { w: 297, h: 420 },
              Letter: { w: 216, h: 279 },
              Legal: { w: 216, h: 356 },
              '16K': { w: 185, h: 260 },
              '8K': { w: 270, h: 390 },
            }
            const dims = sizeMap[size]
            onLayoutChange({
              paperSize: size,
              pageWidthMm: dims.w,
              pageHeightMm: dims.h,
            })
          }}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {PAPER_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">纸张方向</label>
        <div className="flex gap-2">
          {PAPER_DIRECTIONS.map((dir) => (
            <button
              key={dir.value}
              onClick={() => onLayoutChange({ paperDirection: dir.value })}
              disabled={disabled}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors ${
                layout.paperDirection === dir.value
                  ? 'border-slate-700 bg-slate-700 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              } disabled:opacity-50`}
            >
              <span className="text-sm">{dir.icon}</span>
              <span>{dir.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">宽度 (mm)</label>
          <input
            type="number"
            value={layout.pageWidthMm ?? 210}
            onChange={(e) => onLayoutChange({ pageWidthMm: Number(e.target.value) })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">高度 (mm)</label>
          <input
            type="number"
            value={layout.pageHeightMm ?? 297}
            onChange={(e) => onLayoutChange({ pageHeightMm: Number(e.target.value) })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}

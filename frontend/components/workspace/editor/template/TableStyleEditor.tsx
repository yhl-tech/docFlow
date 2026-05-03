'use client'

import type { TableStyleConfig, FontInfo } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'

interface TableStyleEditorProps {
  tableStyles: TableStyleConfig | undefined
  fonts: FontInfo[]
  onChange: (patch: Partial<TableStyleConfig>) => void
  disabled?: boolean
}

const BORDER_PRESETS = [
  { value: 'all', label: '全部边框' },
  { value: 'grid', label: '网格' },
  { value: 'outline', label: '外边框' },
  { value: 'inside', label: '内部边框' },
  { value: 'none', label: '无边框' },
]

const BORDER_STYLES = [
  { value: 'single', label: '单线' },
  { value: 'double', label: '双线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
]

/**
 * 表格样式编辑器组件
 */
export function TableStyleEditor({ tableStyles, fonts, onChange, disabled }: TableStyleEditorProps) {
  const config = tableStyles ?? {}
  const border = config.border ?? {}

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">边框预设</label>
        <select
          value={border.preset ?? 'grid'}
          onChange={(e) => onChange({ border: { ...border, preset: e.target.value as TableStyleConfig['border'] extends { preset: infer P } ? P : undefined } })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {BORDER_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">边框颜色</label>
          <ColorPicker
            value={border.color}
            onChange={(v) => onChange({ border: { ...border, color: v } })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">边框宽度</label>
          <input
            type="number"
            min={0.25}
            max={12}
            step={0.25}
            value={border.widthPt ?? 0.5}
            onChange={(e) => onChange({ border: { ...border, widthPt: Number(e.target.value) } })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500">边框样式</label>
        <select
          value={border.style ?? 'single'}
          onChange={(e) => onChange({ border: { ...border, style: e.target.value as TableStyleConfig['border'] extends { style: infer S } ? S : undefined } })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {BORDER_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">底纹</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">填充色</label>
            <ColorPicker
              value={config.shading?.fill}
              onChange={(v) => onChange({ shading: { ...config.shading, fill: v } })}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">字体颜色</label>
            <ColorPicker
              value={config.fontColor}
              onChange={(v) => onChange({ fontColor: v })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500">字体</label>
        <input
          type="text"
          value={config.fontFamily ?? ''}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          disabled={disabled}
          placeholder="如：宋体、黑体"
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500">字号</label>
        <input
          type="number"
          min={8}
          max={72}
          value={config.fontSizePt ?? 10}
          onChange={(e) => onChange({ fontSizePt: Number(e.target.value) })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">选项</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={border.insideBorder ?? true}
              onChange={(e) => onChange({ border: { ...border, insideBorder: e.target.checked } })}
              disabled={disabled}
              className="rounded border-slate-300"
            />
            显示内部边框
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.repeatHeaderRow ?? true}
              onChange={(e) => onChange({ repeatHeaderRow: e.target.checked })}
              disabled={disabled}
              className="rounded border-slate-300"
            />
            标题行重复
          </label>
        </div>
      </div>
    </div>
  )
}

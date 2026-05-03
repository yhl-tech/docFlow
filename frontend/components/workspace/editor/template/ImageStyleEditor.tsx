'use client'

import type { ImageStyleConfig } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'

interface ImageStyleEditorProps {
  imageStyles: ImageStyleConfig | undefined
  onChange: (patch: Partial<ImageStyleConfig>) => void
  disabled?: boolean
}

const WRAP_TYPES = [
  { value: 'inline', label: '嵌入式' },
  { value: 'square', label: '四周型' },
  { value: 'tight', label: '紧密型' },
  { value: 'through', label: '穿越型' },
  { value: 'topAndBottom', label: '上下型' },
  { value: 'behind', label: '衬于文字下方' },
]

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
]

/**
 * 图片样式编辑器组件
 */
export function ImageStyleEditor({ imageStyles, onChange, disabled }: ImageStyleEditorProps) {
  const config = imageStyles ?? {}
  const position = config.position ?? {}

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">文字环绕</label>
        <select
          value={position.wrapType ?? 'inline'}
          onChange={(e) => onChange({ position: { ...position, wrapType: e.target.value as ImageStyleConfig['position'] extends { wrapType: infer W } ? W : undefined } })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {WRAP_TYPES.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">水平对齐</label>
        <select
          value={position.horizontalAlign ?? 'center'}
          onChange={(e) => onChange({ position: { ...position, horizontalAlign: e.target.value as ImageStyleConfig['position'] extends { horizontalAlign: infer A } ? A : undefined } })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {ALIGN_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">边框</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">颜色</label>
            <ColorPicker
              value={config.borderColor}
              onChange={(v) => onChange({ borderColor: v })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">宽度 (pt)</label>
            <input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={config.borderWidthPt ?? 0}
              onChange={(e) => onChange({ borderWidthPt: Number(e.target.value) })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">图片效果</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">亮度</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={config.brightness ?? 0}
              onChange={(e) => onChange({ brightness: Number(e.target.value) })}
              disabled={disabled}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.brightness ?? 0}%</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">对比度</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={config.contrast ?? 0}
              onChange={(e) => onChange({ contrast: Number(e.target.value) })}
              disabled={disabled}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.contrast ?? 0}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

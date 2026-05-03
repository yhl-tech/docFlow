'use client'

import type { CodeBlockStyleConfig, FontInfo } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'

interface CodeBlockEditorProps {
  codeBlockStyles: CodeBlockStyleConfig | undefined
  fonts: FontInfo[]
  onChange: (patch: Partial<CodeBlockStyleConfig>) => void
  disabled?: boolean
}

/**
 * 代码块样式编辑器组件
 */
export function CodeBlockEditor({ codeBlockStyles, fonts, onChange, disabled }: CodeBlockEditorProps) {
  const config = codeBlockStyles ?? {}

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">边框颜色</label>
          <ColorPicker
            value={config.borderColor}
            onChange={(v) => onChange({ borderColor: v })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">边框宽度</label>
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={config.borderWidthPt ?? 0.5}
            onChange={(e) => onChange({ borderWidthPt: Number(e.target.value) })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-500">背景色</label>
        <ColorPicker
          value={config.shadingColor}
          onChange={(v) => onChange({ shadingColor: v })}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">文字颜色</label>
          <ColorPicker
            value={config.textColor}
            onChange={(v) => onChange({ textColor: v })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">行号颜色</label>
          <ColorPicker
            value={config.lineNumberColor}
            onChange={(v) => onChange({ lineNumberColor: v })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2">
        <label className="text-xs text-slate-600">显示行号</label>
        <button
          onClick={() => onChange({ lineNumberEnabled: !config.lineNumberEnabled })}
          disabled={disabled}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            config.lineNumberEnabled ? 'bg-slate-700' : 'bg-slate-200'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              config.lineNumberEnabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

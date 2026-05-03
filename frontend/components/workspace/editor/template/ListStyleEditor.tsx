'use client'

import type { ListStyleConfig, FontInfo } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'

interface ListStyleEditorProps {
  listStyles: ListStyleConfig | undefined
  fonts: FontInfo[]
  onChange: (patch: Partial<ListStyleConfig>) => void
  disabled?: boolean
}

const BULLET_CHARS = [
  { value: '●', label: '● 实心圆' },
  { value: '■', label: '■ 实心方' },
  { value: '▼', label: '▼ 三角' },
  { value: '☐', label: '☐ 空心方' },
  { value: '☑', label: '☑ 勾选' },
  { value: '•', label: '• 小圆点' },
  { value: '▪', label: '▪ 小方块' },
]

const NUMBER_FORMATS = [
  { value: '1.', label: '1. 数字' },
  { value: 'a.', label: 'a. 小写字母' },
  { value: 'A.', label: 'A. 大写字母' },
  { value: '1)', label: '1) 数字括号' },
  { value: '(1)', label: '(1) 括号数字' },
  { value: '一.', label: '一. 汉字数字' },
  { value: '一、', label: '一、 汉字顿号' },
]

/**
 * 无序列表样式编辑器
 */
function BulletListEditor({
  bullet,
  onChange,
  disabled,
}: {
  bullet: ListStyleConfig['bullet']
  onChange: (patch: NonNullable<ListStyleConfig['bullet']>) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">列表符号</label>
        <select
          value={bullet?.character ?? '●'}
          onChange={(e) => onChange({ character: e.target.value })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {BULLET_CHARS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">颜色</label>
        <ColorPicker
          value={bullet?.color}
          onChange={(v) => onChange({ color: v })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

/**
 * 有序列表样式编辑器
 */
function OrderedListEditor({
  ordered,
  onChange,
  disabled,
}: {
  ordered: ListStyleConfig['ordered']
  onChange: (patch: NonNullable<ListStyleConfig['ordered']>) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">编号格式</label>
        <select
          value={ordered?.format ?? '1.'}
          onChange={(e) => onChange({ format: e.target.value })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {NUMBER_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">颜色</label>
        <ColorPicker
          value={ordered?.color}
          onChange={(v) => onChange({ color: v })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

/**
 * 列表样式编辑器组件
 */
export function ListStyleEditor({ listStyles, fonts, onChange, disabled }: ListStyleEditorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">无序列表</label>
        <BulletListEditor
          bullet={listStyles?.bullet}
          onChange={(patch) => onChange({ bullet: { ...listStyles?.bullet, ...patch } })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">有序列表</label>
        <OrderedListEditor
          ordered={listStyles?.ordered}
          onChange={(patch) => onChange({ ordered: { ...listStyles?.ordered, ...patch } })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

'use client'

import type { StyleSlotConfig } from '@/types/editor-template'

const ALIGN_OPTIONS: { value: StyleSlotConfig['align']; label: string }[] = [
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
  { value: 'justify', label: '两端' },
]

interface NumberInputProps {
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
}

/**
 * 数字输入框组件
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled,
}: NumberInputProps) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
      />
      {unit && <span className="text-xs text-slate-400">{unit}</span>}
    </div>
  )
}

interface FontSelectProps {
  value: string | undefined
  fonts: { id: string; name: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}

/**
 * 字体选择组件
 */
export function FontSelect({ value, fonts, onChange, disabled }: FontSelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="min-w-[110px] flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
    >
      {fonts.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  )
}

interface AlignSelectProps {
  value: StyleSlotConfig['align'] | undefined
  onChange: (v: StyleSlotConfig['align']) => void
  disabled?: boolean
}

/**
 * 对齐方式选择组件
 */
export function AlignSelect({ value, onChange, disabled }: AlignSelectProps) {
  return (
    <select
      value={value ?? 'left'}
      onChange={(e) => onChange(e.target.value as StyleSlotConfig['align'])}
      disabled={disabled}
      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
    >
      {ALIGN_OPTIONS.map((o) => (
        <option key={o.value} value={o.value ?? ''}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface BoldButtonProps {
  active: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * 加粗按钮组件
 */
export function BoldButton({ active, disabled, onClick }: BoldButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onClick()
      }}
      disabled={disabled}
      className={`rounded px-1.5 py-0.5 text-xs font-bold transition-colors ${
        active
          ? 'bg-slate-700 text-white'
          : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
      } disabled:opacity-50`}
    >
      B
    </button>
  )
}

interface ItalicButtonProps {
  active: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * 斜体按钮组件
 */
export function ItalicButton({ active, disabled, onClick }: ItalicButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onClick()
      }}
      disabled={disabled}
      className={`rounded px-1.5 py-0.5 text-xs italic transition-colors ${
        active
          ? 'bg-slate-700 text-white'
          : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
      } disabled:opacity-50`}
    >
      I
    </button>
  )
}

interface ColorPickerProps {
  value?: string
  onChange: (v: string) => void
  disabled?: boolean
}

/**
 * 颜色选择器组件
 */
export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-6 w-6 cursor-pointer rounded border border-slate-200 disabled:opacity-50"
      />
      {value && (
        <span className="text-xs text-slate-400">{value.toUpperCase()}</span>
      )}
    </div>
  )
}

interface StyleSlotRowProps {
  slot: StyleSlotConfig
  fonts: { id: string; name: string }[]
  editable: boolean
  fontSizeRange?: { min: number; max: number }
  onChange: (patch: Record<string, unknown>) => void
  onBoldToggle?: () => void
  onItalicToggle?: () => void
}

/**
 * 样式槽位行组件
 */
export function StyleSlotRow({
  slot,
  fonts,
  editable,
  fontSizeRange = { min: 8, max: 72 },
  onChange,
  onBoldToggle,
  onItalicToggle,
}: StyleSlotRowProps) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{slot.label}</span>
        <div className="flex items-center gap-1">
          {slot.italic !== undefined && onItalicToggle && (
            <ItalicButton
              active={slot.italic}
              disabled={!editable}
              onClick={onItalicToggle}
            />
          )}
          {slot.bold !== undefined && onBoldToggle && (
            <BoldButton
              active={slot.bold}
              disabled={!editable}
              onClick={onBoldToggle}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FontSelect
          value={slot.fontFamily}
          fonts={fonts}
          disabled={!editable}
          onChange={(v) => onChange({ fontFamily: v })}
        />
        <NumberInput
          value={slot.fontSizePt}
          onChange={(v) => onChange({ fontSizePt: v })}
          min={fontSizeRange.min}
          max={fontSizeRange.max}
          step={0.5}
          unit="pt"
          disabled={!editable}
        />
        {slot.color !== undefined && (
          <ColorPicker
            value={slot.color}
            onChange={(v) => onChange({ color: v })}
            disabled={!editable}
          />
        )}
        {slot.align !== undefined && (
          <AlignSelect
            value={slot.align}
            disabled={!editable}
            onChange={(v) => onChange({ align: v })}
          />
        )}
      </div>
    </div>
  )
}

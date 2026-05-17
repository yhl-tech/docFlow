'use client'

import type { HeadingStyleConfig, TemplateDefinition, FontInfo } from '@/types/editor-template'
import { NumberInput } from './StyleSlotRow'
import { Switch } from '@/components/ui/Switch'

const FONT_SIZES = [
  { value: 8, label: '八号' },
  { value: 9, label: '七号' },
  { value: 10.5, label: '小六' },
  { value: 12, label: '六号' },
  { value: 14, label: '小五' },
  { value: 15, label: '五号' },
  { value: 16, label: '小四' },
  { value: 18, label: '四号' },
  { value: 22, label: '小三' },
  { value: 24, label: '三号' },
  { value: 26, label: '小二' },
  { value: 32, label: '二号' },
  { value: 36, label: '小一' },
  { value: 42, label: '一号' },
]

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端对齐' },
]

const LEVELS = [
  { level: 'level2', label: '2级标题', outlineLevel: 2, defaultBold: true, defaultFontSize: 24 },
  { level: 'level3', label: '3级标题', outlineLevel: 3, defaultBold: true, defaultFontSize: 18 },
  { level: 'level4', label: '4级标题', outlineLevel: 4, defaultBold: false, defaultFontSize: 16 },
  { level: 'level5', label: '5级标题', outlineLevel: 5, defaultBold: false, defaultFontSize: 14 },
  { level: 'level6', label: '6级标题', outlineLevel: 6, defaultBold: true, defaultFontSize: 12 },
]

interface HeadingStyleEditorProps {
  headingStyles: Record<string, HeadingStyleConfig> | undefined
  fonts: FontInfo[]
  disabled?: boolean
  onChange: (headingLevel: string, patch: Partial<HeadingStyleConfig>) => void
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <h4 className="mb-3 text-xs font-semibold text-slate-600">{title}</h4>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-slate-500">{children}</label>
}

function RowGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function ToggleButton({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 accent-slate-700"
      />
      <span className="text-xs text-slate-600">{label}</span>
    </label>
  )
}

interface SwitchButtonProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function SwitchButton({ checked, onChange, disabled }: SwitchButtonProps) {
  return (
    <Switch checked={checked} onChange={onChange} disabled={disabled} />
  )
}

function LevelHeadingRow({
  level,
  label,
  config,
  fonts,
  disabled,
  onChange,
}: {
  level: string
  label: string
  config: HeadingStyleConfig | undefined
  fonts: FontInfo[]
  disabled?: boolean
  onChange: (headingLevel: string, patch: Partial<HeadingStyleConfig>) => void
}) {
  const font = config?.font ?? {}

  const patchFont = (p: Partial<typeof font>) => {
    onChange(level, { font: { ...font, ...p } })
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-slate-700">{label}</h5>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">加粗</span>
            <SwitchButton
              checked={font.bold ?? false}
              onChange={(v) => patchFont({ bold: v })}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">斜体</span>
            <SwitchButton
              checked={font.italic ?? false}
              onChange={(v) => patchFont({ italic: v })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <RowGrid>
        <div className="space-y-1.5">
          <FieldLabel>字体</FieldLabel>
          <select
            value={font.fontFamily ?? ''}
            onChange={(e) => patchFont({ fontFamily: e.target.value || undefined })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            <option value="">默认字体</option>
            {fonts.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>字体大小</FieldLabel>
          <select
            value={font.fontSizePt ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              patchFont({ fontSizePt: v || undefined })
            }}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            <option value="">默认</option>
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label} ({s.value}pt)</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>字体颜色</FieldLabel>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={font.color ?? '#000000'}
              onChange={(e) => patchFont({ color: e.target.value })}
              disabled={disabled}
              className="h-7 w-7 cursor-pointer rounded border border-slate-200 disabled:opacity-50"
            />
            <span className="text-xs text-slate-400">{(font.color ?? '#000000').toUpperCase()}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>对齐方式</FieldLabel>
          <select
            value={config?.align ?? 'left'}
            onChange={(e) => onChange(level, { align: e.target.value as any })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {ALIGN_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </RowGrid>

      <SectionCard title="间距">
        <RowGrid>
          <div className="space-y-1.5">
            <FieldLabel>段前间距（行）</FieldLabel>
            <NumberInput
              value={config?.spacingBeforePt}
              onChange={(v) => onChange(level, { spacingBeforePt: v })}
              min={0}
              max={10}
              step={0.1}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>段后间距（行）</FieldLabel>
            <NumberInput
              value={config?.spacingAfterPt}
              onChange={(v) => onChange(level, { spacingAfterPt: v })}
              min={0}
              max={10}
              step={0.1}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>左缩进（字）</FieldLabel>
            <NumberInput
              value={config?.leftIndentChars}
              onChange={(v) => onChange(level, { leftIndentChars: v })}
              min={0}
              max={10}
              step={0.5}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>首行缩进（字）</FieldLabel>
            <NumberInput
              value={config?.firstLineIndentChars}
              onChange={(v) => onChange(level, { firstLineIndentChars: v })}
              min={0}
              max={10}
              step={0.5}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>行间距（倍）</FieldLabel>
            <select
              value={config?.lineHeight ?? 1.0}
              onChange={(e) => onChange(level, { lineHeight: parseFloat(e.target.value) })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {[1.0, 1.15, 1.5, 2.0, 2.5, 3.0].map((v) => (
                <option key={v} value={v}>{v}x{v === 1.0 ? '（单倍）' : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>大纲级别</FieldLabel>
            <select
              value={config?.outlineLevel ?? LEVELS.find(l => l.level === level)?.outlineLevel ?? 2}
              onChange={(e) => onChange(level, { outlineLevel: parseInt(e.target.value) })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => (
                <option key={v} value={v}>{v} 级</option>
              ))}
            </select>
            <p className="text-xs text-slate-400">仅影响 Word 导出，预览不体现</p>
          </div>
        </RowGrid>
      </SectionCard>
    </div>
  )
}

export function HeadingStyleEditor({ headingStyles, fonts, disabled, onChange }: HeadingStyleEditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        配置 2~6 级标题的字体、字号、颜色、加粗、对齐、间距等样式
      </p>
      {LEVELS.map(({ level, label }) => (
        <LevelHeadingRow
          key={level}
          level={level}
          label={label}
          config={headingStyles?.[level]}
          fonts={fonts}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

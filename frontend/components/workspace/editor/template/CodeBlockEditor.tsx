'use client'

import type { CodeBlockStyleConfig } from '@/types/editor-template'
import { ColorPicker, NumberInput } from './StyleSlotRow'
import { Switch } from '@/components/ui/Switch'

interface CodeBlockEditorProps {
  codeBlockStyles: CodeBlockStyleConfig | undefined
  fonts: { id: string; name: string }[]
  onChange: (patch: Partial<CodeBlockStyleConfig>) => void
  disabled?: boolean
}

const FONT_SIZES = [
  { value: 8, label: '八号 (8pt)' },
  { value: 9, label: '七号 (9pt)' },
  { value: 10.5, label: '小六 (10.5pt)' },
  { value: 12, label: '六号 (12pt)' },
  { value: 14, label: '小五 (14pt)' },
  { value: 15, label: '五号 (15pt)' },
  { value: 16, label: '小四 (16pt)' },
  { value: 18, label: '四号 (18pt)' },
]

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

function RowGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
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

export function CodeBlockEditor({
  codeBlockStyles,
  fonts,
  onChange,
  disabled,
}: CodeBlockEditorProps) {
  const cfg = codeBlockStyles ?? {}
  const border = cfg.border ?? {}
  const shading = cfg.shading ?? {}
  const kbd = cfg.keyboardStyle ?? {}
  const ln = cfg.lineNumber ?? {}
  const ts = cfg.tabStop ?? {}
  const font = cfg.font ?? {}
  const pad = cfg.padding ?? {}
  const lineSpacing = cfg.lineSpacing ?? 1.5

  const patch = (p: Partial<CodeBlockStyleConfig>) => onChange({ ...cfg, ...p })
  const patchFont = (p: Partial<NonNullable<CodeBlockStyleConfig['font']>>) =>
    patch({ font: { ...font, ...p } })
  const patchPad = (p: Partial<NonNullable<CodeBlockStyleConfig['padding']>>) =>
    patch({ padding: { ...pad, ...p } })
  const patchBorder = (p: Partial<NonNullable<CodeBlockStyleConfig['border']>>) =>
    patch({ border: { ...border, ...p } })

  return (
    <div className="space-y-4">
      {/* 一、代码块基础设置 */}
      <SectionCard title="一、代码块基础设置">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel>字体</FieldLabel>
            <select
              value={font.fontFamily ?? ''}
              onChange={(e) => patchFont({ fontFamily: e.target.value || undefined })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认等宽字体</option>
              {fonts.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <RowGrid>
            <div className="space-y-1.5">
              <FieldLabel>字号</FieldLabel>
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
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>字体颜色</FieldLabel>
              <ColorPicker
                value={font.color ?? ''}
                onChange={(v) => patchFont({ color: v || undefined })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>加粗</FieldLabel>
              <div className="flex items-center">
                <SwitchButton
                  checked={font.bold ?? false}
                  onChange={(v) => patchFont({ bold: v })}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>斜体</FieldLabel>
              <div className="flex items-center">
                <SwitchButton
                  checked={font.italic ?? false}
                  onChange={(v) => patchFont({ italic: v })}
                  disabled={disabled}
                />
              </div>
            </div>
          </RowGrid>

          {/* 内边距 */}
          <div className="space-y-1.5">
            <FieldLabel>内边距</FieldLabel>
            <RowGrid>
              <div className="space-y-1">
                <FieldLabel>上 (pt)</FieldLabel>
                <NumberInput value={pad.topPt ?? 8} onChange={(v) => patchPad({ topPt: v })} min={0} max={48} step={1} disabled={disabled} />
              </div>
              <div className="space-y-1">
                <FieldLabel>下 (pt)</FieldLabel>
                <NumberInput value={pad.bottomPt ?? 8} onChange={(v) => patchPad({ bottomPt: v })} min={0} max={48} step={1} disabled={disabled} />
              </div>
              <div className="space-y-1">
                <FieldLabel>左 (pt)</FieldLabel>
                <NumberInput value={pad.leftPt ?? 12} onChange={(v) => patchPad({ leftPt: v })} min={0} max={48} step={1} disabled={disabled} />
              </div>
              <div className="space-y-1">
                <FieldLabel>右 (pt)</FieldLabel>
                <NumberInput value={pad.rightPt ?? 12} onChange={(v) => patchPad({ rightPt: v })} min={0} max={48} step={1} disabled={disabled} />
              </div>
            </RowGrid>
          </div>

          {/* 行距 + 对齐 */}
          <RowGrid>
            <div className="space-y-1.5">
              <FieldLabel>行距（倍）</FieldLabel>
              <select
                value={lineSpacing}
                onChange={(e) => patch({ lineSpacing: parseFloat(e.target.value) })}
                disabled={disabled}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              >
                {[1.0, 1.15, 1.5, 2.0, 2.5, 3.0].map((v) => (
                  <option key={v} value={v}>{v}x{v === 1.0 ? '（单倍）' : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>对齐方式</FieldLabel>
              <select
                value={cfg.alignment ?? 'left'}
                onChange={(e) => patch({ alignment: e.target.value as any })}
                disabled={disabled}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              >
                <option value="left">左对齐</option>
                <option value="center">居中</option>
                <option value="right">右对齐</option>
                <option value="justify">两端对齐</option>
              </select>
            </div>
          </RowGrid>
        </div>
      </SectionCard>

      {/* 二、边框设置 */}
      <SectionCard title="二、边框设置">
        <div className="space-y-3">
          <RowGrid>
            <div className="space-y-1.5">
              <FieldLabel>边框颜色</FieldLabel>
              <ColorPicker
                value={border.color ?? ''}
                onChange={(v) => patchBorder({ color: v || undefined })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>边框宽度 (pt)</FieldLabel>
              <NumberInput
                value={border.widthPt ?? 0.5}
                onChange={(v) => patchBorder({ widthPt: v })}
                min={0}
                max={12}
                step={0.5}
                disabled={disabled}
              />
            </div>
          </RowGrid>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded border border-slate-200 bg-white p-2.5">
            <ToggleButton checked={border.leftBorder ?? true} onChange={(v) => patchBorder({ leftBorder: v })} label="左边框" disabled={disabled} />
            <ToggleButton checked={border.rightBorder ?? true} onChange={(v) => patchBorder({ rightBorder: v })} label="右边框" disabled={disabled} />
            <ToggleButton checked={border.topBorder ?? true} onChange={(v) => patchBorder({ topBorder: v })} label="顶边框" disabled={disabled} />
            <ToggleButton checked={border.bottomBorder ?? true} onChange={(v) => patchBorder({ bottomBorder: v })} label="底边框" disabled={disabled} />
          </div>
        </div>
      </SectionCard>

      {/* 三、背景与文字色 */}
      <SectionCard title="三、背景与文字色">
        <RowGrid>
          <div className="space-y-1.5">
            <FieldLabel>背景填充色</FieldLabel>
            <ColorPicker
              value={shading.fill ?? ''}
              onChange={(v) => patch({ shading: { ...shading, fill: v || undefined, applyTo: 'paragraph' } })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>文字颜色</FieldLabel>
            <ColorPicker
              value={font.color ?? ''}
              onChange={(v) => patchFont({ color: v || undefined })}
              disabled={disabled}
            />
          </div>
        </RowGrid>
      </SectionCard>

      {/* 四、行号设置 */}
      <SectionCard title="四、行号设置">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">显示行号</span>
            <SwitchButton
              checked={ln.show ?? false}
              onChange={(v) => patch({ lineNumber: { ...ln, show: v } })}
              disabled={disabled}
            />
          </div>
          {ln.show && (
            <div className="space-y-1.5">
              <FieldLabel>行号颜色</FieldLabel>
              <ColorPicker
                value={ln.color ?? ''}
                onChange={(v) => patch({ lineNumber: { ...ln, color: v || undefined } })}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* 五、制表位 */}
      <SectionCard title="五、制表位">
        <div className="space-y-1.5">
          <FieldLabel>默认制表位 (mm)</FieldLabel>
          <NumberInput
            value={ts.defaultMm ?? 21.7}
            onChange={(v) => patch({ tabStop: { ...ts, defaultMm: v } })}
            min={5}
            max={50}
            step={1}
            disabled={disabled}
          />
          <p className="text-xs text-slate-400">影响代码中 Tab 字符的显示宽度</p>
        </div>
      </SectionCard>
    </div>
  )
}

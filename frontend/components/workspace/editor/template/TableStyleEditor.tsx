'use client'

import type { TableStyleConfig } from '@/types/editor-template'
import { ColorPicker, NumberInput } from './StyleSlotRow'
import { Switch } from '@/components/ui/Switch'

interface TableStyleEditorProps {
  tableStyles: TableStyleConfig | undefined
  fonts: { id: string; name: string }[]
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

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端对齐' },
]

const VALIGN_OPTIONS = [
  { value: 'top', label: '上' },
  { value: 'center', label: '中' },
  { value: 'bottom', label: '下' },
]

const FONT_SIZES = [
  { value: 10.5, label: '五号' },
  { value: 12, label: '六号' },
  { value: 14, label: '小四' },
  { value: 16, label: '四号' },
  { value: 18, label: '小三' },
  { value: 20, label: '三号' },
]

const DEFAULT_CELL_PADDING = { top: 0.14, bottom: 0.14, left: 0, right: 0 }
const DEFAULT_ROW_HEIGHT = { headerHeightCm: 0.78, dataRowHeightCm: 0.78 }

/* ─── 通用 UI 组件 ─── */
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

function RowGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode
  cols?: number
}) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[cols] ?? 'grid-cols-2'
  return <div className={`grid gap-3 ${gridClass}`}>{children}</div>
}

function Spacer() {
  return <div className="space-y-2" />
}

/* ─── 单元格样式面板（表头/数据行共用） ─── */
function CellStylePanel({
  prefix,
  style,
  fonts,
  onChange,
  disabled,
}: {
  prefix: 'headerStyle' | 'dataRowStyle'
  style: TableStyleConfig['headerStyle'] | undefined
  fonts: { id: string; name: string }[]
  onChange: (patch: Partial<TableStyleConfig['headerStyle']>) => void
  disabled?: boolean
}) {
  const font = style?.font ?? {}
  const shading = style?.shading

  return (
    <SectionCard title={prefix === 'headerStyle' ? '表头样式' : '数据行样式'}>
      {/* 字体 */}
      <div className="mb-3 space-y-1.5">
        <FieldLabel>字体</FieldLabel>
        <select
          value={font?.fontFamily ?? ''}
          onChange={(e) => onChange({ font: { ...font, fontFamily: e.target.value || undefined } })}
          disabled={disabled}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          <option value="">默认字体</option>
          {fonts.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <RowGrid>
        {/* 字号 */}
        <div className="space-y-1.5">
          <FieldLabel>字体大小</FieldLabel>
          <select
            value={font?.fontSizePt ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              onChange({ font: { ...font, fontSizePt: v || undefined } })
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

        {/* 字体颜色 */}
        <div className="space-y-1.5">
          <FieldLabel>字体颜色</FieldLabel>
          <ColorPicker
            value={font?.color ?? ''}
            onChange={(v) => onChange({ font: { ...font, color: v || undefined } })}
            disabled={disabled}
          />
        </div>

        {/* 背景颜色 */}
        <div className="space-y-1.5">
          <FieldLabel>背景颜色</FieldLabel>
          <ColorPicker
            value={shading?.fill ?? ''}
            onChange={(v) => onChange({ shading: { ...shading, fill: v || undefined } })}
            disabled={disabled}
          />
        </div>

        {/* 水平对齐 */}
        <div className="space-y-1.5">
          <FieldLabel>水平对齐</FieldLabel>
          <select
            value={style?.align ?? 'left'}
            onChange={(e) => onChange({ align: e.target.value as any })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {ALIGN_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* 垂直对齐 */}
        <div className="space-y-1.5">
          <FieldLabel>垂直对齐</FieldLabel>
          <select
            value={style?.valign ?? 'center'}
            onChange={(e) => onChange({ valign: e.target.value as any })}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {VALIGN_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* 行距 */}
        <div className="space-y-1.5">
          <FieldLabel>行间距（倍）</FieldLabel>
          <select
            value={style?.lineHeight ?? 1.0}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              onChange({ lineHeight: v })
            }}
            disabled={disabled}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {[1.0, 1.15, 1.5, 2.0, 2.5, 3.0].map((v) => (
              <option key={v} value={v}>{v}x{v === 1.0 ? '（单倍）' : ''}</option>
            ))}
          </select>
        </div>
      </RowGrid>

      {/* 加粗/斜体/下划线 */}
      <div className="mt-3 flex items-center gap-4">
        <ToggleButton
          checked={font?.bold ?? false}
          onChange={(v) => onChange({ font: { ...font, bold: v } })}
          label="加粗"
          disabled={disabled}
        />
        <ToggleButton
          checked={font?.italic ?? false}
          onChange={(v) => onChange({ font: { ...font, italic: v } })}
          label="斜体"
          disabled={disabled}
        />
        <ToggleButton
          checked={font?.underline ?? false}
          onChange={(v) => onChange({ font: { ...font, underline: v } })}
          label="下划线"
          disabled={disabled}
        />
      </div>
    </SectionCard>
  )
}

/* ─── 主组件 ─── */
export function TableStyleEditor({
  tableStyles,
  fonts,
  onChange,
  disabled,
}: TableStyleEditorProps) {
  const cfg = tableStyles ?? {}
  const border = cfg.border ?? {}
  const cellPad = cfg.cellPadding ?? DEFAULT_CELL_PADDING
  const rowH = cfg.rowHeight ?? DEFAULT_ROW_HEIGHT

  const patch = (p: Partial<TableStyleConfig>) => onChange({ ...cfg, ...p })
  const patchBorder = (p: Partial<NonNullable<TableStyleConfig['border']>>) =>
    patch({ border: { ...border, ...p } })
  const patchCellPad = (p: Partial<NonNullable<TableStyleConfig['cellPadding']>>) =>
    patch({ cellPadding: { ...cellPad, ...p } })
  const patchRowHeight = (p: Partial<NonNullable<TableStyleConfig['rowHeight']>>) =>
    patch({ rowHeight: { ...rowH, ...p } })

  return (
    <div className="space-y-4">
      {/* 一、表格全局设置 */}
      <SectionCard title="一、表格全局设置">
        <RowGrid>
          <div className="space-y-1.5">
            <FieldLabel>表格对齐方式</FieldLabel>
            <select
              value={cfg.tableAlignment ?? 'left'}
              onChange={(e) => patch({ tableAlignment: e.target.value as any })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {ALIGN_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>表格宽度（%）</FieldLabel>
            <NumberInput
              value={cfg.tableWidth ?? 100}
              onChange={(v) => patch({ tableWidth: v })}
              min={10}
              max={100}
              step={5}
              disabled={disabled}
            />
          </div>
        </RowGrid>
      </SectionCard>

      {/* 二、边框和底纹 */}
      <SectionCard title="二、边框和底纹">
        <div className="space-y-3">
          {/* 预设 */}
          <div className="space-y-1.5">
            <FieldLabel>边框预设</FieldLabel>
            <select
              value={border.preset ?? 'grid'}
              onChange={(e) => patchBorder({ preset: e.target.value as any })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {BORDER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

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
                min={0.25}
                max={12}
                step={0.25}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>边框样式</FieldLabel>
              <select
                value={border.style ?? 'single'}
                onChange={(e) => patchBorder({ style: e.target.value as any })}
                disabled={disabled}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              >
                {BORDER_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>填充颜色</FieldLabel>
              <ColorPicker
                value={cfg.shading?.fill ?? ''}
                onChange={(v) => patch({ shading: { ...cfg.shading, fill: v || undefined } })}
                disabled={disabled}
              />
            </div>
          </RowGrid>

          {/* 各边框开关 */}
          <div className="space-y-1.5">
            <FieldLabel>边框控制</FieldLabel>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded border border-slate-200 bg-white p-2.5">
              <ToggleButton checked={border.leftBorder ?? true} onChange={(v) => patchBorder({ leftBorder: v })} label="左边框" disabled={disabled} />
              <ToggleButton checked={border.rightBorder ?? true} onChange={(v) => patchBorder({ rightBorder: v })} label="右边框" disabled={disabled} />
              <ToggleButton checked={border.topBorder ?? true} onChange={(v) => patchBorder({ topBorder: v })} label="顶边框" disabled={disabled} />
              <ToggleButton checked={border.bottomBorder ?? true} onChange={(v) => patchBorder({ bottomBorder: v })} label="底边框" disabled={disabled} />
              <ToggleButton checked={border.insideHorizontalBorder ?? true} onChange={(v) => patchBorder({ insideHorizontalBorder: v })} label="内部横线" disabled={disabled} />
              <ToggleButton checked={border.insideVerticalBorder ?? true} onChange={(v) => patchBorder({ insideVerticalBorder: v })} label="内部竖线" disabled={disabled} />
            </div>
          </div>

          {/* 底纹应用于 */}
          <div className="space-y-1.5">
            <FieldLabel>底纹应用于</FieldLabel>
            <select
              value={cfg.shading?.applyTo ?? 'cell'}
              onChange={(e) => patch({ shading: { ...cfg.shading, applyTo: e.target.value as any } })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="cell">单元格</option>
              <option value="paragraph">段落</option>
              <option value="table">表格</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 三、表头样式 */}
      <CellStylePanel
        prefix="headerStyle"
        style={cfg.headerStyle}
        fonts={fonts}
        onChange={(p) => patch({ headerStyle: { ...cfg.headerStyle, ...p } })}
        disabled={disabled}
      />

      {/* 四、数据行样式 */}
      <CellStylePanel
        prefix="dataRowStyle"
        style={cfg.dataRowStyle}
        fonts={fonts}
        onChange={(p) => patch({ dataRowStyle: { ...cfg.dataRowStyle, ...p } })}
        disabled={disabled}
      />

      {/* 五、单元格内边距 */}
      <SectionCard title="五、单元格内边距">
        <RowGrid>
          <div className="space-y-1.5">
            <FieldLabel>上 (cm)</FieldLabel>
            <NumberInput
              value={cellPad.top ?? 0.14}
              onChange={(v) => patchCellPad({ top: v })}
              min={0}
              max={2}
              step={0.01}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>下 (cm)</FieldLabel>
            <NumberInput
              value={cellPad.bottom ?? 0.14}
              onChange={(v) => patchCellPad({ bottom: v })}
              min={0}
              max={2}
              step={0.01}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>左 (cm)</FieldLabel>
            <NumberInput
              value={cellPad.left ?? 0}
              onChange={(v) => patchCellPad({ left: v })}
              min={0}
              max={2}
              step={0.01}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>右 (cm)</FieldLabel>
            <NumberInput
              value={cellPad.right ?? 0}
              onChange={(v) => patchCellPad({ right: v })}
              min={0}
              max={2}
              step={0.01}
              disabled={disabled}
            />
          </div>
        </RowGrid>
      </SectionCard>

      {/* 六、行高设置 */}
      <SectionCard title="六、行高设置">
        <RowGrid>
          <div className="space-y-1.5">
            <FieldLabel>表头行高 (cm)</FieldLabel>
            <NumberInput
              value={rowH.headerHeightCm ?? 0.78}
              onChange={(v) => patchRowHeight({ headerHeightCm: v })}
              min={0.3}
              max={5}
              step={0.1}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>数据行行高 (cm)</FieldLabel>
            <NumberInput
              value={rowH.dataRowHeightCm ?? 0.78}
              onChange={(v) => patchRowHeight({ dataRowHeightCm: v })}
              min={0.3}
              max={5}
              step={0.1}
              disabled={disabled}
            />
          </div>
        </RowGrid>
      </SectionCard>

      {/* 七、表格编号 */}
      <SectionCard title="七、表格编号">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">启用表格编号</span>
          <Switch
            checked={cfg.tableNumbering?.enabled ?? false}
            onChange={(v) => patch({ tableNumbering: { ...cfg.tableNumbering, enabled: v } })}
            disabled={disabled}
          />
        </div>
      </SectionCard>

      {/* 八、选项 */}
      <SectionCard title="八、选项">
        <div className="space-y-2">
          <ToggleButton checked={cfg.options?.specifyFormat ?? false} onChange={(v) => patch({ options: { ...cfg.options, specifyFormat: v } })} label="指定格式和网格" disabled={disabled} />
          <ToggleButton checked={cfg.options?.useThemeFormat ?? false} onChange={(v) => patch({ options: { ...cfg.options, useThemeFormat: v } })} label="使用主题格式" disabled={disabled} />
          <ToggleButton checked={cfg.options?.repeatHeaderRow ?? true} onChange={(v) => patch({ options: { ...cfg.options, repeatHeaderRow: v } })} label="标题行在每页重复" disabled={disabled} />
          <ToggleButton checked={cfg.options?.allowSplitTable ?? false} onChange={(v) => patch({ options: { ...cfg.options, allowSplitTable: v } })} label="允许在单元格中拆分表格" disabled={disabled} />
          <ToggleButton checked={cfg.options?.useAlignment ?? false} onChange={(v) => patch({ options: { ...cfg.options, useAlignment: v } })} label="对边框和底纹使用对齐" disabled={disabled} />
        </div>
      </SectionCard>
    </div>
  )
}

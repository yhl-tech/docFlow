'use client'

import { Info } from 'lucide-react'
import type { LayoutConfig, TemplateDefinition, FontInfo } from '@/types/editor-template'
import { NumberInput, ColorPicker } from './StyleSlotRow'

const PAPER_SIZES = ['A4', 'B5', '16K', 'Letter', 'Folio', '8K']
const PAPER_DIRECTIONS = [
  { value: 'portrait', label: '纵向' },
  { value: 'landscape', label: '横向' },
]

const INDENT_OPTIONS = [
  { value: 0, label: '无' },
  { value: 2, label: '2字符' },
  { value: 4, label: '4字符' },
]

const POSITION_OPTIONS = [
  { value: 'header-bottom', label: '页眉下方' },
  { value: 'footer-top', label: '页脚上方' },
]

const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
]

const FORMAT_OPTIONS = [
  { value: 'arabic', label: '1, 2, 3' },
  { value: 'lowercaseRoman', label: 'i, ii, iii' },
  { value: 'uppercaseRoman', label: 'I, II, III' },
]

const LABEL_TEMPLATE_OPTIONS = [
  { value: '第 {N} 页', label: '第 {N} 页' },
  { value: '{N}', label: '仅数字' },
  { value: 'Page {N}', label: 'Page {N}' },
  { value: '共 {P} 页', label: '共 {P} 页' },
  { value: '第 {N} 页 / 共 {P} 页', label: '第 {N} 页 / 共 {P} 页' },
]

interface FieldRowProps {
  label: string
  children: React.ReactNode
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-24 flex-shrink-0 text-xs text-slate-500">{label}</span>
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </h3>
  )
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-medium text-slate-600">{children}</h4>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? 'bg-slate-700' : 'bg-slate-200'
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

interface LayoutEditorProps {
  template: TemplateDefinition
  layout: LayoutConfig
  fonts: FontInfo[]
  onLayoutChange: (patch: Record<string, unknown>) => void
}

/**
 * 页面布局编辑器组件（整合页码、页眉页脚）
 */
export function LayoutEditor({ template, layout, fonts, onLayoutChange }: LayoutEditorProps) {
  const isBuiltin = template.source === 'builtin'
  const pageNumber = layout.pageNumber ?? {}
  const headerFooter = layout.headerFooter ?? {}

  const handleChange = (field: string, value: unknown) => {
    if (!isBuiltin) {
      onLayoutChange({ [field]: value })
    }
  }

  const handlePageNumberChange = (patch: Record<string, unknown>) => {
    if (!isBuiltin) {
      onLayoutChange({ pageNumber: { ...pageNumber, ...patch } })
    }
  }

  const handleHeaderFooterChange = (patch: Record<string, unknown>) => {
    if (!isBuiltin) {
      onLayoutChange({ headerFooter: { ...headerFooter, ...patch } })
    }
  }

  return (
    <div>
      {isBuiltin && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          内置模板不可直接修改，请先复制为自己的模板再调整
        </div>
      )}

      {/* ── 纸张与页边距 ── */}
      <SectionTitle>纸张与页边距</SectionTitle>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="纸张大小">
          <select
            value={layout.paperSize ?? 'A4'}
            onChange={(e) => handleChange('paperSize', e.target.value)}
            disabled={isBuiltin}
            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {PAPER_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="纸张方向">
          <select
            value={layout.paperDirection ?? 'portrait'}
            onChange={(e) => handleChange('paperDirection', e.target.value)}
            disabled={isBuiltin}
            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
          >
            {PAPER_DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="页边距上">
          <NumberInput
            value={layout.marginTopMm}
            onChange={(v) => handleChange('marginTopMm', v)}
            min={5}
            max={100}
            unit="mm"
            disabled={isBuiltin}
          />
        </FieldRow>

        <FieldRow label="页边距下">
          <NumberInput
            value={layout.marginBottomMm}
            onChange={(v) => handleChange('marginBottomMm', v)}
            min={5}
            max={100}
            unit="mm"
            disabled={isBuiltin}
          />
        </FieldRow>

        <FieldRow label="页边距左">
          <NumberInput
            value={layout.marginLeftMm}
            onChange={(v) => handleChange('marginLeftMm', v)}
            min={5}
            max={100}
            unit="mm"
            disabled={isBuiltin}
          />
        </FieldRow>

        <FieldRow label="页边距右">
          <NumberInput
            value={layout.marginRightMm}
            onChange={(v) => handleChange('marginRightMm', v)}
            min={5}
            max={100}
            unit="mm"
            disabled={isBuiltin}
          />
        </FieldRow>
      </div>

      <div className="my-3 border-t border-slate-100" />

      {/* ── 段落 ── */}
      <SectionTitle>段落</SectionTitle>

      <FieldRow label="行间距">
        <NumberInput
          value={layout.defaultLineHeight}
          onChange={(v) => handleChange('defaultLineHeight', v)}
          min={1}
          max={5}
          step={0.1}
          unit="倍"
          disabled={isBuiltin}
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="段前间距">
          <NumberInput
            value={layout.defaultParagraphSpacingBeforePt}
            onChange={(v) => handleChange('defaultParagraphSpacingBeforePt', v)}
            min={0}
            max={72}
            unit="pt"
            disabled={isBuiltin}
          />
        </FieldRow>

        <FieldRow label="段后间距">
          <NumberInput
            value={layout.defaultParagraphSpacingAfterPt}
            onChange={(v) => handleChange('defaultParagraphSpacingAfterPt', v)}
            min={0}
            max={72}
            unit="pt"
            disabled={isBuiltin}
          />
        </FieldRow>
      </div>

      <FieldRow label="首行缩进">
        <select
          value={layout.defaultFirstLineIndentChars ?? 0}
          onChange={(e) => handleChange('defaultFirstLineIndentChars', Number(e.target.value))}
          disabled={isBuiltin}
          className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
        >
          {INDENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FieldRow>

      <div className="my-3 border-t border-slate-100" />

      {/* ── 页码 ── */}
      <SectionTitle>页码</SectionTitle>

      <div className="rounded border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-600">启用页码</span>
          <ToggleSwitch
            checked={pageNumber.enabled ?? false}
            onChange={(v) => handlePageNumberChange({ enabled: v })}
            disabled={isBuiltin}
          />
        </div>

        {pageNumber.enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">位置</label>
                <select
                  value={pageNumber.position ?? 'footer-top'}
                  onChange={(e) => handlePageNumberChange({ position: e.target.value })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                >
                  {POSITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">对齐</label>
                <select
                  value={pageNumber.align ?? 'center'}
                  onChange={(e) => handlePageNumberChange({ align: e.target.value })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                >
                  {ALIGN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">编号格式</label>
                <select
                  value={pageNumber.format ?? 'arabic'}
                  onChange={(e) => handlePageNumberChange({ format: e.target.value })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                >
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">起始页码</label>
                <input
                  type="number"
                  min={1}
                  value={pageNumber.startValue ?? 1}
                  onChange={(e) => handlePageNumberChange({ startValue: Number(e.target.value) })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">标签模板</label>
                <select
                  value={pageNumber.labelTemplate ?? '第 {N} 页'}
                  onChange={(e) => handlePageNumberChange({ labelTemplate: e.target.value })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                >
                  {LABEL_TEMPLATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SubSectionTitle>页码字体样式</SubSectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">字体</label>
                <select
                  value={pageNumber.fontFamily ?? ''}
                  onChange={(e) => handlePageNumberChange({ fontFamily: e.target.value })}
                  disabled={isBuiltin}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                >
                  <option value="">默认字体</option>
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">字号(pt)</label>
                <NumberInput
                  value={pageNumber.fontSizePt}
                  onChange={(v) => handlePageNumberChange({ fontSizePt: v })}
                  min={8}
                  max={72}
                  step={1}
                  disabled={isBuiltin}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">颜色</label>
                <ColorPicker
                  value={pageNumber.color}
                  onChange={(v) => handlePageNumberChange({ color: v })}
                  disabled={isBuiltin}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">B</span>
                <button
                  onClick={() => handlePageNumberChange({ bold: !pageNumber.bold })}
                  disabled={isBuiltin}
                  className={`rounded px-1 py-0.5 text-xs font-bold transition-colors ${
                    pageNumber.bold
                      ? 'bg-slate-700 text-white'
                      : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  B
                </button>
                <span className="text-xs text-slate-400">I</span>
                <button
                  onClick={() => handlePageNumberChange({ italic: !pageNumber.italic })}
                  disabled={isBuiltin}
                  className={`rounded px-1 py-0.5 text-xs italic transition-colors ${
                    pageNumber.italic
                      ? 'bg-slate-700 text-white'
                      : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  I
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={pageNumber.showOnFirstPage ?? false}
                  onChange={(e) => handlePageNumberChange({ showOnFirstPage: e.target.checked })}
                  disabled={isBuiltin}
                  className="rounded border-slate-300"
                />
                首页显示页码
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={pageNumber.continueFromPrevious ?? false}
                  onChange={(e) => handlePageNumberChange({ continueFromPrevious: e.target.checked })}
                  disabled={isBuiltin}
                  className="rounded border-slate-300"
                />
                续前节
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="my-3 border-t border-slate-100" />

      {/* ── 页眉页脚 ── */}
      <SectionTitle>页眉页脚</SectionTitle>

      <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-3">
        {/* 页眉 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">显示页眉</span>
            <ToggleSwitch
              checked={headerFooter.hasHeader ?? false}
              onChange={(v) => handleHeaderFooterChange({ hasHeader: v })}
              disabled={isBuiltin}
            />
          </div>

          {headerFooter.hasHeader && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">左侧</label>
                <input
                  type="text"
                  value={headerFooter.headerContent?.left ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ headerContent: { ...headerFooter.headerContent, left: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="左侧"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">中间</label>
                <input
                  type="text"
                  value={headerFooter.headerContent?.center ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ headerContent: { ...headerFooter.headerContent, center: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="中间"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">右侧</label>
                <input
                  type="text"
                  value={headerFooter.headerContent?.right ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ headerContent: { ...headerFooter.headerContent, right: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="右侧"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>

        {/* 页脚 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">显示页脚</span>
            <ToggleSwitch
              checked={headerFooter.hasFooter ?? false}
              onChange={(v) => handleHeaderFooterChange({ hasFooter: v })}
              disabled={isBuiltin}
            />
          </div>

          {headerFooter.hasFooter && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">左侧</label>
                <input
                  type="text"
                  value={headerFooter.footerContent?.left ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ footerContent: { ...headerFooter.footerContent, left: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="左侧"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">中间</label>
                <input
                  type="text"
                  value={headerFooter.footerContent?.center ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ footerContent: { ...headerFooter.footerContent, center: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="中间"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">右侧</label>
                <input
                  type="text"
                  value={headerFooter.footerContent?.right ?? ''}
                  onChange={(e) => handleHeaderFooterChange({ footerContent: { ...headerFooter.footerContent, right: e.target.value } })}
                  disabled={isBuiltin}
                  placeholder="右侧"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>

        {/* 选项 */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={headerFooter.differentFirstPage ?? false}
                onChange={(e) => handleHeaderFooterChange({ differentFirstPage: e.target.checked })}
                disabled={isBuiltin}
                className="rounded border-slate-300"
              />
              首页不同
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={headerFooter.differentOddEven ?? false}
                onChange={(e) => handleHeaderFooterChange({ differentOddEven: e.target.checked })}
                disabled={isBuiltin}
                className="rounded border-slate-300"
              />
              奇偶页不同
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { HeaderFooterConfig, FontInfo } from '@/types/editor-template'
import { NumberInput } from './StyleSlotRow'
import { Switch } from '@/components/ui/Switch'

interface HeaderFooterEditorProps {
  headerFooter: HeaderFooterConfig | undefined
  fonts: FontInfo[]
  onChange: (patch: Partial<HeaderFooterConfig>) => void
  disabled?: boolean
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-slate-600">{children}</label>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-slate-500">{children}</span>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <Switch checked={checked} onChange={onChange} disabled={disabled} />
  )
}

/**
 * 页眉页脚编辑器组件（含页码字体字号设置）
 */
export function HeaderFooterEditor({ headerFooter, fonts, onChange, disabled }: HeaderFooterEditorProps) {
  const config = headerFooter ?? {}

  return (
    <div className="space-y-4">
      {/* 页眉设置 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>显示页眉</SectionLabel>
          <ToggleSwitch
            checked={config.hasHeader ?? false}
            onChange={(v) => onChange({ hasHeader: v })}
            disabled={disabled}
          />
        </div>

        {config.hasHeader && (
          <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
            {/* 页眉高度 */}
            <div className="flex items-center gap-2">
              <FieldLabel>页眉高度</FieldLabel>
              <NumberInput
                value={config.headerHeightMm}
                onChange={(v) => onChange({ headerHeightMm: v })}
                min={1}
                max={50}
                step={0.5}
                disabled={disabled}
              />
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <div className="space-y-1">
              <FieldLabel>左侧内容</FieldLabel>
              <input
                type="text"
                value={config.headerContent?.left ?? ''}
                onChange={(e) => onChange({ headerContent: { ...config.headerContent, left: e.target.value } })}
                disabled={disabled}
                placeholder="左侧"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>中间内容</FieldLabel>
              <input
                type="text"
                value={config.headerContent?.center ?? ''}
                onChange={(e) => onChange({ headerContent: { ...config.headerContent, center: e.target.value } })}
                disabled={disabled}
                placeholder="中间"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>右侧内容</FieldLabel>
              <input
                type="text"
                value={config.headerContent?.right ?? ''}
                onChange={(e) => onChange({ headerContent: { ...config.headerContent, right: e.target.value } })}
                disabled={disabled}
                placeholder="右侧"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* 页脚设置 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>显示页脚</SectionLabel>
          <ToggleSwitch
            checked={config.hasFooter ?? false}
            onChange={(v) => onChange({ hasFooter: v })}
            disabled={disabled}
          />
        </div>

        {config.hasFooter && (
          <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
            {/* 页脚高度 */}
            <div className="flex items-center gap-2">
              <FieldLabel>页脚高度</FieldLabel>
              <NumberInput
                value={config.footerHeightMm}
                onChange={(v) => onChange({ footerHeightMm: v })}
                min={1}
                max={50}
                step={0.5}
                disabled={disabled}
              />
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <div className="space-y-1">
              <FieldLabel>左侧内容</FieldLabel>
              <input
                type="text"
                value={config.footerContent?.left ?? ''}
                onChange={(e) => onChange({ footerContent: { ...config.footerContent, left: e.target.value } })}
                disabled={disabled}
                placeholder="左侧"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>中间内容</FieldLabel>
              <input
                type="text"
                value={config.footerContent?.center ?? ''}
                onChange={(e) => onChange({ footerContent: { ...config.footerContent, center: e.target.value } })}
                disabled={disabled}
                placeholder="中间"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>右侧内容</FieldLabel>
              <input
                type="text"
                value={config.footerContent?.right ?? ''}
                onChange={(e) => onChange({ footerContent: { ...config.footerContent, right: e.target.value } })}
                disabled={disabled}
                placeholder="右侧"
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* 页码字体字号设置 */}
      <div className="space-y-3 rounded border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <SectionLabel>页码样式</SectionLabel>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">加粗</span>
            <button
              onClick={() => onChange({ pageNumberBold: !config.pageNumberBold })}
              disabled={disabled}
              className={`rounded px-1.5 py-0.5 text-xs font-bold transition-colors ${
                config.pageNumberBold
                  ? 'bg-slate-700 text-white'
                  : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
              } disabled:opacity-50`}
            >
              B
            </button>
            <span className="text-xs text-slate-400">斜体</span>
            <button
              onClick={() => onChange({ pageNumberItalic: !config.pageNumberItalic })}
              disabled={disabled}
              className={`rounded px-1.5 py-0.5 text-xs italic transition-colors ${
                config.pageNumberItalic
                  ? 'bg-slate-700 text-white'
                  : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
              } disabled:opacity-50`}
            >
              I
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <FieldLabel>字体</FieldLabel>
            <select
              value={config.pageNumberFontFamily ?? ''}
              onChange={(e) => onChange({ pageNumberFontFamily: e.target.value })}
              disabled={disabled}
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
            <FieldLabel>字号(pt)</FieldLabel>
            <NumberInput
              value={config.pageNumberFontSizePt}
              onChange={(v) => onChange({ pageNumberFontSizePt: v })}
              min={8}
              max={72}
              step={1}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FieldLabel>颜色</FieldLabel>
          <input
            type="color"
            value={config.pageNumberColor ?? '#000000'}
            onChange={(e) => onChange({ pageNumberColor: e.target.value })}
            disabled={disabled}
            className="h-6 w-6 cursor-pointer rounded border border-slate-200 disabled:opacity-50"
          />
          {config.pageNumberColor && (
            <span className="text-xs text-slate-400">{config.pageNumberColor.toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* 页眉页脚选项 */}
      <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
        <SectionLabel>选项</SectionLabel>
        <p className="text-xs text-slate-400">以下选项仅影响 Word 导出，预览不体现</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.differentFirstPage ?? false}
              onChange={(e) => onChange({ differentFirstPage: e.target.checked })}
              disabled={disabled}
              className="rounded border-slate-300"
            />
            首页不同
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.differentOddEven ?? false}
              onChange={(e) => onChange({ differentOddEven: e.target.checked })}
              disabled={disabled}
              className="rounded border-slate-300"
            />
            奇偶页不同
          </label>
        </div>
      </div>
    </div>
  )
}

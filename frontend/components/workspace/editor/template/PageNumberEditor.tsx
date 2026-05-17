'use client'

import type { PageNumberConfig } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'
import { Switch } from '@/components/ui/Switch'

interface PageNumberEditorProps {
  pageNumber: PageNumberConfig | undefined
  onChange: (patch: Partial<PageNumberConfig>) => void
  disabled?: boolean
}

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

/**
 * 页码样式编辑器组件
 */
export function PageNumberEditor({ pageNumber, onChange, disabled }: PageNumberEditorProps) {
  const config = pageNumber ?? {}

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">启用页码</label>
        <Switch
          checked={config.enabled ?? false}
          onChange={(v) => onChange({ enabled: v })}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">位置</label>
            <select
              value={config.position ?? 'footer-top'}
              onChange={(e) => onChange({ position: e.target.value as PageNumberConfig['position'] })}
              disabled={disabled}
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
              value={config.align ?? 'center'}
              onChange={(e) => onChange({ align: e.target.value as PageNumberConfig['align'] })}
              disabled={disabled}
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
              value={config.format ?? 'arabic'}
              onChange={(e) => onChange({ format: e.target.value as PageNumberConfig['format'] })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">起始页码</label>
              <input
                type="number"
                min={1}
                value={config.startValue ?? 1}
                onChange={(e) => onChange({ startValue: Number(e.target.value) })}
                disabled={disabled}
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
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">颜色</label>
            <ColorPicker
              value={config.color}
              onChange={(v) => onChange({ color: v })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={config.showOnFirstPage ?? false}
                  onChange={(e) => onChange({ showOnFirstPage: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-slate-300"
                />
                首页显示页码
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={config.continueFromPrevious ?? false}
                  onChange={(e) => onChange({ continueFromPrevious: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-slate-300"
                />
                续前节
              </label>
            </div>
            <p className="text-xs text-slate-400">以上选项仅影响 Word 导出，预览不体现</p>
          </div>

          {/* 章节设置 */}
          <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">章节设置</p>
            <p className="text-xs text-slate-400">以下选项仅影响 Word 导出，预览不体现</p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={config.includeChapterNumber ?? false}
                  onChange={(e) => onChange({ includeChapterNumber: e.target.checked })}
                  disabled={disabled}
                  className="rounded border-slate-300"
                />
                包含章节编号
              </label>
            </div>
            {config.includeChapterNumber && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">章节样式</label>
                  <select
                    value={config.chapterStyle ?? 'heading1'}
                    onChange={(e) => onChange({ chapterStyle: e.target.value as PageNumberConfig['chapterStyle'] })}
                    disabled={disabled}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                  >
                    <option value="heading1">标题 1</option>
                    <option value="heading2">标题 2</option>
                    <option value="heading3">标题 3</option>
                    <option value="body">正文</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">章节分隔符</label>
                  <select
                    value={config.chapterSeparator ?? '-'}
                    onChange={(e) => onChange({ chapterSeparator: e.target.value as PageNumberConfig['chapterSeparator'] })}
                    disabled={disabled}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                  >
                    <option value="-">-（短横线）</option>
                    <option value=".">.（点）</option>
                    <option value="--">--（双横线）</option>
                    <option value=":">:（冒号）</option>
                    <option value="()">()（括号）</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

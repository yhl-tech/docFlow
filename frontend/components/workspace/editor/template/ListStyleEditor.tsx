'use client'

import { useState } from 'react'
import type { ListStyleConfig } from '@/types/editor-template'
import { ColorPicker } from './StyleSlotRow'
import { BoldButton } from './StyleSlotRow'

interface ListStyleEditorProps {
  listStyles: ListStyleConfig | undefined
  fonts: { id: string; name: string }[]
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

const ALIGN_OPTIONS_LIST = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
]

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5">
      <h4 className="mb-3 text-xs font-semibold text-slate-600">{title}</h4>
      {children}
    </div>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 flex-shrink-0 text-xs text-slate-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function CommonListPanel({ listStyles, fonts, onChange, disabled }: {
  listStyles: ListStyleConfig | undefined
  fonts: { id: string; name: string }[]
  onChange: (patch: Partial<ListStyleConfig>) => void
  disabled?: boolean
}) {
  const bullet = listStyles?.bullet
  const ordered = listStyles?.ordered

  const patchBullet = (p: Partial<NonNullable<ListStyleConfig['bullet']>>) =>
    onChange({ bullet: { ...bullet, ...p } })
  const patchOrdered = (p: Partial<NonNullable<ListStyleConfig['ordered']>>) =>
    onChange({ ordered: { ...ordered, ...p } })
  const patchBoth = (bp: Partial<NonNullable<ListStyleConfig['bullet']>>, op: Partial<NonNullable<ListStyleConfig['ordered']>>) =>
    onChange({ bullet: { ...bullet, ...bp }, ordered: { ...ordered, ...op } })

  return (
    <div className="space-y-3">
      <SectionCard title="字体样式">
        <div className="space-y-2.5">
          <FieldRow label="字体">
            <select
              value={bullet?.fontFamily ?? ordered?.fontFamily ?? ''}
              onChange={(e) => patchBoth(
                { fontFamily: e.target.value || undefined },
                { fontFamily: e.target.value || undefined },
              )}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认字体</option>
              {fonts.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="字号">
            <select
              value={bullet?.fontSizePt ?? ordered?.fontSizePt ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                patchBoth({ fontSizePt: v || undefined }, { fontSizePt: v || undefined })
              }}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认</option>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="颜色">
            <ColorPicker
              value={bullet?.color ?? ordered?.color ?? ''}
              onChange={(v) => patchBoth({ color: v }, { color: v })}
              disabled={disabled}
            />
          </FieldRow>
          <FieldRow label="加粗">
            <BoldButton
              active={bullet?.bold ?? ordered?.bold ?? false}
              disabled={disabled}
              onClick={() => {
                const next = !(bullet?.bold ?? ordered?.bold ?? false)
                patchBoth({ bold: next }, { bold: next })
              }}
            />
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard title="标记符号">
        <div className="space-y-2.5">
          <FieldRow label="无序列表">
            <select
              value={bullet?.character ?? '●'}
              onChange={(e) => patchBullet({ character: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {BULLET_CHARS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="有序列表">
            <select
              value={ordered?.format ?? '1.'}
              onChange={(e) => patchOrdered({ format: e.target.value })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {NUMBER_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </FieldRow>
          {/* 有序列表对齐方式 */}
          <FieldRow label="对齐方式">
            <select
              value={ordered?.align ?? 'left'}
              onChange={(e) => patchOrdered({ align: e.target.value as 'left' | 'center' | 'right' })}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {ALIGN_OPTIONS_LIST.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </FieldRow>
          {/* 有序列表编号后自动生成 */}
          <FieldRow label="自动生成">
            <div className="space-y-0.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ordered?.autoGenerateAfter ?? false}
                  onChange={(e) => patchOrdered({ autoGenerateAfter: e.target.checked })}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-700"
                />
                <span className="text-xs text-slate-500">编号后自动生成</span>
              </label>
              <p className="pl-6 text-xs text-slate-400">仅影响 Word 导出</p>
            </div>
          </FieldRow>
          {/* 有序列表继续编号 */}
          <FieldRow label="继续编号">
            <div className="space-y-0.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ordered?.continueNumbering ?? false}
                  onChange={(e) => patchOrdered({ continueNumbering: e.target.checked })}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-700"
                />
                <span className="text-xs text-slate-500">续前表编号</span>
              </label>
              <p className="pl-6 text-xs text-slate-400">仅影响 Word 导出</p>
            </div>
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard title="间距">
        <div className="space-y-2.5">
          <FieldRow label="缩进">
            <select
              value={bullet?.indentCm ?? ordered?.indentCm ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                patchBoth({ indentCm: v || undefined }, { indentCm: v || undefined })
              }}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认</option>
              {[0.63, 1.27, 1.9, 2.54, 3.18, 3.81, 4.45].map((v) => (
                <option key={v} value={v}>{v} cm</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="项前距">
            <select
              value={bullet?.spacingBeforeLines ?? ordered?.spacingBeforeLines ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                patchBoth({ spacingBeforeLines: v || undefined }, { spacingBeforeLines: v || undefined })
              }}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认</option>
              {[0, 0.5, 1, 1.5, 2, 3].map((v) => (
                <option key={v} value={v}>{v} 行</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="项后距">
            <select
              value={bullet?.spacingAfterLines ?? ordered?.spacingAfterLines ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                patchBoth({ spacingAfterLines: v || undefined }, { spacingAfterLines: v || undefined })
              }}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              <option value="">默认</option>
              {[0, 0.5, 1, 1.5, 2, 3].map((v) => (
                <option key={v} value={v}>{v} 行</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="行间距">
            <select
              value={bullet?.lineSpacing ?? ordered?.lineSpacing ?? 1.0}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                patchBoth({ lineSpacing: v }, { lineSpacing: v })
              }}
              disabled={disabled}
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
            >
              {[1.0, 1.15, 1.5, 2.0, 2.5, 3.0].map((v) => (
                <option key={v} value={v}>{v}x ({v === 1.0 ? '单倍' : v === 1.5 ? '1.5倍' : v === 2.0 ? '2倍' : `${v}倍`})</option>
              ))}
            </select>
          </FieldRow>
        </div>
      </SectionCard>
    </div>
  )
}

export function ListStyleEditor({ listStyles, fonts, onChange, disabled }: ListStyleEditorProps) {
  const [activeTab, setActiveTab] = useState<'bullet' | 'ordered'>('bullet')

  return (
    <div className="space-y-3">
      {/* Tab 切换 */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {(['bullet', 'ordered'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={disabled}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              activeTab === tab
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'bullet' ? '无序列表' : '有序列表'}
          </button>
        ))}
      </div>

      <CommonListPanel
        listStyles={listStyles}
        fonts={fonts}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

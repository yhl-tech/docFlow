'use client'

import {
  Palette, Type, AlignLeft, List, LayoutTemplate,
  Hash, Table, Image, Code2,
} from 'lucide-react'

export type EditSection =
  | 'styles' | 'headingStyles' | 'paragraph' | 'listStyles'
  | 'layout' | 'pageNumber' | 'table' | 'image' | 'codeBlock'

const NAV_GROUPS: { label: string; items: { key: EditSection; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: '文字',
    items: [
      { key: 'styles', label: '默认样式', icon: Palette },
      { key: 'headingStyles', label: '标题样式', icon: Type },
      { key: 'paragraph', label: '段落样式', icon: AlignLeft },
      { key: 'listStyles', label: '列表样式', icon: List },
    ],
  },
  {
    label: '页面',
    items: [
      { key: 'layout', label: '页面布局', icon: LayoutTemplate },
      { key: 'pageNumber', label: '页码', icon: Hash },
    ],
  },
  {
    label: '元素',
    items: [
      { key: 'table', label: '表格', icon: Table },
      { key: 'image', label: '图片', icon: Image },
      { key: 'codeBlock', label: '代码块', icon: Code2 },
    ],
  },
]

interface TemplateEditNavProps {
  activeSection: EditSection
  onSelect: (section: EditSection) => void
}

export function TemplateEditNav({ activeSection, onSelect }: TemplateEditNavProps) {
  return (
    <div className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-slate-100 bg-slate-50/50">
      <div className="py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <nav className="space-y-0.5 px-1">
              {group.items.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key
                return (
                  <button
                    key={key}
                    onClick={() => onSelect(key)}
                    className={`
                      group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all
                      ${active
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/60'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
                      }
                    `}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {label}
                  </button>
                )
              })}
            </nav>
          </div>
        ))}
      </div>
    </div>
  )
}

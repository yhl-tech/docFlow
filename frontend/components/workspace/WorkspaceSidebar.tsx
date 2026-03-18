'use client'

import Link from 'next/link'
import { Plus, Gem, Clock, Download, Headphones, FileText } from 'lucide-react'

const navItems = [
  { icon: Plus, label: '新建对话', action: true },
  { icon: Gem, label: '会员套餐', href: '/pricing' },
  { icon: Clock, label: '历史记录', action: true },
  { icon: Download, label: '转换记录', href: '/records' },
  { icon: Headphones, label: '联系客服', action: true },
]

export function WorkspaceSidebar() {
  return (
    <aside className="relative z-20 flex w-14 flex-shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white/80 py-4 backdrop-blur-sm">
      {/* Logo - 精致渐变 */}
      <Link
        href="/"
        className="group mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-slate-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30 transition-all hover:shadow-lg hover:shadow-blue-500/30"
      >
        <FileText className="h-5 w-5" />
      </Link>

      <div className="my-1 h-px w-6 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {/* 导航图标 */}
      {navItems.map(({ icon: Icon, label, href }) => {
        const baseCls =
          'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-blue-600'
        if (href) {
          return (
            <Link key={label} href={href} className={baseCls} title={label}>
              <Icon className="h-5 w-5" />
            </Link>
          )
        }
        return (
          <button key={label} className={baseCls} title={label}>
            <Icon className="h-5 w-5" />
          </button>
        )
      })}

      {/* 底部用户头像 */}
      <div className="mt-auto">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-600 ring-1 ring-blue-100 transition-all hover:border-blue-300 hover:bg-blue-100"
          title="个人中心"
        >
          DF
        </button>
      </div>
    </aside>
  )
}

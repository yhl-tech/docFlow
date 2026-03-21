'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'
import { WorkspaceUserMenu } from './WorkspaceUserMenu'
import { UpgradeModal } from '@/components/pricing/UpgradeModal'

interface WorkspaceHeaderProps {
  /** 创作工作台标题 */
  title?: string
}

export function WorkspaceHeader({ title = '创作工作台' }: WorkspaceHeaderProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  return (
    <>
      <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
        </div>

        {/* 右侧：会员 + 用户菜单（导出与全屏在下方编辑器工具栏） */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>会员</span>
          </button>

          <div className="ml-1">
            <WorkspaceUserMenu />
          </div>
        </div>
      </header>

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab="member"
      />
    </>
  )
}

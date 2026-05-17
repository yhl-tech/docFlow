'use client'

import { FileText, LayoutTemplate, HelpCircle, Crown } from 'lucide-react'
import { WorkspaceNavItem } from './WorkspaceNavItem'

export type { NavPanelId } from '@/store/workspaceNavStore'

const TOP_ITEMS = [
  { id: 'files' as const, icon: FileText, label: '我的文档' },
  { id: 'templates' as const, icon: LayoutTemplate, label: '模板市场' },
] as const

interface WorkspaceNavProps {
  activeId: string | null
  panelOpen: boolean
  aiPanelOpen: boolean
  onNavClick: (id: 'files' | 'templates') => void
  onAIClick: () => void
  onUpgradeClick: () => void
}

export function WorkspaceNav({ activeId, panelOpen, onNavClick, aiPanelOpen: _aiPanelOpen, onAIClick: _onAIClick, onUpgradeClick }: WorkspaceNavProps) {
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-white py-3">
      {TOP_ITEMS.map((item) => (
        <WorkspaceNavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          isActive={activeId === item.id && panelOpen}
          onClick={() => onNavClick(item.id)}
        />
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          onClick={onUpgradeClick}
          title="会员"
          className="flex h-10 w-10 flex-col items-center justify-center rounded-lg text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Crown size={20} />
        </button>
        <WorkspaceNavItem icon={HelpCircle} label="帮助" isActive={false} onClick={() => {}} />
      </div>
    </nav>
  )
}

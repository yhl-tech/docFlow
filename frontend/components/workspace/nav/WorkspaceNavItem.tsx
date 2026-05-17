'use client'

import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceNavItemProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}

export function WorkspaceNavItem({ icon: Icon, label, isActive, onClick }: WorkspaceNavItemProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'relative flex h-10 w-10 flex-col items-center justify-center rounded-lg transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      )}
    >
      <Icon size={20} />
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-blue-600" />
      )}
    </button>
  )
}

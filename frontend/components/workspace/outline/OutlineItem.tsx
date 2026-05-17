'use client'

import { cn } from '@/lib/utils'
import type { OutlineItem as OutlineItemType } from '@/hooks/useDocumentOutline'

interface OutlineItemProps {
  item: OutlineItemType
  isActive: boolean
  onClick: () => void
}

export function OutlineItem({ item, isActive, onClick }: OutlineItemProps) {
  const indent = (item.level - 1) * 12

  return (
    <button
      onClick={onClick}
      style={{ paddingLeft: 8 + indent }}
      className={cn(
        'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-xs transition-colors',
        isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900',
        item.level === 1 ? 'font-medium' : 'font-normal',
      )}
    >
      {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
      {!isActive && <span className="h-1.5 w-1.5 shrink-0" />}
      <span className="truncate">{item.text}</span>
    </button>
  )
}

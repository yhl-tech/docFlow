'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface NodeContextMenuProps {
  items: MenuItem[]
  className?: string
}

export function NodeContextMenu({ items, className }: NodeContextMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <button
        className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 min-w-[140px] rounded-md border bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              className={cn(
                'flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50',
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700',
              )}
              onClick={() => { item.onClick(); setOpen(false) }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

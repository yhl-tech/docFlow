'use client'

import { Search, X } from 'lucide-react'

interface FileManagerSearchProps {
  value: string
  onChange: (v: string) => void
}

export function FileManagerSearch({ value, onChange }: FileManagerSearchProps) {
  return (
    <div className="relative mx-2 mb-1">
      <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索文档…"
        className="h-7 w-full rounded-md border bg-gray-50 pl-7 pr-6 text-xs outline-none focus:border-blue-400 focus:bg-white"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

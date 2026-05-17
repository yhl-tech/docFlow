'use client'

import { useEffect, useRef } from 'react'

interface InlineRenameInputProps {
  defaultValue: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InlineRenameInput({ defaultValue, onConfirm, onCancel }: InlineRenameInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = ref.current?.value.trim()
      if (val) onConfirm(val)
      else onCancel()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const val = ref.current?.value.trim()
        if (val && val !== defaultValue) onConfirm(val)
        else onCancel()
      }}
      onClick={(e) => e.stopPropagation()}
      className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm outline-none"
    />
  )
}

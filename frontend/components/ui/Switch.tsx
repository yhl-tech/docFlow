'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, disabled, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className={`
        group relative h-5 w-9 flex-shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1
        data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-slate-200
        disabled:cursor-not-allowed disabled:opacity-50
        ${className ?? ''}
      `}
    >
      <SwitchPrimitive.Thumb
        className={`
          pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out
          translate-x-0.5 will-change-transform
          group-data-[state=checked]:translate-x-4
        `}
      />
    </SwitchPrimitive.Root>
  )
}

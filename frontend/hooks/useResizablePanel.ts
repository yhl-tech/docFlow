import { useState, useCallback } from 'react'

export function useResizablePanel(key: string, defaultWidth = 280) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth
    return Number(localStorage.getItem(key)) || defaultWidth
  })

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = width

      const onMove = (ev: MouseEvent) => {
        const next = Math.min(360, Math.max(240, startW + ev.clientX - startX))
        setWidth(next)
      }

      const onUp = () => {
        localStorage.setItem(key, String(width))
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [width, key],
  )

  return { width, startResize }
}

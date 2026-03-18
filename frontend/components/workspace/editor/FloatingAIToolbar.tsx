'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const expandSubmenu = ['简单扩写', '丰富细节', '增加论据']
const toneSubmenu = ['向上汇报', '向下传达', '对外宣传', '口语化']
const translateSubmenu = ['中译英', '英译中', '中译日']

interface FloatingAIToolbarProps {
  onAction?: (action: string, option?: string) => void
  isLoading?: boolean
  scopeRef?: RefObject<HTMLElement>
}

export function FloatingAIToolbar({ onAction, isLoading, scopeRef }: FloatingAIToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false)
        setOpenSubmenu(null)
        return
      }
      const range = sel.getRangeAt(0)
      // 若指定了 scopeRef，只在其内部选中时显示
      if (scopeRef?.current && !scopeRef.current.contains(range.commonAncestorContainer)) {
        setVisible(false)
        setOpenSubmenu(null)
        return
      }
      // position: fixed 使用视口坐标，getBoundingClientRect 已是视口坐标
      // 菜单位于选中文字下方，避免遮挡编辑内容
      const rect = range.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      })
      setVisible(true)
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  // 点击外部关闭子菜单
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!visible) return null

  function btn(label: string, submenu?: string[]) {
    const isOpen = openSubmenu === label
    return (
      <div key={label} className="relative">
        <button
          disabled={isLoading}
          onMouseDown={(e) => {
            e.preventDefault()
            if (isLoading) return
            if (submenu) {
              setOpenSubmenu(isOpen ? null : label)
            } else {
              onAction?.(label)
              setVisible(false)
            }
          }}
          className="flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-primary rounded transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {label}
          {submenu && <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400" />}
        </button>

        {submenu && isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-[100000] min-w-24">
            {submenu.map((item) => (
              <button
                key={item}
                disabled={isLoading}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (isLoading) return
                  onAction?.(label, item)
                  setVisible(false)
                  setOpenSubmenu(null)
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const toolbarEl = (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 99999,
      }}
      className="flex items-center gap-0.5 rounded-lg border border-slate-100 bg-white px-1 py-0.5 shadow-xl shadow-slate-200/30"
    >
      {btn('改写')}
      <div className="w-px h-3.5 bg-gray-200" />
      {btn('扩写', expandSubmenu)}
      <div className="w-px h-3.5 bg-gray-200" />
      {btn('缩写')}
      <div className="w-px h-3.5 bg-gray-200" />
      {btn('改变语气', toneSubmenu)}
      <div className="w-px h-3.5 bg-gray-200" />
      {btn('翻译', translateSubmenu)}
      <div className="w-px h-3.5 bg-gray-200" />
      {btn('润色')}
    </div>
  )

  // 使用 Portal 渲染到 body，避免被父级 overflow 或拖拽分割线遮挡
  if (typeof document === 'undefined') return null
  return createPortal(toolbarEl, document.body)
}

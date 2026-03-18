'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Sigma } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { toast } from 'sonner'

interface EditingFormula {
  latex: string
  displayMode: boolean
  pos: number
}

interface MathFormulaDialogProps {
  editorRef: RefObject<Editor | null>
  editingFormula?: EditingFormula | null
  onClearEdit?: () => void
}

export function MathFormulaDialog({ editorRef, editingFormula, onClearEdit }: MathFormulaDialogProps) {
  const [open, setOpen]             = useState(false)
  const [mode, setMode]             = useState<'inline' | 'block'>('block')
  const [latexValue, setLatexValue] = useState('')
  const [loaded, setLoaded]         = useState(false)
  const containerRef                = useRef<HTMLDivElement>(null)
  const mathFieldRef                = useRef<any>(null)

  const isEditing = open && editingFormula != null

  /* ── 收到外部 editingFormula 时，自动开启弹窗并回显内容 ── */
  useEffect(() => {
    if (!editingFormula) return
    setMode(editingFormula.displayMode ? 'block' : 'inline')
    setLatexValue(editingFormula.latex)
    setOpen(true)
  }, [editingFormula])

  /* ── 全局快捷键 Ctrl+Alt+M 打开公式弹窗 ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'm') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /* ── Step 1: 首次打开时动态加载 mathlive（避免 SSR 报错） ── */
  useEffect(() => {
    if (open && !loaded) {
      import('mathlive').then(() => setLoaded(true))
    }
  }, [open, loaded])

  /* ── 弹窗打开时提高虚拟键盘 z-index，确保显示在遮罩之上 ── */
  useEffect(() => {
    if (!open) return
    document.body.style.setProperty('--keyboard-zindex', '10000')
    return () => { document.body.style.removeProperty('--keyboard-zindex') }
  }, [open])

  /* ── Step 2: mathlive 加载完成且弹窗打开后，挂载 <math-field> 元素 ── */
  useEffect(() => {
    if (!open || !loaded || !containerRef.current) return

    const mf: any = document.createElement('math-field')
    mf.style.cssText = [
      'width: 100%',
      'font-size: 1.25rem',
      'padding: 12px 16px',
      'border: none',
      'outline: none',
      'min-height: 56px',
      'display: block',
    ].join(';')
    // 兼容旧版（virtual-keyboard-mode）与新版（math-virtual-keyboard-policy）API
    mf.setAttribute('virtual-keyboard-mode', 'manual')
    mf.setAttribute('math-virtual-keyboard-policy', 'manual')
    // 显式启用 inline shortcuts（/ 分数、^ 上标、_ 下标等）
    mf.setAttribute('inline-shortcut-timeout', '500')

    const syncValue = () => setLatexValue(mf.value ?? '')
    mf.addEventListener('input', syncValue)

    // 聚焦时，显式将虚拟键盘目标指向本 math-field（新版 API）
    const onFocusIn = () => {
      const vk = (window as any).mathVirtualKeyboard
      if (vk) vk.targetElement = mf
    }
    mf.addEventListener('focusin', onFocusIn)

    // 失焦时，若虚拟键盘仍可见则立即恢复焦点，防止按键输入丢失
    const onBlur = () => {
      const vk = (window as any).mathVirtualKeyboard
      if (vk?.visible) {
        requestAnimationFrame(() => mathFieldRef.current?.focus())
      }
    }
    mf.addEventListener('blur', onBlur)

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(mf)
    mathFieldRef.current = mf

    // 回显公式：将已有 latex 填入 math-field
    const initialLatex = editingFormula?.latex ?? ''
    if (initialLatex) {
      const fillTimer = setTimeout(() => {
        mf.value = initialLatex
        setLatexValue(initialLatex)
      }, 60)
      const focusTimer = setTimeout(() => mf.focus(), 120)
      return () => {
        clearTimeout(fillTimer)
        clearTimeout(focusTimer)
        mf.removeEventListener('input', syncValue)
        mf.removeEventListener('focusin', onFocusIn)
        mf.removeEventListener('blur', onBlur)
        mathFieldRef.current = null
      }
    }

    const focusTimer = setTimeout(() => mf.focus(), 80)
    return () => {
      clearTimeout(focusTimer)
      mf.removeEventListener('input', syncValue)
      mf.removeEventListener('focusin', onFocusIn)
      mf.removeEventListener('blur', onBlur)
      mathFieldRef.current = null
    }
  }, [open, loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    const vk = (window as any).mathVirtualKeyboard
    if (vk) vk.hide()
    setOpen(false)
    setLatexValue('')
    onClearEdit?.()
  }

  function handleConfirm() {
    const latex = latexValue.trim()
    if (!latex) return
    const editor = editorRef.current
    if (!editor) return

    if (editingFormula) {
      // 更新已有节点：直接修改属性，避免删除再插入导致光标跳动
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(editingFormula.pos, undefined, {
          latex,
          displayMode: mode === 'block',
        }),
      )
      toast.success('公式已更新')
    } else {
      editor.chain().focus().insertKaTeX(latex, mode === 'block').run()
      // toast.success('公式已插入')
    }

    handleClose()
  }

  return (
    <>
      {/* 工具栏按钮 */}
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen(true) }}
        title="插入 LaTeX 公式 (Ctrl+Alt+M)"
        className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Sigma className="w-3.5 h-3.5" />
      </button>

      {/* 弹窗：用 Portal 挂载到 body，避免被分割线或父级 overflow 遮挡 */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-[9999]">
          <div className="bg-white rounded-xl shadow-xl w-[580px] p-6">

            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {isEditing ? '编辑公式' : '插入公式'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
              >×</button>
            </div>

            {/* 提示 */}
            <div className="bg-blue-50 rounded-lg px-4 py-2.5 mb-4 text-xs text-blue-700 flex items-start gap-2">
              <span className="mt-0.5 select-none">💡</span>
              <span>
                在下方输入框内输入公式。快捷键：
                <code className="bg-blue-100 px-1 rounded mx-0.5">/</code> 分数、
                <code className="bg-blue-100 px-1 rounded mx-0.5">^</code> 上标、
                <code className="bg-blue-100 px-1 rounded mx-0.5">_</code> 下标、
                <code className="bg-blue-100 px-1 rounded mx-0.5">Alt+V</code> 根号。
                打开弹窗：
                <code className="bg-blue-100 px-1 rounded mx-0.5">Ctrl+Alt+M</code>。
                点击右下角键盘图标可展开虚拟键盘。
              </span>
            </div>

            {/* MathLive 输入区 */}
            <div className="border rounded-lg overflow-hidden min-h-[60px] bg-white">
              {!loaded
                ? <div className="p-4 text-center text-gray-400 text-sm">加载中...</div>
                : <div ref={containerRef} className="min-h-[56px]" />
              }
            </div>

            {/* LaTeX 代码实时预览 */}
            <div className="mt-2 h-5 text-xs text-gray-400 font-mono px-1 truncate">
              {latexValue
                ? <><span className="text-gray-300">LaTeX：</span>{latexValue}</>
                : <span className="text-gray-300">LaTeX 代码将在此处显示…</span>
              }
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!latexValue.trim()}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isEditing ? '更新公式' : '插入公式'}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  )
}

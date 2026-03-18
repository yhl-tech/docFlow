'use client'

import { useRef, useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { FloatingAIToolbar } from './FloatingAIToolbar'

export function EditorContent() {
  const { content, setContent } = useEditorStore()
  const editorRef = useRef<HTMLDivElement>(null)
  // 避免 setContent 引发光标跳回头部
  const isComposing = useRef(false)

  // 初始化时同步外部 content（如工作台 AI 生成内容填入）
  useEffect(() => {
    if (!editorRef.current) return
    // 只在内容真正不同时才强制更新 DOM
    if (editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput() {
    if (!editorRef.current || isComposing.current) return
    setContent(editorRef.current.innerHTML)
  }

  return (
    // 灰色外壳（类似 Word 背景）
    <div className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6 relative">
      {/* 白色纸张 */}
      <div
        className="bg-white min-h-full mx-auto shadow-sm rounded-sm"
        style={{ maxWidth: 680, minHeight: 'calc(100vh - 260px)' }}
      >
        {/* contentEditable 编辑区 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onCompositionStart={() => { isComposing.current = true }}
          onCompositionEnd={() => {
            isComposing.current = false
            handleInput()
          }}
          data-placeholder="在此输入或粘贴内容，AI 生成的内容也会显示在这里..."
          className="
            editor-document
            outline-none px-12 py-10
            text-sm text-gray-800 leading-7
            min-h-[600px]
          "
        />
      </div>

      {/* AI 浮动工具栏（全局监听文字选中） */}
      <FloatingAIToolbar />
    </div>
  )
}

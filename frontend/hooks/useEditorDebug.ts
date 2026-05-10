'use client'

import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'

interface EditorDebugInfo {
  previewConfig: any
  draftTemplateConfig: any
  templateBinding: any
  templatePanelOpen: boolean
  imageStyles: any
  headingStyles: any
  layout: any
  paragraphStyles: any
  tableStyles: any
  cssVariables: Record<string, string>
}

// 监听编辑器配置变化的 hook
export function useEditorDebug(onUpdate?: (info: EditorDebugInfo) => void) {
  const lastInfoRef = useRef<string>('')

  useEffect(() => {
    // 初始触发
    const emit = () => {
      const state = useEditorStore.getState()
      const previewConfig = state.templatePanelOpen 
        ? state.draftTemplateConfig 
        : state.templateBinding?.configSnapshot ?? null

      const info: EditorDebugInfo = {
        previewConfig,
        draftTemplateConfig: state.draftTemplateConfig,
        templateBinding: state.templateBinding,
        templatePanelOpen: state.templatePanelOpen,
        imageStyles: previewConfig?.imageStyles,
        headingStyles: previewConfig?.headingStyles,
        layout: previewConfig?.layout,
        paragraphStyles: previewConfig?.paragraphStyles,
        tableStyles: previewConfig?.tableStyles,
        cssVariables: {},
      }

      const serialized = JSON.stringify(info)
      if (serialized !== lastInfoRef.current) {
        lastInfoRef.current = serialized
        onUpdate?.(info)
      }
    }

    // 立即执行一次
    emit()

    // 订阅 store 变化
    const unsubscribe = useEditorStore.subscribe(emit)

    return () => {
      unsubscribe()
    }
  }, [onUpdate])
}

// 打印调试信息的函数
export function logEditorDebug(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EditorDebug] ${label}:`, data)
  }
}

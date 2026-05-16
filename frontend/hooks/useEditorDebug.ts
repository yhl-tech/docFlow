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
  tableCssVariables: Record<string, string>  // 表格相关的 CSS 变量
  allCssVariables: Record<string, string>     // 所有 CSS 变量
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

      // 获取 .tpl-paper 容器上的 CSS 变量
      const tplPaper = document.querySelector('.tpl-paper') as HTMLElement | null
      const allCssVars: Record<string, string> = {}
      const tableCssVars: Record<string, string> = {}
      
      if (tplPaper) {
        const style = tplPaper.style
        for (const prop of style) {
          const value = style.getPropertyValue(prop)
          allCssVars[prop] = value
          if (prop.startsWith('--tpl-table')) {
            tableCssVars[prop] = value
          }
        }
      }

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
        cssVariables: allCssVars,
        tableCssVariables: tableCssVars,
        allCssVariables: allCssVars,
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

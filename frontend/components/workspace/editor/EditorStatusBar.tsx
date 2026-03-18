'use client'

import { useEditorStore, getEditorStats } from '@/store/editorStore'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export function EditorStatusBar() {
  const { content, countWithSpaces, exportStatus, exportMessage } =
    useEditorStore()

  const { charCount, lineCount } = getEditorStats(content, countWithSpaces)

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-white px-4 py-2 text-xs text-slate-400">
      {/* 左侧：导出状态 */}
      <div className="flex items-center gap-1.5">
        {exportStatus === 'loading' && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-primary">{exportMessage || '导出中，请稍候...'}</span>
          </>
        )}
        {exportStatus === 'success' && (
          <>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-green-600">{exportMessage || '导出成功'}</span>
          </>
        )}
        {exportStatus === 'error' && (
          <>
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-500">{exportMessage || '导出失败'}</span>
          </>
        )}
      </div>

      {/* 右侧：字符数 + 行数 */}
      <div className="flex items-center gap-3 text-slate-400">
        <span>{charCount.toLocaleString()} 字符</span>
        <span>{lineCount} 行</span>
      </div>
    </div>
  )
}

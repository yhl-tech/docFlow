import { create } from 'zustand'

export type ExportFormat = 'docx' | 'pdf' | 'excel' | 'image'
export type ExportStatus = 'idle' | 'loading' | 'success' | 'error'
export type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

interface EditorState {
  // 编辑器内容
  content: string
  setContent: (content: string) => void

  // 全屏编辑模式
  isFullscreen: boolean
  setFullscreen: (isFullscreen: boolean) => void
  toggleFullscreen: () => void

  // 导出状态
  exportStatus: ExportStatus
  exportMessage: string
  setExportStatus: (status: ExportStatus, message?: string) => void

  // 文件上传状态
  uploadStatus: UploadStatus
  uploadMessage: string
  setUploadStatus: (status: UploadStatus, message?: string) => void

  // 字数统计模式：含空格 / 不含空格
  countWithSpaces: boolean
  toggleCountMode: () => void

  // 清空内容（返回旧内容，供撤销用）
  clearContent: () => string
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: '',
  setContent: (content) => set({ content }),

  isFullscreen: false,
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  exportStatus: 'idle',
  exportMessage: '',
  setExportStatus: (exportStatus, exportMessage = '') => {
    set({ exportStatus, exportMessage })
    if (exportStatus === 'success' || exportStatus === 'error') {
      setTimeout(() => set({ exportStatus: 'idle', exportMessage: '' }), 2000)
    }
  },

  uploadStatus: 'idle',
  uploadMessage: '',
  setUploadStatus: (uploadStatus, uploadMessage = '') =>
    set({ uploadStatus, uploadMessage }),

  countWithSpaces: true,
  toggleCountMode: () =>
    set((s) => ({ countWithSpaces: !s.countWithSpaces })),

  clearContent: () => {
    const prev = get().content
    set({ content: '' })
    return prev
  },
}))

// 派生计算：字符数、行数
export function getEditorStats(content: string, withSpaces: boolean) {
  const charCount = withSpaces
    ? content.length
    : content.replace(/\s/g, '').length
  const lineCount = content ? content.split('\n').length : 0
  return { charCount, lineCount }
}

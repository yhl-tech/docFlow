/**
 * 从 Markdown 第一行提取标题作为文件名
 * 示例：`# 工作周报` → `工作周报_260304152300.docx`
 */
export function extractFilename(markdown: string, ext: string): string {
  const firstLine = markdown.split('\n')[0] ?? ''
  const title = firstLine.replace(/^#+\s*/, '').trim().slice(0, 30) || 'document'
  const ts = new Date().toISOString().replace(/\D/g, '').slice(2, 14) // YYMMDDHHmmss
  return `${title}_${ts}.${ext}`
}

/**
 * 触发浏览器下载 Blob 文件
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

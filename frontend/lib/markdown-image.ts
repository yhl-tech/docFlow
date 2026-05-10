/**
 * Base64 图片处理工具
 * 用于将 markdown 中的 Base64 图片转换为服务器 URL
 */

import { editorService } from '@/lib/api'

/**
 * 从 Base64 数据 URL 中提取 MIME 类型和二进制数据
 */
function parseBase64DataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

/**
 * 将 Base64 字符串转换为 File 对象
 */
function base64ToFile(base64Data: string, mimeType: string): File {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const extension = mimeType.split('/')[1] || 'png'
  const filename = `image.${extension}`
  return new File([byteArray], filename, { type: mimeType })
}

/**
 * 处理 markdown 内容，将 Base64 图片替换为服务器 URL
 * 返回处理后的 markdown 和上传进度信息
 */
export async function replaceBase64Images(
  markdown: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ markdown: string; imageCount: number }> {
  // 匹配 markdown 图片语法中的 Base64 URL
  const imageRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g
  const matches = [...markdown.matchAll(imageRegex)]

  if (matches.length === 0) {
    return { markdown, imageCount: 0 }
  }

  const processedMarkdown = markdown
  const uploadTasks: { match: RegExpMatchArray; file: File; altText: string }[] = []

  for (const match of matches) {
    const [fullMatch, altText, dataUrl] = match
    const parsed = parseBase64DataUrl(dataUrl)
    if (!parsed) {
      console.warn('无法解析 Base64 数据 URL:', dataUrl.substring(0, 50) + '...')
      continue
    }

    const file = base64ToFile(parsed.data, parsed.mimeType)
    uploadTasks.push({ match, file, altText })
  }

  if (uploadTasks.length === 0) {
    return { markdown, imageCount: matches.length }
  }

  // 并行上传所有图片
  const uploadPromises = uploadTasks.map(async ({ match, file, altText }) => {
    try {
      const result = await editorService.uploadImage(file)
      return {
        original: match[0],
        replacement: `![${altText}](${result.url})`,
        success: true,
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      return {
        original: match[0],
        replacement: match[0], // 失败时保留原 Base64
        success: false,
      }
    }
  })

  const results = await Promise.all(uploadPromises)

  // 替换 markdown 中的 Base64 URL 为服务器 URL（从后往前替换，避免位置偏移）
  let finalMarkdown = processedMarkdown
  const sortedResults = [...results].sort((a, b) => {
    const aIndex = finalMarkdown.indexOf(a.original)
    const bIndex = finalMarkdown.indexOf(b.original)
    return bIndex - aIndex // 从后往前
  })

  for (const result of sortedResults) {
    finalMarkdown = finalMarkdown.replace(result.original, result.replacement)
  }

  return { markdown: finalMarkdown, imageCount: results.length }
}

/**
 * 检查 markdown 是否包含 Base64 图片
 */
export function hasBase64Images(markdown: string): boolean {
  return /!\[([^\]]*)\]\((data:[^)]+)\)/.test(markdown)
}

/**
 * 计算 markdown 中 Base64 图片的数量
 */
export function countBase64Images(markdown: string): number {
  const matches = markdown.match(/!\[([^\]]*)\]\((data:[^)]+)\)/g)
  return matches ? matches.length : 0
}

export default {
  replaceBase64Images,
  hasBase64Images,
  countBase64Images,
}

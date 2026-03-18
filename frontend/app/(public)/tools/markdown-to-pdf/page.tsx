import type { Metadata } from 'next'
import { ToolLayout } from '@/components/tools/ToolLayout'
import { ToolEditor } from '@/components/tools/ToolEditor'

export const metadata: Metadata = {
  title: 'Markdown 转 PDF - 一键将 Markdown 转换为高质量 PDF',
  description:
    '专业排版引擎，支持自定义页边距，代码语法高亮，智能分页，中文完美支持。解决AI平台导出PDF超大问题。',
}

const FEATURES = [
  { icon: '🖨️', title: '专业排版引擎', desc: '提供极致的排版引擎，支持自定义页边距，画质不压缩' },
  { icon: '💻', title: '代码语法高亮', desc: '支持数十种编程语言，带颜色的代码块' },
  { icon: '📄', title: '智能分页', desc: '防止表格、段落、代码块在页面中间断裂' },
  { icon: '🌐', title: '无需安装', desc: '直接在浏览器中使用，支持桌面和移动设备' },
]

const SCENARIOS = ['简历格式化和提交', '保留 AI 生成的长文本内容', '打印就绪的材料（无质量损失）']

const FAQ = [
  { q: '支持中文吗？', a: '完全支持，内置 CJK 字体，中英混排正常显示。' },
  { q: 'PDF 体积会很大吗？', a: '不会，我们使用专业排版引擎，文件体积合理压缩。' },
  { q: '可以自定义页面尺寸吗？', a: '支持 A4 和 Letter 两种尺寸。' },
]

export default function MarkdownToPdfPage() {
  return (
    <ToolLayout
      title="Markdown 转 PDF"
      subtitle="一键将 Markdown 文本转换为高质量 PDF 文件"
      features={FEATURES}
      scenarios={SCENARIOS}
      faq={FAQ}
    >
      <ToolEditor exportFormats={['pdf']} />
    </ToolLayout>
  )
}

import type { Metadata } from 'next'
import { ToolLayout } from '@/components/tools/ToolLayout'
import { ToolEditor } from '@/components/tools/ToolEditor'

export const metadata: Metadata = {
  title: 'Markdown 转 Word - 专业级 Markdown 转 Word 服务',
  description:
    '完美支持 LaTeX 数学公式转Word原生公式、Mermaid流程图、代码高亮。免费无水印，一键导出标准 .docx 文件。',
  keywords: ['Markdown转Word', 'LaTeX公式转Word', 'Mermaid转Word', 'docx导出'],
}

const FEATURES = [
  {
    icon: '📐',
    title: 'LaTeX 公式原生转换',
    desc: '数学公式转为Word原生公式对象，双击即可在Word中编辑',
  },
  {
    icon: '📑',
    title: '多级标题精确还原',
    desc: '完整保留 H1-H6 层级关系，文档结构一目了然',
  },
  {
    icon: '🔀',
    title: 'Mermaid 流程图渲染',
    desc: '自动将Mermaid代码块转换为高清图片，精确插入对应位置',
  },
  {
    icon: '✨',
    title: '免费无水印',
    desc: '输出标准 .docx 格式，在 Word/WPS 中完全可编辑',
  },
]

const SCENARIOS = ['学术论文撰写（含大量数学公式）', '工作报告生成（含流程图）', 'Typora 导出替代方案']

const FAQ = [
  { q: '转换后文件能编辑吗？', a: '是的，生成标准 .docx 格式，Word/WPS 中完全可编辑。' },
  { q: '公式会乱码吗？', a: '不会，使用 OMML 格式，双击即可在 Word 中编辑。' },
  { q: '支持手机浏览器吗？', a: '支持，同时也有 iOS/Android App 可下载。' },
  { q: '文件会被保存吗？', a: '不会，转换完成即销毁，保障您的隐私。' },
]

export default function MarkdownToWordPage() {
  return (
    <ToolLayout
      title="Markdown 转 Word"
      subtitle="专业级 Markdown 转 Word 服务，完美支持 LaTeX 数学公式、Mermaid 流程图解析"
      features={FEATURES}
      scenarios={SCENARIOS}
      faq={FAQ}
    >
      <ToolEditor exportFormats={['docx']} />
    </ToolLayout>
  )
}

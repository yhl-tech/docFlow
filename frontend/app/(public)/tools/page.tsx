import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: '格式转换工具箱 - 文流 DocFlow',
  description: '提供 Markdown 转 Word、PDF、Excel、图片，以及 DeepSeek/Kimi/豆包/千问 导出 Word 等一站式格式转换工具。',
}

const GENERAL_TOOLS = [
  {
    icon: '📝',
    title: 'Markdown 转 Word',
    desc: '支持 LaTeX 公式、Mermaid 流程图、代码块，完美还原为 .docx 格式',
    href: '/tools/markdown-to-word',
    badge: '最热门',
  },
  {
    icon: '📄',
    title: 'Markdown 转 PDF',
    desc: '专业排版引擎，支持自定义页边距、代码高亮，智能分页',
    href: '/tools/markdown-to-pdf',
    badge: null,
  },
  {
    icon: '📊',
    title: 'Markdown 转 Excel',
    desc: '自动识别所有表格，多表分 Sheet 导出，格式完美保留',
    href: '/tools/markdown-to-excel',
    badge: null,
  },
  {
    icon: '🖼️',
    title: 'Markdown 转图片',
    desc: '一键渲染为高清长图，适合社交媒体分享，防锯齿技术',
    href: '/tools/markdown-to-image',
    badge: null,
  },
]

const AI_TOOLS = [
  {
    icon: '🤖',
    title: 'DeepSeek 导出 Word',
    desc: '将 DeepSeek 生成的 Markdown 内容一键导出为标准 Word 文档',
    href: '/tools/deepseek-to-word',
    badge: '新上线',
  },
  {
    icon: '🌙',
    title: 'Kimi 转 Word',
    desc: '完美解析 Kimi AI 输出格式，杜绝复制到 Word 后格式混乱',
    href: '/tools/kimi-to-word',
    badge: null,
  },
  {
    icon: '🫘',
    title: '豆包转 Word',
    desc: '从豆包官方页面复制内容，一键转为高质量 Word 文档',
    href: '/tools/doubao-to-word',
    badge: null,
  },
  {
    icon: '🌟',
    title: '千问转 Word',
    desc: '千问对话内容智能解析，标题层级还原，文档结构清晰',
    href: '/tools/qwen-to-word',
    badge: null,
  },
]

function ToolCard({
  icon, title, desc, href, badge,
}: {
  icon: string; title: string; desc: string; href: string; badge: string | null
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-xl border p-5 hover:border-primary hover:shadow-md transition-all"
    >
      {badge && (
        <span className="absolute top-3 right-3 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      <div className="mt-4 text-xs text-primary font-medium">立即使用 →</div>
    </Link>
  )
}

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">格式转换工具箱</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            一站式解决 AI 内容格式转换问题，支持 Word、PDF、Excel、图片多种格式
          </p>
        </div>

        {/* General tools */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full inline-block" />
            通用格式转换
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GENERAL_TOOLS.map((t) => <ToolCard key={t.href} {...t} />)}
          </div>
        </div>

        {/* AI platform tools */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
            AI 平台专属导出
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_TOOLS.map((t) => <ToolCard key={t.href} {...t} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-10 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">想要更强大的 AI 创作能力？</h2>
          <p className="text-gray-500 mb-6">使用创作工作台，支持多模型 AI 对话，配合智能编辑器一键导出</p>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            进入创作工作台 →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

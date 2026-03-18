import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/Providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: '文流 DocFlow - AI文档排版与创作工作台',
    template: '%s | 文流 DocFlow',
  },
  description:
    '聚合DeepSeek、Kimi、豆包等AI模型，一键导出Word/PDF/Excel，完美支持LaTeX公式、代码高亮、Mermaid流程图。',
  keywords: ['AI文档导出', 'Markdown转Word', 'LaTeX公式', 'DeepSeek导出', 'Mermaid流程图'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: '文流 DocFlow',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.staticfile.org/katex/0.16.10/dist/katex.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" duration={1500} />
        </Providers>
      </body>
    </html>
  )
}

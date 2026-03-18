'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FileText, ChevronDown } from 'lucide-react'

const toolsMenu = [
  { href: '/tools/markdown-to-word', label: 'Markdown 转 Word' },
  { href: '/tools/markdown-to-pdf', label: 'Markdown 转 PDF' },
  { href: '/tools/markdown-to-excel', label: 'Markdown 转 Excel' },
  { href: '/tools/markdown-to-image', label: 'Markdown 转图片' },
  { href: '/tools/deepseek-to-word', label: 'DeepSeek 导出 Word' },
  { href: '/tools/kimi-to-word', label: 'Kimi 转 Word' },
  { href: '/tools/doubao-to-word', label: '豆包转 Word' },
  { href: '/tools/qwen-to-word', label: '千问转 Word' },
]

export function Navbar() {
  const [toolsOpen, setToolsOpen] = useState(false)

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <FileText className="w-6 h-6" />
          文流 DocFlow
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {/* 格式转换工具箱 下拉 */}
          <div
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground py-2">
              格式转换工具箱
              <ChevronDown className="w-4 h-4" />
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 bg-white border rounded-lg shadow-lg py-2 w-52 z-50">
                {toolsMenu.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/editor" className="text-muted-foreground hover:text-foreground">
            AI智能编辑器
          </Link>
          <Link href="/prompts" className="text-muted-foreground hover:text-foreground">
            AI提示词库
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            登录
          </Link>
          <Link href="/workspace" className="bg-primary text-white text-sm px-4 py-2 rounded-md hover:bg-primary/90">
            进入工作台
          </Link>
        </div>
      </div>
    </header>
  )
}

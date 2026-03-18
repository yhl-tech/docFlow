import Link from 'next/link'

const footerLinks = [
  {
    title: '格式转换工具',
    links: [
      { label: 'Markdown 转 Word', href: '/tools/markdown-to-word' },
      { label: 'Markdown 转 PDF', href: '/tools/markdown-to-pdf' },
      { label: 'Markdown 转 Excel', href: '/tools/markdown-to-excel' },
      { label: 'Markdown 转图片', href: '/tools/markdown-to-image' },
    ],
  },
  {
    title: '智能编辑器场景',
    links: [
      { label: 'AI 改写', href: '/editor?scene=rewrite' },
      { label: 'AI 扩写', href: '/editor?scene=expand' },
      { label: 'AI 缩写', href: '/editor?scene=compress' },
      { label: 'AI 翻译', href: '/editor?scene=translate' },
      { label: 'AI 润色', href: '/editor?scene=polish' },
    ],
  },
  {
    title: '精选提示词',
    links: [
      { label: '工作周报', href: '/prompts?tag=周报' },
      { label: '论文写作', href: '/prompts?tag=论文' },
      { label: '公文写作', href: '/prompts?tag=公文' },
    ],
  },
  {
    title: '关于',
    links: [
      { label: '联系我们', href: '/contact' },
      { label: '隐私政策', href: '/privacy' },
      { label: '服务条款', href: '/terms' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="container mx-auto px-4 py-12">
        {/* Top: brand + columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-bold text-lg text-gray-900">
              文流 DocFlow
            </Link>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              AI 文档排版与创作工作台，让每一篇文档都精准高效。
            </p>
          </div>

          {/* Link groups */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{group.title}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: copyright */}
        <div className="mt-10 pt-6 border-t text-center text-sm text-gray-400">
          © 2026 文流 DocFlow. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

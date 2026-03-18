import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

interface Feature { icon: string; title: string; desc: string }
interface FaqItem { q: string; a: string }

interface ToolLayoutProps {
  title: string
  subtitle: string
  features: Feature[]
  scenarios: string[]
  faq: FaqItem[]
  /** Extra content (steps, data security, etc.) shown after the editor */
  extra?: React.ReactNode
  children: React.ReactNode
}

export function ToolLayout({
  title, subtitle, features, scenarios, faq, extra, children,
}: ToolLayoutProps) {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ── */}
        <section className="bg-gradient-to-b from-blue-50 to-white border-b">
          <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 text-lg mb-8">{subtitle}</p>

            {/* Feature banners */}
            {features.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {features.map((f) => (
                  <div key={f.title} className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="text-sm font-semibold text-gray-800 mb-1">{f.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Editor slot */}
            {children}
          </div>
        </section>

        {/* ── Extra (steps, security, etc.) ── */}
        {extra && (
          <section className="container mx-auto px-4 py-8">
            {extra}
          </section>
        )}

        {/* ── Scenarios ── */}
        {scenarios.length > 0 && (
          <section className="container mx-auto px-4 py-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-4">适用场景</h2>
            <ul className="space-y-2">
              {scenarios.map((s) => (
                <li key={s} className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="text-primary mt-0.5">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <section className="container mx-auto px-4 py-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6">常见问题</h2>
            <div className="space-y-4 max-w-2xl">
              {faq.map((item) => (
                <div key={item.q} className="border rounded-xl p-4">
                  <p className="font-medium text-gray-800 mb-1">{item.q}</p>
                  <p className="text-sm text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Related tools ── */}
        <section className="container mx-auto px-4 py-8 border-t">
          <h2 className="text-xl font-bold text-gray-900 mb-4">相关工具</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Markdown 转 Word', href: '/tools/markdown-to-word' },
              { label: 'Markdown 转 PDF', href: '/tools/markdown-to-pdf' },
              { label: 'Markdown 转 Excel', href: '/tools/markdown-to-excel' },
              { label: 'Markdown 转图片', href: '/tools/markdown-to-image' },
              { label: 'DeepSeek 导出 Word', href: '/tools/deepseek-to-word' },
              { label: 'Kimi 转 Word', href: '/tools/kimi-to-word' },
            ].map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="text-sm border rounded-full px-3 py-1 text-gray-600 hover:border-primary hover:text-primary transition-colors"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

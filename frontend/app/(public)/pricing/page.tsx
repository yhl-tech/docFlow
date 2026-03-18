import type { Metadata } from 'next'
import { PricingCards } from '@/components/pricing/PricingCards'
import { PricingFaq } from '@/components/pricing/PricingFaq'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: '套餐定价',
  description: '选择适合您的套餐，享受无限制的AI文档导出服务。',
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">选择适合您的套餐</h1>
          <p className="text-muted-foreground text-lg">
            免费开始，按需升级。所有套餐均支持 Word/PDF/Excel/图片导出。
          </p>
        </div>
        <PricingCards />
        <PricingFaq />
      </main>
      <Footer />
    </>
  )
}

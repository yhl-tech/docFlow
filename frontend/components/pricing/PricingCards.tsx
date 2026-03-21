'use client'

import { useState } from 'react'
import { Check, Zap, Crown, Infinity } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { UpgradeModal } from './UpgradeModal'

// 会员方案配置
const PLANS = [
  {
    id: 'monthly',
    name: '月度会员',
    price: 19.9,
    originalPrice: 29.9,
    period: '30天',
    icon: Zap,
    highlight: false,
    features: [
      '30 天内无限次导出',
      '支持 Word / PDF / Excel / 图片',
      '所有导出模板',
      '优先客服支持',
    ],
  },
  {
    id: 'annual',
    name: '年度会员',
    price: 99,
    originalPrice: 199,
    period: '365天',
    icon: Crown,
    highlight: true,
    badge: '最划算',
    features: [
      '365 天内无限次导出',
      '支持 Word / PDF / Excel / 图片',
      '所有导出模板',
      '优先客服支持',
      '专属年度折扣',
    ],
  },
  {
    id: 'lifetime',
    name: '终身会员',
    price: 299,
    originalPrice: null,
    period: '永久',
    icon: Infinity,
    highlight: false,
    features: [
      '永久无限次导出',
      '支持 Word / PDF / Excel / 图片',
      '所有导出模板',
      '7x24 小时专属客服',
      '未来所有新功能',
    ],
  },
]

// 按次充值说明
const TOPUP_INFO = {
  label: '按次充值',
  desc: '每次导出 1 元，适合偶尔使用',
  note: '1 元 = 100 分，可多次充值，余额永不过期',
}

export function PricingCards() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeInitialTab, setUpgradeInitialTab] = useState<'member' | 'topup'>('member')
  const { user, isLoggedIn } = useAuthStore()

  const handleMemberClick = (planId: string) => {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setUpgradeInitialTab('member')
    setUpgradeModalOpen(true)
  }

  const handleTopupClick = () => {
    if (!isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setUpgradeInitialTab('topup')
    setUpgradeModalOpen(true)
  }

  return (
    <>
      {/* 免费次数提示 */}
      {isLoggedIn && user && (
        <div className="max-w-5xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">{user.quota_remaining}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">您还有 {user.quota_remaining} 次免费导出</p>
                <p className="text-xs text-gray-500">用完后可开通会员或充值余额继续使用</p>
              </div>
            </div>
            {user.is_member_active && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                {user.member_plan === 'lifetime' ? '终身会员' : user.member_plan === 'annual' ? '年度会员' : '月度会员'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 会员卡片 */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col transition-all duration-200 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-200 scale-105'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.highlight ? 'bg-white/20' : 'bg-indigo-50'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${plan.highlight ? 'text-white' : 'text-indigo-600'}`}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className={`text-xs ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {plan.period}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">¥{plan.price}</span>
                {plan.originalPrice && (
                  <span className={`ml-2 text-sm line-through ${plan.highlight ? 'text-indigo-300' : 'text-gray-400'}`}>
                    ¥{plan.originalPrice}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.highlight ? 'text-green-300' : 'text-green-500'
                      }`}
                    />
                    <span className={`text-sm ${plan.highlight ? '' : 'text-gray-600'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleMemberClick(plan.id)}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                立即开通
              </button>
            </div>
          )
        })}
      </div>

      {/* 按次充值 */}
      <div className="max-w-5xl mx-auto">
        <div
          className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
          onClick={handleTopupClick}
        >
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{TOPUP_INFO.label}</h3>
            <p className="text-sm text-gray-500">{TOPUP_INFO.desc}</p>
            <p className="text-xs text-gray-400 mt-1">{TOPUP_INFO.note}</p>
          </div>
          <button className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
            充值余额
          </button>
        </div>
      </div>

      {/* 升级弹窗 */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab={upgradeInitialTab}
        selectedPlan={upgradeInitialTab === 'member' ? 'monthly' : undefined}
      />
    </>
  )
}

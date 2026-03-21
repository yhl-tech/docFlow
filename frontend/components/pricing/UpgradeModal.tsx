'use client'

import { useState, useEffect } from 'react'
import { X, Check, Zap, Crown, Infinity, Coins } from 'lucide-react'
import { toast } from 'sonner'
import authService from '@/lib/api/auth'
import paymentService from '@/lib/api/payment'
import type { PlanType } from '@/lib/api/payment'
import { useAuthStore } from '@/store/authStore'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  initialTab?: 'member' | 'topup'
  selectedPlan?: PlanType
}

const MEMBER_PLANS = [
  { id: 'monthly' as PlanType, name: '月度会员', price: 19.9, period: '30天', icon: Zap },
  { id: 'annual' as PlanType, name: '年度会员', price: 99, period: '365天', icon: Crown },
  { id: 'lifetime' as PlanType, name: '终身会员', price: 299, period: '永久', icon: Infinity },
]

const TOPUP_AMOUNTS = [10, 50, 100]

export function UpgradeModal({ open, onClose, initialTab = 'member', selectedPlan }: UpgradeModalProps) {
  const [activeTab, setActiveTab] = useState<'member' | 'topup'>(initialTab)
  const [selectedMemberPlan, setSelectedMemberPlan] = useState<PlanType | null>(selectedPlan || null)
  const [topupAmount, setTopupAmount] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const { user, refreshUser } = useAuthStore()

  useEffect(() => {
    setActiveTab(initialTab)
    if (selectedPlan) setSelectedMemberPlan(selectedPlan)
  }, [initialTab, selectedPlan])

  if (!open) return null

  const handleCreateOrder = async () => {
    if (activeTab === 'member') {
      if (!selectedMemberPlan) {
        toast.error('请选择一个会员方案')
        return
      }
      setLoading(true)
      try {
        const res = await paymentService.createOrder({ plan: selectedMemberPlan, pay_channel: 'mock' })
        // 模拟支付成功
        if (res.pay_params.mock_enabled) {
          await paymentService.mockConfirm(res.order_no)
          toast.success('支付成功，会员已开通！')
          await refreshUser()
          onClose()
        } else {
          toast.info('订单已创建，请完成支付')
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || '创建订单失败')
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        const res = await paymentService.createOrder({
          plan: 'topup',
          pay_channel: 'mock',
          topup_amount: topupAmount,
        })
        if (res.pay_params.mock_enabled) {
          await paymentService.mockConfirm(res.order_no)
          toast.success(`充值成功！已到账 ${topupAmount * 100} 积分`)
          await refreshUser()
          onClose()
        } else {
          toast.info('订单已创建，请完成支付')
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || '创建订单失败')
      } finally {
        setLoading(false)
      }
    }
  }

  const selectedPlanInfo = selectedMemberPlan
    ? MEMBER_PLANS.find((p) => p.id === selectedMemberPlan)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">开通服务</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'member'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('member')}
          >
            开通会员
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'topup'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('topup')}
          >
            充值余额
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'member' ? (
            <div className="space-y-3">
              {MEMBER_PLANS.map((plan) => {
                const Icon = plan.icon
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedMemberPlan(plan.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedMemberPlan === plan.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          selectedMemberPlan === plan.id ? 'bg-indigo-600' : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${selectedMemberPlan === plan.id ? 'text-white' : 'text-gray-500'}`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{plan.name}</p>
                        <p className="text-xs text-gray-500">{plan.period}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">¥{plan.price}</span>
                      {selectedMemberPlan === plan.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </div>
                )
              })}

              {/* 会员权益说明 */}
              <div className="bg-gray-50 rounded-xl p-4 mt-4">
                <p className="text-xs text-gray-500 mb-2">开通即表示同意《会员服务协议》</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>会员有效期内所有格式导出不限次数</li>
                  <li>会员权益不可转让，仅限本账号使用</li>
                  <li>会员到期后余额可继续按次使用</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                当前余额：<span className="font-bold text-gray-900">{user?.balance_cents ?? 0} 积分</span>
                <span className="text-xs ml-1">（100积分 = 1元）</span>
              </p>

              <div className="grid grid-cols-3 gap-3">
                {TOPUP_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTopupAmount(amount)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      topupAmount === amount
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Coins className={`w-5 h-5 mx-auto mb-1 ${topupAmount === amount ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <p className="font-bold text-sm">¥{amount}</p>
                    <p className="text-xs text-gray-500">{amount * 100}积分</p>
                  </button>
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-700">
                  充值说明：余额永不过期，可随时使用。每 100 积分可导出一次文档。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div>
            {activeTab === 'member' && selectedPlanInfo ? (
              <div>
                <span className="text-2xl font-bold text-indigo-600">¥{selectedPlanInfo.price}</span>
                <span className="text-sm text-gray-500 ml-1">/{selectedPlanInfo.period}</span>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-bold text-indigo-600">¥{topupAmount}</span>
                <span className="text-sm text-gray-500 ml-1">（{topupAmount * 100}积分）</span>
              </div>
            )}
          </div>
          <button
            onClick={handleCreateOrder}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '处理中...' : '立即支付'}
          </button>
        </div>
      </div>
    </div>
  )
}

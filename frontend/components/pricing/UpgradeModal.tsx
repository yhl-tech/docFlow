'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Check, Zap, Crown, Infinity, Coins, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import paymentService from '@/lib/api/payment'
import type { PlanType, PayChannel } from '@/lib/api/payment'
import { useAuthStore } from '@/store/authStore'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  initialTab?: 'member' | 'topup'
  selectedPlan?: PlanType
}

const MEMBER_PLANS = [
  {
    id: 'monthly' as PlanType,
    name: '月度会员',
    price: 19.9,
    period: '30天',
    icon: Zap,
    desc: '灵活订阅，按月付费',
    badge: null,
  },
  {
    id: 'annual' as PlanType,
    name: '年度会员',
    price: 99,
    period: '365天',
    icon: Crown,
    desc: '相当于月均 ¥8.25',
    badge: '最划算',
  },
  {
    id: 'lifetime' as PlanType,
    name: '终身会员',
    price: 299,
    period: '永久',
    icon: Infinity,
    desc: '一次付清，永久使用',
    badge: null,
  },
]

const TOPUP_AMOUNTS = [10, 50, 100]

export function UpgradeModal({ open, onClose, initialTab = 'member', selectedPlan }: UpgradeModalProps) {
  const [activeTab, setActiveTab] = useState<'member' | 'topup'>(initialTab)
  const [selectedMemberPlan, setSelectedMemberPlan] = useState<PlanType | null>(selectedPlan || null)
  const [topupAmount, setTopupAmount] = useState<number>(10)
  const [customAmountInput, setCustomAmountInput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [payChannel, setPayChannel] = useState<PayChannel>('mock')
  const [availableChannels, setAvailableChannels] = useState<PayChannel[]>([])
  const [wechatCodeUrl, setWechatCodeUrl] = useState<string | null>(null)
  const [pendingOrderNo, setPendingOrderNo] = useState<string | null>(null)
  const { user, refreshUser } = useAuthStore()
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) return
    paymentService
      .getChannels()
      .then((info) => {
        // 只保留真实渠道，过滤掉 mock
        const real = info.available.filter((c) => c !== 'mock')
        setAvailableChannels(real)
        const priority: PayChannel[] = ['wechat', 'alipay']
        const best = priority.find((c) => real.includes(c))
        if (best) setPayChannel(best)
      })
      .catch(() => {
        setAvailableChannels([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setActiveTab(initialTab)
    if (selectedPlan) setSelectedMemberPlan(selectedPlan)
  }, [initialTab, selectedPlan, open])

  useEffect(() => {
    if (open && activeTab === 'topup') {
      setTopupAmount((prev) => (prev > 0 ? prev : 10))
    }
  }, [open, activeTab])

  if (!open) return null

  const submitOrder = async (plan: PlanType, extra: { topup_amount?: number } = {}) => {
    const res = await paymentService.createOrder({ plan, pay_channel: payChannel, ...extra })
    const params = res.pay_params

    if (params.channel === 'mock' && params.mock_enabled) {
      await paymentService.devSimulatePaid(res.order_no)
      await paymentService.pollOrderUntilPaid(res.order_no, 500, 5_000)
      return { ok: true, order_no: res.order_no }
    }

    if (params.channel === 'alipay') {
      if (params.form_html) {
        const container = document.createElement('div')
        container.innerHTML = params.form_html
        document.body.appendChild(container)
        const form = container.querySelector('form')
        form?.submit()
      } else if (params.pay_url) {
        window.location.href = params.pay_url
      } else {
        toast.error('支付宝未返回跳转参数，请稍后重试')
      }
      return { ok: false, order_no: res.order_no }
    }

    if (params.channel === 'wechat') {
      if (!params.code_url) {
        toast.error('微信支付未返回二维码参数')
        return { ok: false, order_no: res.order_no }
      }
      cancelledRef.current = false
      setWechatCodeUrl(params.code_url)
      setPendingOrderNo(res.order_no)
      try {
        const deadline = Date.now() + 5 * 60 * 1000
        while (Date.now() < deadline) {
          if (cancelledRef.current) return { ok: false, order_no: res.order_no }
          const order = await paymentService.getOrder(res.order_no)
          if (order.status === 'paid') return { ok: true, order_no: res.order_no }
          if (order.status === 'failed' || order.status === 'refunded') throw new Error(`订单已 ${order.status}`)
          await new Promise((r) => setTimeout(r, 2000))
        }
        throw new Error('支付等待超时，请稍后在订单记录中查看')
      } catch (err: any) {
        if (!cancelledRef.current) toast.error(err?.message || '支付等待超时')
        return { ok: false, order_no: res.order_no }
      } finally {
        setWechatCodeUrl(null)
        setPendingOrderNo(null)
      }
    }

    toast.error('当前支付渠道暂不可用，请切换其他渠道')
    return { ok: false, order_no: res.order_no }
  }

  const handleCreateOrder = async () => {
    if (activeTab === 'member') {
      if (!selectedMemberPlan) { toast.error('请选择一个会员方案'); return }
      setLoading(true)
      try {
        const r = await submitOrder(selectedMemberPlan)
        if (r.ok) { toast.success('支付成功，会员已开通！'); await refreshUser(); onClose() }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || '创建订单失败')
      } finally { setLoading(false) }
    } else {
      if (!topupAmount || topupAmount < 0.1) { toast.error('充值金额至少 0.1 元'); return }
      setLoading(true)
      try {
        const r = await submitOrder('topup', { topup_amount: topupAmount })
        if (r.ok) { toast.success(`充值成功！已到账 ${Math.round(topupAmount * 100)} 积分`); await refreshUser(); onClose() }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || '创建订单失败')
      } finally { setLoading(false) }
    }
  }

  const selectedPlanInfo = selectedMemberPlan ? MEMBER_PLANS.find((p) => p.id === selectedMemberPlan) : null
  const footerPrice = activeTab === 'member' && selectedPlanInfo
    ? { amount: `¥${selectedPlanInfo.price}`, sub: `/ ${selectedPlanInfo.period}` }
    : { amount: `¥${topupAmount}`, sub: `${Math.round(topupAmount * 100)} 积分` }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl w-full max-w-[400px] mx-4 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-base">开通服务</h2>
              <p className="text-xs text-slate-400 mt-0.5">不限次数导出，或充值余额按次使用</p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-slate-100 rounded-lg p-1">
            {(['member', 'topup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'member' ? '开通会员' : '充值余额'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-5">
          {activeTab === 'member' ? (
            <div className="space-y-2">
              {MEMBER_PLANS.map((plan) => {
                const Icon = plan.icon
                const isSelected = selectedMemberPlan === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedMemberPlan(plan.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-indigo-600' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {plan.name}
                          </span>
                          {plan.badge && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                              <Sparkles className="w-2.5 h-2.5" />
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                          {plan.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-base font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        ¥{plan.price}
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* 余额显示 */}
              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">当前余额</span>
                <span className="text-sm font-semibold text-slate-800">
                  {user?.balance_cents ?? 0}
                  <span className="text-xs font-normal text-slate-400 ml-1">积分</span>
                </span>
              </div>

              {/* 预设金额 */}
              <div className="grid grid-cols-3 gap-2">
                {TOPUP_AMOUNTS.map((amount) => {
                  const isSelected = topupAmount === amount && customAmountInput === ''
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => { setTopupAmount(amount); setCustomAmountInput('') }}
                      className={`py-3 rounded-xl border transition-all text-center ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        ¥{amount}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {amount * 100} 积分
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* 自定义金额 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">自定义金额</span>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">¥</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.1 – 500"
                    value={customAmountInput}
                    onChange={(e) => {
                      const input = e.target.value
                      if (input === '' || /^\d*\.?\d{0,2}$/.test(input)) {
                        setCustomAmountInput(input)
                        const val = parseFloat(input)
                        if (!isNaN(val) && val > 0) setTopupAmount(Math.min(500, val))
                      }
                    }}
                    onFocus={() => {
                      if (TOPUP_AMOUNTS.includes(topupAmount)) setCustomAmountInput('')
                    }}
                    onBlur={() => {
                      const val = parseFloat(customAmountInput)
                      if (!isNaN(val) && val >= 0.1 && val <= 500) {
                        setTopupAmount(val)
                      } else if (customAmountInput === '' || val < 0.1) {
                        setCustomAmountInput('')
                      }
                    }}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                      customAmountInput !== ''
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 focus:border-indigo-400 text-slate-700'
                    }`}
                  />
                </div>
                {customAmountInput !== '' && parseFloat(customAmountInput) > 0 && (
                  <span className="text-xs text-indigo-500 whitespace-nowrap font-medium shrink-0">
                    = {Math.round(parseFloat(customAmountInput) * 100)} 积分
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">余额永不过期 · 每 100 积分可导出一次</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{footerPrice.amount}</span>
            <span className="text-xs text-slate-400">{footerPrice.sub}</span>
          </div>
          <button
            onClick={handleCreateOrder}
            disabled={loading || (activeTab === 'member' && !selectedMemberPlan)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '处理中…' : '立即支付'}
          </button>
        </div>

        {/* 微信扫码支付浮层 */}
        {wechatCodeUrl && (
          <div className="absolute inset-0 bg-white/97 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <div className="text-center mb-5">
              <h3 className="font-semibold text-slate-900 text-base">微信扫码支付</h3>
              <p className="text-xs text-slate-400 mt-1">请使用微信扫描下方二维码完成支付</p>
            </div>
            <div className="p-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
              <img
                alt="微信支付二维码"
                className="w-44 h-44 rounded-lg"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wechatCodeUrl)}`}
              />
            </div>
            <p className="text-[11px] text-slate-300 mt-3">订单号：{pendingOrderNo}</p>
            <button
              onClick={() => {
                cancelledRef.current = true
                setWechatCodeUrl(null)
                setPendingOrderNo(null)
                setLoading(false)
              }}
              className="mt-5 px-5 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              取消支付
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

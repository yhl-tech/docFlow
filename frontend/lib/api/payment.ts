import { api } from './instance'

// ============ 类型定义 ============

export type PlanType = 'monthly' | 'annual' | 'lifetime' | 'topup'
export type PayChannel = 'wechat' | 'alipay' | 'mock'

export interface CreateOrderParams {
  plan: PlanType
  pay_channel?: PayChannel
  topup_amount?: number  // 仅 topup 时使用，单位：元
}

/**
 * 下单返回参数。
 * 字段随 pay_channel 变化：
 *  - wechat: code_url（扫码） / prepay_id（JSAPI）
 *  - alipay: pay_url（跳转）或 form_html（表单自动提交）
 *  - mock:   mock_enabled + dev_simulate_url（仅开发环境）
 */
export interface CreateOrderResponse {
  order_no: string
  amount: number
  plan: string
  pay_params: {
    order_no: string
    channel: PayChannel
    pay_url: string | null
    code_url: string | null
    form_html: string | null
    prepay_id: string | null
    // mock 渠道独有
    mock_enabled?: boolean
    dev_simulate_url?: string
    hint?: string
  }
}

export interface PaymentChannelsInfo {
  available: PayChannel[]
  mock_enabled: boolean
}

export interface OrderItem {
  id: string
  order_no: string
  plan: string | null
  amount: number
  quota_added: number
  pay_channel: string | null
  status: string  // pending / paid / failed / refunded
  paid_at: string | null
  expires_at: string | null
  created_at: string
}

// ============ API 服务 ============

class PaymentService {
  /**
   * 创建支付订单
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    const response = await api.post<CreateOrderResponse>('/api/payment/create-order', params)
    return response.data
  }

  /**
   * 查询当前环境可用的支付渠道
   */
  async getChannels(): Promise<PaymentChannelsInfo> {
    const response = await api.get<PaymentChannelsInfo>('/api/payment/channels')
    return response.data
  }

  /**
   * 查询订单状态（用于前端轮询等待支付结果）
   */
  async getOrder(orderNo: string): Promise<OrderItem> {
    const response = await api.get<OrderItem>(`/api/payment/order/${orderNo}`)
    return response.data
  }

  /**
   * 轮询订单直到 paid / timeout / 非预期状态
   * @param orderNo   订单号
   * @param intervalMs 轮询间隔，默认 2s
   * @param timeoutMs  超时时长，默认 5 分钟
   */
  async pollOrderUntilPaid(
    orderNo: string,
    intervalMs = 2000,
    timeoutMs = 5 * 60 * 1000,
  ): Promise<OrderItem> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const order = await this.getOrder(orderNo)
      if (order.status === 'paid') return order
      if (order.status === 'failed' || order.status === 'refunded') {
        throw new Error(`订单已 ${order.status}`)
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    throw new Error('支付等待超时，请稍后在"订单记录"中查看结果')
  }

  /**
   * 【开发专用】模拟用户在第三方完成支付（仅 DEBUG + ENABLE_MOCK_PAYMENT 后端配置启用时可用）。
   * 生产环境永远不该调用此接口。
   */
  async devSimulatePaid(orderNo: string): Promise<{ success: boolean; order_no: string; status: string }> {
    const response = await api.post<{ success: boolean; order_no: string; status: string }>(
      '/api/payment/dev/simulate-paid',
      { order_no: orderNo },
    )
    return response.data
  }
}

// 导出单例
const paymentService = new PaymentService()
export default paymentService

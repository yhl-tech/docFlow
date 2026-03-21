import { api } from './instance'

// ============ 类型定义 ============

export type PlanType = 'monthly' | 'annual' | 'lifetime' | 'topup'
export type PayChannel = 'wechat' | 'alipay' | 'mock'

export interface CreateOrderParams {
  plan: PlanType
  pay_channel?: PayChannel
  topup_amount?: number  // 仅 topup 时使用，单位：元
}

export interface CreateOrderResponse {
  order_no: string
  pay_params: {
    order_no: string
    pay_url: string | null
    mock_enabled: boolean
  }
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
   * 模拟支付成功回调（仅开发环境）
   */
  async mockConfirm(orderNo: string): Promise<{ success: boolean; order_no: string; status: string }> {
    const response = await api.post<{ success: boolean; order_no: string; status: string }>(
      '/api/payment/mock/confirm',
      { order_no: orderNo }
    )
    return response.data
  }

  /**
   * 查询订单状态
   */
  async getOrder(orderNo: string): Promise<OrderItem> {
    const response = await api.get<OrderItem>(`/api/payment/order/${orderNo}`)
    return response.data
  }
}

// 导出单例
const paymentService = new PaymentService()
export default paymentService

import { api } from './instance'

// ============ 类型定义 ============

export interface RegisterParams {
  phone: string
  password: string
  sms_code: string
  nickname?: string
}

export interface LoginParams {
  phone: string
  password: string
}

export interface SmsLoginParams {
  phone: string
  code: string
}

export interface SendSmsParams {
  phone: string
  type?: 'login' | 'register' | 'reset_password'
}

export interface ResetPasswordParams {
  phone: string
  sms_code: string
  new_password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserInfo {
  id: string
  phone?: string
  email?: string
  nickname?: string
  avatar_url?: string
  // 配额
  quota_total: number
  quota_used: number
  quota_remaining: number
  // 余额（单位：分，100分 = 1元）
  balance_cents: number
  // 会员
  member_plan?: string   // monthly / annual / lifetime
  member_expires_at?: string
  is_member_active: boolean
  created_at: string
}

export interface MessageResponse {
  message: string
}

// ============ API 服务 ============

class AuthService {
  /**
   * 注册（手机号）
   */
  async register(params: RegisterParams): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/api/auth/register', params)
    return response.data
  }

  /**
   * 密码登录（手机号）
   */
  async login(params: LoginParams): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/api/auth/login', params)
    return response.data
  }

  /**
   * 短信验证码登录
   */
  async smsLogin(params: SmsLoginParams): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/api/auth/sms-login', params)
    return response.data
  }

  /**
   * 发送短信验证码
   * @param type - login | register | reset_password
   */
  async sendSmsCode(params: SendSmsParams): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/api/auth/send-sms-code', params)
    return response.data
  }

  /**
   * 退出登录
   */
  async logout(): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/api/auth/logout')
    return response.data
  }

  /**
   * 获取当前用户信息
   */
  async getMe(): Promise<UserInfo> {
    const response = await api.get<UserInfo>('/api/auth/me')
    return response.data
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<MessageResponse> {
    const response = await api.put<MessageResponse>('/api/auth/password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
    return response.data
  }

  /**
   * 重置密码（忘记密码）
   */
  async resetPassword(params: ResetPasswordParams): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/api/auth/reset-password', params)
    return response.data
  }

  /**
   * 保存 Token 到 localStorage + cookie（供 middleware 读取）
   */
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      // 同步写入 cookie，供 Edge middleware 路由守卫使用
      document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
    }
  }

  /**
   * 获取 Token
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  /**
   * 清除 Token
   */
  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      // 同步清除 cookie
      document.cookie = 'auth_token=; path=/; max-age=0'
    }
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken()
  }
}

// 导出单例
const authService = new AuthService()
export default authService

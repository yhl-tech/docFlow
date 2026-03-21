'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Smartphone, Lock, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'
import authService from '@/lib/api/auth'

// 手机号登录子模式
type PhoneLoginType = 'password' | 'sms'

export default function LoginPage() {
  const router = useRouter()

  // 手机号登录子模式
  const [phoneLoginType, setPhoneLoginType] = useState<PhoneLoginType>('sms')
  // 表单数据
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // 验证码倒计时
  const [countdown, setCountdown] = useState(0)
  // 错误信息
  const [error, setError] = useState('')
  // 加载状态
  const [loading, setLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // 验证手机号格式
  const isValidPhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  // 发送验证码
  const handleSendSms = useCallback(async () => {
    if (!phone) {
      setError('请输入手机号')
      return
    }
    if (!isValidPhone(phone)) {
      setError('手机号格式不正确')
      return
    }

    setSmsLoading(true)
    setError('')

    try {
      await authService.sendSmsCode({
        phone: phone,
        type: 'login',
      })
      setCountdown(60)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || '发送验证码失败')
    } finally {
      setSmsLoading(false)
    }
  }, [phone])

  // 处理登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证手机号
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号')
      return
    }

    if (phoneLoginType === 'sms') {
      if (!smsCode || smsCode.length !== 6) {
        setError('请输入6位验证码')
        return
      }
    } else {
      if (!password) {
        setError('请输入密码')
        return
      }
    }

    setLoading(true)

    try {
      let response
      if (phoneLoginType === 'sms') {
        // 短信验证码登录
        response = await authService.smsLogin({
          phone: phone,
          code: smsCode,
        })
      } else {
        // 密码登录
        response = await authService.login({
          phone: phone,
          password: password,
        })
      }

      // 保存 token
      authService.saveToken(response.access_token)

      // 跳转到工作台
      router.push('/workspace')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 切换手机号登录子模式时重置相关字段
  const handlePhoneLoginTypeChange = (type: PhoneLoginType) => {
    setPhoneLoginType(type)
    setPassword('')
    setSmsCode('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-primary">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            DS随心转
          </Link>
          <p className="text-muted-foreground mt-2">AI智能文档导出平台</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-center mb-6">登录账号</h1>

          {/* 登录方式切换 */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => handlePhoneLoginTypeChange('sms')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                phoneLoginType === 'sms'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              验证码登录
            </button>
            <button
              type="button"
              onClick={() => handlePhoneLoginTypeChange('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                phoneLoginType === 'password'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              密码登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 手机号输入 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">手机号</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* 验证码输入 */}
            {phoneLoginType === 'sms' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">验证码</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="请输入验证码"
                      maxLength={6}
                      className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={countdown > 0 || smsLoading}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {smsLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}秒`
                    ) : (
                      '获取验证码'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 密码输入 */}
            {phoneLoginType === 'password' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 pl-11 pr-11 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  登录
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              立即注册
            </Link>
          </div>

          {/* 找回密码 */}
          <div className="mt-3 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground transition-colors">
              忘记密码？
            </Link>
          </div>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          登录即表示同意{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            服务条款
          </Link>{' '}
          和{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  )
}

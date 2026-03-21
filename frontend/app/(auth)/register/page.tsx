'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Smartphone, Lock, User, MessageSquare, ArrowRight, Loader2, Check } from 'lucide-react'
import authService from '@/lib/api/auth'

export default function RegisterPage() {
  const router = useRouter()

  // 表单数据
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
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

  // 密码强度验证
  const checkPasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    }
    const strength = Object.values(checks).filter(Boolean).length
    return { checks, strength }
  }

  const passwordStrength = checkPasswordStrength(password)

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
        type: 'register',
      })
      setCountdown(60)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || '发送验证码失败')
    } finally {
      setSmsLoading(false)
    }
  }, [phone])

  // 处理注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证手机号
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号')
      return
    }

    // 验证验证码
    if (!smsCode || smsCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    // 验证密码
    if (!password) {
      setError('请输入密码')
      return
    }
    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    // 确认密码
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      const response = await authService.register({
        phone: phone,
        password: password,
        sms_code: smsCode,
        nickname: nickname || undefined,
      })

      // 保存 token
      authService.saveToken(response.access_token)

      // 跳转到工作台
      router.push('/workspace')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-primary">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            DS随心转
          </Link>
          <p className="text-muted-foreground text-sm mt-1">AI智能文档导出平台</p>
        </div>

        {/* 注册卡片 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5">
          <h1 className="text-lg font-bold text-center mb-4">注册账号</h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 手机号输入 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-0.5">手机号</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-2 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 验证码输入 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-0.5">验证码</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入验证码"
                    maxLength={6}
                    className="w-full px-4 py-2 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={countdown > 0 || smsLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                  {smsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}秒`
                  ) : (
                    '获取验证码'
                  )}
                </button>
              </div>
            </div>

            {/* 昵称（可选） */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-0.5">
                昵称 <span className="text-muted-foreground font-normal">(可选)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  maxLength={20}
                  className="w-full px-4 py-2 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-0.5">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码 (至少6位)"
                  className="w-full px-4 py-2 pl-10 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* 密码强度指示器 */}
              {password && (
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength.strength >= level
                          ? passwordStrength.strength <= 2
                            ? 'bg-red-500'
                            : passwordStrength.strength === 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-0.5">确认密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full px-4 py-2 pl-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                {confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {password === confirmPassword ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center text-red-500 text-xs">x</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  注册
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              立即登录
            </Link>
          </div>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          注册即表示同意{' '}
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

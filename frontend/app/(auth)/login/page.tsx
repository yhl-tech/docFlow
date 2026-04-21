"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  MessageSquare,
  ArrowRight,
  Loader2,
  FileText,
  Zap,
  Shield,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import authService from "@/lib/api/auth"

type PhoneLoginType = "password" | "sms"

const DocIcon = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="14 2 14 8 20 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="16"
      y1="13"
      x2="8"
      y2="13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="17"
      x2="8"
      y2="17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const features = [
  { icon: FileText, title: "多格式导出", desc: "Word、PDF、Markdown 一键转换" },
  { icon: Zap, title: "AI 智能排版", desc: "自动优化文档结构与样式" },
  { icon: Shield, title: "安全可靠", desc: "数据加密，隐私保护" },
]

export default function LoginPage() {
  const router = useRouter()

  const [phoneLoginType, setPhoneLoginType] = useState<PhoneLoginType>("sms")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [smsCode, setSmsCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)

  useEffect(() => {
    if (authService.isLoggedIn()) {
      window.location.replace('/workspace')
    }
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const isValidPhone = (p: string) => /^1[3-9]\d{9}$/.test(p)

  const handleSendSms = useCallback(async () => {
    if (!phone) {
      setError("请输入手机号")
      return
    }
    if (!isValidPhone(phone)) {
      setError("手机号格式不正确")
      return
    }
    setSmsLoading(true)
    setError("")
    try {
      await authService.sendSmsCode({ phone, type: "login" })
      setCountdown(60)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || "发送验证码失败")
    } finally {
      setSmsLoading(false)
    }
  }, [phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!isValidPhone(phone)) {
      setError("请输入正确的手机号")
      return
    }
    if (phoneLoginType === "sms") {
      if (!smsCode || smsCode.length !== 6) {
        setError("请输入6位验证码")
        return
      }
    } else {
      if (!password) {
        setError("请输入密码")
        return
      }
    }
    setLoading(true)
    try {
      let response
      if (phoneLoginType === "sms") {
        response = await authService.smsLogin({ phone, code: smsCode })
      } else {
        response = await authService.login({ phone, password })
      }
      authService.saveToken(response.access_token)
      router.push("/workspace")
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || "登录失败")
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (type: PhoneLoginType) => {
    setPhoneLoginType(type)
    setPassword("")
    setSmsCode("")
    setError("")
  }

  return (
    <div className="h-full flex">
      {/* 左侧品牌区（仅桌面端显示） */}
      <div className="hidden lg:flex lg:w-[44%] bg-gradient-to-br from-primary via-primary/90 to-blue-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <DocIcon />
            </div>
            <span className="text-xl font-bold text-white">DocFlow</span>
          </div>
        </div>

        {/* 中部内容 */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              AI 智能文档
              <br />
              导出平台
            </h2>
            <p className="text-white/65 mt-3 text-sm leading-relaxed">
              让文档格式转换变得简单高效，
              <br />
              专注于内容创作，其余交给我们。
            </p>
          </div>

          <div className="space-y-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.2, duration: 0.4 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">
                    {f.title}
                  </div>
                  <div className="text-white/55 text-xs mt-0.5">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/35 text-xs">
          © 2026 AI智能文档导出平台
        </p>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-bold text-primary"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="14 2 14 8 20 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="16"
                  y1="13"
                  x2="8"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="17"
                  x2="8"
                  y2="17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              DocFlow
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8"
          >
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
              <p className="text-slate-400 text-sm mt-1">登录您的账号以继续</p>
            </div>

            {/* 登录方式切换 */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              {(["sms", "password"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    phoneLoginType === type
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {type === "sms" ? "验证码登录" : "密码登录"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  手机号
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* 验证码 / 密码（动画切换） */}
              <AnimatePresence mode="wait" initial={false}>
                {phoneLoginType === "sms" ? (
                  <motion.div
                    key="sms"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5"
                  >
                    <label className="text-sm font-medium text-slate-700">
                      验证码
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={smsCode}
                          onChange={(e) =>
                            setSmsCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="请输入6位验证码"
                          maxLength={6}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendSms}
                        disabled={countdown > 0 || smsLoading}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[96px] text-center"
                      >
                        {smsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : countdown > 0 ? (
                          `${countdown}s 后重发`
                        ) : (
                          "获取验证码"
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="password"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        密码
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        忘记密码？
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 错误提示 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      !
                    </span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-1 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    登录
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
              还没有账号？{" "}
              <Link
                href="/register"
                className="text-primary font-medium hover:underline"
              >
                立即注册
              </Link>
            </div>
          </motion.div>

          {/* <p className="text-center text-xs text-slate-400 mt-5">
            登录即表示同意{" "}
            <Link
              href="/terms"
              className="underline hover:text-slate-600 transition-colors"
            >
              服务条款
            </Link>{" "}
            和{" "}
            <Link
              href="/privacy"
              className="underline hover:text-slate-600 transition-colors"
            >
              隐私政策
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  )
}

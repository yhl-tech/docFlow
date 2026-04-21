"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  User,
  MessageSquare,
  ArrowRight,
  Loader2,
  Check,
  FileText,
  Zap,
  Shield,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import authService from "@/lib/api/auth"

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

const strengthLabels = ["", "弱", "一般", "较强", "强"]
const strengthColors = [
  "",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-500",
]
const strengthTextColors = [
  "",
  "text-red-500",
  "text-orange-500",
  "text-yellow-600",
  "text-green-600",
]

const inputCls =
  "w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"

export default function RegisterPage() {
  const router = useRouter()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nickname, setNickname] = useState("")
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

  const checkPasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    }
    return Object.values(checks).filter(Boolean).length
  }

  const passwordStrength = password ? checkPasswordStrength(password) : 0

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
      await authService.sendSmsCode({ phone, type: "register" })
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
    if (!smsCode || smsCode.length !== 6) {
      setError("请输入6位验证码")
      return
    }
    if (!password) {
      setError("请输入密码")
      return
    }
    if (password.length < 6) {
      setError("密码长度至少6位")
      return
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    setLoading(true)
    try {
      const response = await authService.register({
        phone,
        password,
        sms_code: smsCode,
        nickname: nickname || undefined,
      })
      authService.saveToken(response.access_token)
      router.push("/workspace")
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail?.error || "注册失败")
    } finally {
      setLoading(false)
    }
  }

  const passwordMatch =
    confirmPassword.length > 0 && password === confirmPassword

  return (
    <div className="h-full flex">
      {/* 左侧品牌区（仅桌面端显示） */}
      <div className="hidden lg:flex lg:w-[44%] bg-gradient-to-br from-primary via-primary/90 to-blue-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <DocIcon />
            </div>
            <span className="text-xl font-bold text-white">DocFlow</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              开始您的
              <br />
              AI 文档之旅
            </h2>
            <p className="text-white/65 mt-3 text-sm leading-relaxed">
              注册即可免费体验 AI 智能排版，
              <br />
              让文档处理效率提升 10 倍。
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
      <div className="flex-1 flex items-center justify-center px-5 bg-slate-50">
        <div className="w-full max-w-[400px]">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-4">
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
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900">创建账号</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                填写以下信息，即可免费开始使用
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* 手机号 */}
              <div className="space-y-1">
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
                    className={inputCls}
                  />
                </div>
              </div>

              {/* 验证码 */}
              <div className="space-y-1">
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
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={countdown > 0 || smsLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[90px] text-center"
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
              </div>

              {/* 昵称（可选） */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  昵称{" "}
                  <span className="text-slate-400 font-normal text-xs">
                    （可选）
                  </span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="请输入昵称"
                    maxLength={20}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* 密码 */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少6位，建议含大小写和数字"
                    className="w-full pl-10 pr-11 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
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

                {/* 密码强度指示器 */}
                <AnimatePresence>
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-1 flex-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                passwordStrength >= level
                                  ? strengthColors[passwordStrength]
                                  : "bg-slate-100"
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-medium w-8 text-right ${strengthTextColors[passwordStrength]}`}
                        >
                          {strengthLabels[passwordStrength]}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 确认密码 */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className={`w-full pl-10 pr-11 py-2 text-sm border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${
                      confirmPassword.length > 0
                        ? passwordMatch
                          ? "border-green-300 focus:ring-green-200 focus:border-green-400"
                          : "border-red-200 focus:ring-red-100 focus:border-red-300"
                        : "border-slate-200 focus:ring-primary/20 focus:border-primary"
                    }`}
                  />
                  <AnimatePresence>
                    {confirmPassword.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="absolute right-3.5 inset-y-0 flex items-center"
                      >
                        {passwordMatch ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-red-100 border border-red-300 text-red-500 flex items-center justify-center text-[10px] font-bold leading-none">
                            ✕
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 错误提示 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
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
                className="w-full py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* 底部：登录链接 + 版权 */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-center text-sm text-slate-500">
                已有账号？{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  立即登录
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

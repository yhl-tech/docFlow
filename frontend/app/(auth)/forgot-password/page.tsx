"use client"

import { useState, useCallback, useEffect } from "react"
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
  ArrowLeft,
  Check,
  FileText,
  Zap,
  Shield,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
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
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// 密码强度计算
function calcPasswordStrength(pwd: string): number {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  return Math.min(4, score)
}

const strengthColors: Record<number, string> = {
  0: "bg-slate-200",
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-green-500",
}
const strengthTextColors: Record<number, string> = {
  0: "text-slate-400",
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-yellow-600",
  4: "text-green-600",
}
const strengthLabels: Record<number, string> = {
  0: "",
  1: "弱",
  2: "中",
  3: "较强",
  4: "强",
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [smsCode, setSmsCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (authService.isLoggedIn()) {
      window.location.replace('/workspace')
    }
  }, [])

  const passwordStrength = calcPasswordStrength(password)
  const passwordMatch = password === confirmPassword && confirmPassword.length > 0

  const inputCls =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"

  // 发送短信验证码
  const handleSendSms = useCallback(async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error("请输入正确的手机号")
      return
    }
    setSmsLoading(true)
    try {
      await authService.sendSmsCode({ phone, type: "reset_password" })
      toast.success("验证码已发送")
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "发送失败，请稍后重试")
    } finally {
      setSmsLoading(false)
    }
  }, [phone])

  // 提交重置密码
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号")
      return
    }
    if (smsCode.length !== 6) {
      setError("请输入6位验证码")
      return
    }
    if (password.length < 6) {
      setError("密码至少6位")
      return
    }
    if (password !== confirmPassword) {
      setError("两次密码输入不一致")
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({
        phone,
        sms_code: smsCode,
        new_password: password,
      })
      setSuccess(true)
      toast.success("密码重置成功")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err?.response?.data?.error || "重置失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-10 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <DocIcon />
            </div>
            <span className="text-xl font-bold text-white">DocFlow</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              AI 智能文档
              <br />
              导出平台
            </h1>
            <p className="text-blue-100/80 mt-3 text-sm leading-relaxed max-w-xs">
              让文档格式转换变得简单高效，
              <br />
              专注于内容创作，其余交给我们。
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {[
              { icon: FileText, text: "多格式导出", desc: "Word、PDF、Markdown 一键转换" },
              { icon: Zap, text: "AI 智能排版", desc: "自动优化文档结构与样式" },
              { icon: Shield, text: "安全可靠", desc: "数据加密，隐私保护" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-white/90" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.text}</p>
                  <p className="text-blue-100/60 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-100/50 text-xs">© 2026 DocFlow · AI智能文档导出平台</p>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DocIcon />
              </div>
              <span className="font-bold">DocFlow</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">密码重置成功</h2>
                <p className="text-sm text-slate-500 mt-2">正在跳转到登录页面...</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    返回登录
                  </Link>
                  <h1 className="text-xl font-bold text-slate-900">找回密码</h1>
                  <p className="text-slate-400 text-sm mt-0.5">通过短信验证码重置密码</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* 手机号 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">手机号</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="请输入注册时的手机号"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* 验证码 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">验证码</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

                  {/* 新密码 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">新密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="至少6位，建议含大小写和数字"
                        className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* 密码强度 */}
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
                                    passwordStrength >= level ? strengthColors[passwordStrength] : "bg-slate-100"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs font-medium w-8 text-right ${strengthTextColors[passwordStrength]}`}>
                              {strengthLabels[passwordStrength]}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 确认密码 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">确认密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="请再次输入新密码"
                        className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 ${
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
                        className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 提交按钮 */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        重置密码
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-400 mt-4">
                  想起密码了？{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    返回登录
                  </Link>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

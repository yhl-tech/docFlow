'use client'

import { useState, useEffect, useRef } from 'react'
import { LogOut, Settings, ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { useAuthStore } from '@/store/authStore'
import authService from '@/lib/api/auth'
import { useRouter } from 'next/navigation'

// 生成头像占位符颜色（基于名字 hash）
function getAvatarColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-blue-500', 'bg-teal-500',
    'bg-green-500', 'bg-yellow-500', 'bg-orange-500',
    'bg-red-500', 'bg-pink-500', 'bg-purple-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 获取显示名称（优先昵称，其次手机号脱敏，最后"用户"）
function getDisplayName(user: { nickname?: string; phone?: string }): string {
  if (user.nickname) return user.nickname
  if (user.phone) {
    return user.phone.slice(0, 3) + '****' + user.phone.slice(-4)
  }
  return '用户'
}

// 获取首字
function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function WorkspaceUserMenu() {
  const { user, isLoggedIn, logout } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // 组件挂载时刷新用户信息
  useEffect(() => {
    if (authService.isLoggedIn()) {
      useAuthStore.getState().refreshUser()
    }
  }, [])

  function handleLogout() {
    logout()
    window.location.href = '/login'
  }

  if (!isLoggedIn || !user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      >
        登录
      </button>
    )
  }

  const displayName = getDisplayName(user)
  const initial = getInitial(displayName)
  const avatarColor = getAvatarColor(displayName)

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors">
          {/* 头像 */}
          <Avatar.Root className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {user.avatar_url ? (
              <Avatar.Image
                src={user.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : null}
            <Avatar.Fallback
              className={`flex h-full w-full items-center justify-center text-sm font-semibold text-white ${avatarColor}`}
            >
              {initial}
            </Avatar.Fallback>
          </Avatar.Root>

          {/* 名称 + 会员标签 */}
          <div className="flex flex-col items-start">
            <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
              {displayName}
            </span>
            {user.is_member_active && (
              <span className="text-[10px] font-medium text-indigo-500">会员</span>
            )}
          </div>

          {/* 下拉箭头 */}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="z-50 min-w-[160px] rounded-xl bg-white p-1 shadow-xl border border-slate-100"
        >
          {/* 用户信息 */}
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
            {user.is_member_active ? (
              <p className="text-xs text-indigo-500 truncate">
                {'会员'}
                {user.member_expires_at
                  ? ` · 到期 ${new Date(user.member_expires_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`
                  : ''}
              </p>
            ) : (
              <p className="text-xs text-slate-400 truncate">
                {user.quota_remaining > 0 && `${user.quota_remaining} 次免费`}
                {user.quota_remaining > 0 && user.balance_cents > 0 && ' · '}
                {user.balance_cents > 0 && `${user.balance_cents} 积分`}
                {user.quota_remaining === 0 && user.balance_cents === 0 && '无余额'}
              </p>
            )}
          </div>

          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-red-50 hover:text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

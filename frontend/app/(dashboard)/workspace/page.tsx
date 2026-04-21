'use client'

import { useEffect, useState } from 'react'
import { WorkspaceChat } from '@/components/workspace/WorkspaceChat'
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor'
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader'
import authService from '@/lib/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function WorkspacePage() {
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    const redirectToLogin = () => {
      window.location.replace('/login?redirect=/workspace')
    }

    if (!authService.isLoggedIn()) {
      redirectToLogin()
      return
    }

    useAuthStore
      .getState()
      .refreshUser()
      .then(() => {
        if (!useAuthStore.getState().isLoggedIn) {
          authService.clearToken()
          redirectToLogin()
          return
        }
        setCanRender(true)
      })
      .catch(() => {
        authService.clearToken()
        redirectToLogin()
      })
  }, [])

  if (!canRender) {
    return <div className="h-screen w-screen bg-white" />
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-white"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
      }}
    >
      {/* 顶部导航栏：标题 + 会员 + 导出 + 全屏 + 用户头像 */}
      <WorkspaceHeader />

      {/* 下方左右两栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧 AI 对话区 - 固定宽度，禁止产生页面级滚动 */}
        <div className="workspace-chat-column flex shrink-0 flex-col overflow-hidden">
          <WorkspaceChat />
        </div>

        {/* 右侧创作工作台 - 核心编辑区域 */}
        <WorkspaceEditor />
      </div>
    </div>
  )
}

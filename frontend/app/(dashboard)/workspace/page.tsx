'use client'

import { useEffect, useState } from 'react'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <WorkspaceLayout />
    </div>
  )
}

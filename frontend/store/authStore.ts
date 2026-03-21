'use client'

import { create } from 'zustand'
import authService from '@/lib/api/auth'
import type { UserInfo } from '@/lib/api'

interface AuthState {
  user: UserInfo | null
  isLoggedIn: boolean
  isLoading: boolean
  setUser: (user: UserInfo | null) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isLoading: false,

  setUser: (user) =>
    set({
      user,
      isLoggedIn: !!user,
    }),

  logout: () => {
    authService.clearToken()
    set({ user: null, isLoggedIn: false })
  },

  refreshUser: async () => {
    if (!authService.isLoggedIn()) {
      set({ user: null, isLoggedIn: false })
      return
    }
    set({ isLoading: true })
    try {
      const user = await authService.getMe()
      set({ user, isLoggedIn: true })
    } catch {
      set({ user: null, isLoggedIn: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))

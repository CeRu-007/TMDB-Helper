"use client"

import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/shared/types/auth.types'

export function useAuthActions() {
  const router = useRouter()

  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        return { success: true, user: data.user }
      }
      return { success: false, error: data.error || '用户名或密码错误' }
    } catch {
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch {}

    router.push('/login')
  }

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '密码修改失败')
    }
  }

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        return { success: true, user: data.user }
      }
      return { success: false, error: data.error || '注册失败' }
    } catch {
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }

  return { login, logout, changePassword, register }
}

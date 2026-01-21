"use client"

import { useRouter } from 'next/navigation'
import { AuthUser } from '@/shared/components/auth-provider'

export function useAuthActions() {
  const router = useRouter()

  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe })
      })

      const data = await response.json()

      return response.ok && data.success
    } catch {
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // Silent failure
    }

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

  return { login, logout, changePassword }
}
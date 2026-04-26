"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthCheck } from '@/shared/hooks/use-auth-check'
import { useAuthActions } from '@/shared/hooks/use-auth-actions'
import type { AuthUser } from '@/shared/types/auth.types'

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string | undefined }>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  isInitialSetup: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const checkState = useAuthCheck()
  const [overrideState, setOverrideState] = useState<AuthState | null>(null)
  const [overrideInitialSetup, setOverrideInitialSetup] = useState<boolean | null>(null)

  const { login: loginAction, logout: logoutAction, changePassword, register: registerAction } = useAuthActions()
  const router = useRouter()

  const authState = overrideState ?? {
    user: checkState.user,
    isLoading: checkState.isLoading,
    isAuthenticated: checkState.isAuthenticated
  }
  const isInitialSetup = overrideInitialSetup ?? checkState.isInitialSetup

  const handleLogin = useCallback(async (
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await loginAction(username, password, rememberMe)
    if (result.success && result.user) {
      setOverrideState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true
      })
      setOverrideInitialSetup(false)
      router.replace('/')
      return { success: true }
    }
    return { success: false, error: result.error || '用户名或密码错误' }
  }, [loginAction, router])

  const handleRegister = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string | undefined }> => {
    const result = await registerAction(username, password)
    if (result.success && result.user) {
      setOverrideState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true
      })
      setOverrideInitialSetup(false)
      router.replace('/')
      return { success: true }
    }
    return result.error ? { success: false, error: result.error } : { success: false }
  }, [registerAction, router])

  const handleLogout = useCallback(async (): Promise<void> => {
    setOverrideState({ user: null, isLoading: false, isAuthenticated: false })
    await logoutAction()
  }, [logoutAction])

  const contextValue: AuthContextType = {
    ...authState,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    changePassword,
    isInitialSetup
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthGuard({ children }: { children: React.ReactNode }): React.ReactNode {
  const { isAuthenticated, isLoading, isInitialSetup } = useAuth()

  if (isLoading) {
    return null
  }

  if (isInitialSetup) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  return <>{children}</>
}

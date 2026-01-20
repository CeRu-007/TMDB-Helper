"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Constants
const ADMIN_USER_ID = 'admin'
const SYSTEM_USER_ID = 'user_admin_system'
const DEFAULT_ADMIN_USER = {
  id: ADMIN_USER_ID,
  username: ADMIN_USER_ID,
  lastLoginAt: new Date().toISOString()
}

// Types
export interface AuthUser {
  id: string
  username: string
  lastLoginAt?: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  systemUserId: string | null
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper functions
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (
    navigator.userAgent.includes('Electron') ||
    navigator.userAgent.includes('TMDB-Helper-Electron') ||
    process.env.ELECTRON_BUILD === 'true'
  )
}

const createAuthState = (
  user: AuthUser | null,
  isAuthenticated: boolean,
  isLoading: boolean = false
): AuthState => ({
  user,
  isLoading,
  isAuthenticated,
  systemUserId: isAuthenticated ? SYSTEM_USER_ID : null
})

const saveLastUsername = async (username: string): Promise<void> => {
  try {
    await fetch('/api/system/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set',
        key: 'last_login_username',
        value: username
      })
    })
  } catch {
    // Silently ignore errors - this is non-critical functionality
  }
}

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>(
    createAuthState(null, false)
  )
  const [skipAuthCheck, setSkipAuthCheck] = useState(false)
  const router = useRouter()

  const checkAuth = async (): Promise<void> => {
    if (skipAuthCheck) {
      return
    }

    setAuthState(prev => ({ ...prev, isLoading: true }))

    if (isElectronEnvironment()) {
      setAuthState(createAuthState(DEFAULT_ADMIN_USER, true, false))
      return
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAuthState(createAuthState(data.user, true, false))
          return
        }
      }

      setAuthState(createAuthState(null, false, false))
    } catch {
      setAuthState(createAuthState(null, false, false))
    }
  }

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

      if (response.ok && data.success) {
        void saveLastUsername(username)
        setSkipAuthCheck(true)
        setAuthState(createAuthState(data.user, true, false))
        return true
      }

      return false
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
      // Silently ignore logout errors
    }

    setSkipAuthCheck(false)
    setAuthState(createAuthState(null, false, false))
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

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
    changePassword
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hooks
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Components
export function AuthGuard({ children }: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated, isLoading, checkAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在验证身份...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

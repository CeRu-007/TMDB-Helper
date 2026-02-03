"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthCheck } from '@/shared/hooks/use-auth-check'
import { useAuthActions } from '@/shared/hooks/use-auth-actions'
import type { AuthUser } from '@/shared/types/auth.types'

// Constants
const ADMIN_USER_ID = 'admin'
const SYSTEM_USER_ID = 'user_admin_system'
const DEFAULT_ADMIN_USER = {
  id: ADMIN_USER_ID,
  username: ADMIN_USER_ID,
  lastLoginAt: new Date().toISOString()
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

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (isElectronEnvironment()) {
      return createAuthState(DEFAULT_ADMIN_USER, true, false)
    }
    return createAuthState(null, false, false)
  })

  const isElectron = isElectronEnvironment()
  const checkState = useAuthCheck(isElectron)
  const { login, logout, changePassword } = useAuthActions()

  useEffect(() => {
    if (!isElectron) {
      setAuthState(createAuthState(checkState.user, checkState.isAuthenticated, checkState.isLoading))
    }
  }, [checkState, isElectron])

  const handleLogin = async (
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<boolean> => {
    const success = await login(username, password, rememberMe)
    if (success && !isElectron) {
      // Re-check auth state after successful login
      window.location.reload()
    }
    return success
  }

  const handleLogout = async (): Promise<void> => {
    if (!isElectron) {
      setAuthState(createAuthState(null, false, false))
    }
    await logout()
  }

  const contextValue: AuthContextType = {
    ...authState,
    login: handleLogin,
    logout: handleLogout,
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
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return null
  }

  return <>{children}</>
}

"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 认证用户信息接口
 */
export interface AuthUser {
  id: string
  username: string
  lastLoginAt?: string
}

/**
 * 认证状态接口
 */
export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  systemUserId: string | null
}

/**
 * 认证上下文接口
 */
export interface AuthContextType extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

/**
 * 认证上下文
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 认证提供者组件
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true, // 初始状态设置为加载中
    isAuthenticated: false,
    systemUserId: null
  })
  
  const router = useRouter()

  /**
   * 检查认证状态
   */
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAuthState({
            user: data.user,
            isLoading: false,
            isAuthenticated: true,
            systemUserId: data.systemUserId
          })
          return
        }
      }

      // 认证失败
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        systemUserId: null
      })
    } catch (error) {
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        systemUserId: null
      })
    }
  }

  /**
   * 用户登录
   */
  const login = async (username: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 异步记录最近一次成功登录的用户名（仅用户名；密码只在本地安全存储）
        try {
          void fetch('/api/system/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'last_login_username', value: username }) })
        } catch {}
        setAuthState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          systemUserId: 'user_admin_system' // 固定的系统用户ID
        })
        return true
      } else {
        
        return false
      }
    } catch (error) {
      
      return false
    }
  }

  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      
    }

    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      systemUserId: null
    })

    // 重定向到登录页
    router.push('/login')
  }

  /**
   * 修改密码
   */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '密码修改失败')
    }
  }

  /**
   * 组件挂载时检查认证状态
   */
  useEffect(() => {
    checkAuth()
  }, [])

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

/**
 * 使用认证状态的Hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * 认证守卫组件 - 保护需要认证的页面
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 只有在加载完成后才检查认证状态
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // 加载中显示加载状态
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

  // 未认证时不渲染内容（会重定向到登录页）
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

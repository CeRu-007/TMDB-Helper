"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/shared/components/auth-provider'
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { saveRemember, loadRemember, clearRemember } from '@/lib/auth/secure-remember'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Film,
  LogIn
} from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)

  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const savedUser = await ClientConfigManager.getItem('last_login_username')
      if (savedUser) setUsername(savedUser)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const remember = await ClientConfigManager.getItem('last_login_remember_me')
      if (remember === '1') setRememberMe(true)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const r = await loadRemember()
      if (r.username) setUsername(r.username)
      if (r.remember && r.password) setPassword(r.password)
      if (r.remember) setRememberMe(true)
    })()
  }, [])

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await fetch('/api/auth/init')
        const data = await response.json()

        if (!data.initialized) {
          await fetch('/api/auth/init', { method: 'POST' })
        }
      } catch (error) {
        
      } finally {
        setIsInitializing(false)
      }
    }

    checkInitialization()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = await login(username, password, rememberMe)

      if (success) {
        try {
          if (rememberMe) {
            void saveRemember(username, password, true)
          } else {
            clearRemember()
          }
        } catch {}
        router.replace('/')
      } else {
        setError('用户名或密码错误')
      }
    } catch (error) {
      setError('登录失败,请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">正在初始化系统...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* 网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 overflow-hidden">
              <Image 
                src="/images/tmdb-helper-logo-new.png" 
                alt="TMDB Helper Logo" 
                width={64} 
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-light tracking-wide text-slate-800 dark:text-slate-100 mb-2">
              TMDB Helper
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              影视数据维护助手
            </p>
          </div>

          {/* 登录卡片 */}
          <div className="glass-card rounded-2xl p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
                欢迎回来
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                输入您的凭据以访问您的账户
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 错误提示 */}
              {error && (
                <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  用户名
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  密码
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* 记住我 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={async (checked) => {
                    const v = Boolean(checked)
                    setRememberMe(v)
                    await ClientConfigManager.setItem('last_login_remember_me', v ? '1' : '0')
                    if (!v) {
                      clearRemember()
                    }
                  }}
                  disabled={isLoading}
                  className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-slate-900 dark:data-[state=checked]:bg-slate-100 data-[state=checked]:border-slate-900 dark:data-[state=checked]:border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Label htmlFor="rememberMe" className="text-slate-600 dark:text-slate-400 text-sm cursor-pointer">
                  记住登录状态
                </Label>
              </div>

              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 mr-2"></div>
                    正在登录...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    登录
                  </>
                )}
              </Button>
            </form>

            {/* 底部提示 */}
            <div className="mt-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center gap-1">
                <Film className="h-3 w-3" />
                Powered by TMDB API
              </p>
            </div>
          </div>

          {/* 版权信息 */}
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-6">
            © 2024 TMDB Helper. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

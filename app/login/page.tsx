"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { ClientConfigManager } from '@/lib/client-config-manager'
import { saveRemember, loadRemember, clearRemember } from '@/lib/secure-remember'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Film,
  Database,
  Play,
  Clapperboard,
  Circle,
  Square
} from 'lucide-react'

/**
 * 登录页面组件
 */
export default function LoginPage() {
  const [username, setUsername] = useState('')
  // 记住我：记录最近一次登录的用户名
  useEffect(() => {
    (async () => {
      const savedUser = await ClientConfigManager.getItem('last_login_username')
      if (savedUser) setUsername(savedUser)
    })()
  }, [])
  // 恢复“记住我”勾选状态
  useEffect(() => {
    (async () => {
      const remember = await ClientConfigManager.getItem('last_login_remember_me')
      if (remember === '1') setRememberMe(true)
    })()
  }, [])

  // 从本地安全存储恢复用户名/密码/勾选
  useEffect(() => {
    (async () => {
      const r = await loadRemember()
      if (r.username) setUsername(r.username)
      if (r.remember && r.password) setPassword(r.password)
      if (r.remember) setRememberMe(true)
    })()
  }, [])

  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)

  const { login, isAuthenticated, checkAuth } = useAuth()
  const router = useRouter()

  /**
   * 检查认证系统初始化状态
   */
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await fetch('/api/auth/init')
        const data = await response.json()

        if (!data.initialized) {
          // 自动初始化认证系统
          await fetch('/api/auth/init', { method: 'POST' })
        }
      } catch (error) {
        
      } finally {
        setIsInitializing(false)
      }
    }

    checkInitialization()
  }, [])

  /**
   * 如果已认证，重定向到主页
   */
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  /**
   * 处理登录表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = await login(username, password, rememberMe)

      if (success) {
        // 成功后按勾选状态记录/清除本地加密密码（不阻塞登录流程）
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
      setError('登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化中显示加载状态
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在初始化系统...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动态背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* 电影胶片装饰 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-8 h-8 border-2 border-white rounded-full film-hole"></div>
          <div className="absolute top-20 left-16 w-6 h-6 border-2 border-white rounded-full film-hole"></div>
          <div className="absolute top-32 left-8 w-4 h-4 border-2 border-white rounded-full film-hole"></div>
          <div className="absolute bottom-20 right-10 w-8 h-8 border-2 border-white rounded-full film-hole"></div>
          <div className="absolute bottom-32 right-16 w-6 h-6 border-2 border-white rounded-full film-hole"></div>
          <div className="absolute bottom-44 right-8 w-4 h-4 border-2 border-white rounded-full film-hole"></div>
        </div>

        {/* 数据流动效果 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent data-flow"></div>
          <div className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent data-flow"></div>
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent data-flow"></div>
        </div>

        {/* 背景粒子效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

          {/* 左侧：品牌展示区域 */}
          <div className="hidden lg:block text-white space-y-8">
            {/* 主标题 */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold gradient-text">
                  TMDB Helper
                </h1>
                <p className="text-xl text-blue-200 font-medium">
                  您的专属TMDB词条管理助手
                </p>
              </div>

              <p className="text-lg text-gray-300 leading-relaxed">
                专业的影视数据库管理工具，让您轻松追踪、维护和管理您关注的电影与电视剧词条信息。
              </p>
            </div>

            {/* 功能特色展示 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="feature-card flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">影视追踪</h3>
                  <p className="text-sm text-gray-300">实时跟踪维护影视</p>
                </div>
              </div>

              <div className="feature-card flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">数据管理</h3>
                  <p className="text-sm text-gray-300">词条信息维护</p>
                </div>
              </div>

              <div className="feature-card flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">定时任务</h3>
                  <p className="text-sm text-gray-300">自动化数据处理</p>
                </div>
              </div>

              <div className="feature-card flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Clapperboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">批量处理</h3>
                  <p className="text-sm text-gray-300">高效数据操作</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：登录表单 */}
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-white dark:bg-gray-900 shadow-2xl border-0 overflow-hidden card-float">
              {/* 卡片顶部装饰 */}
              <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

              <CardHeader className="text-center space-y-6 pt-8">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    欢迎回来
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 flex items-center justify-center space-x-2">
                    <Clapperboard className="w-4 h-4" />
                    <span>登录您的TMDB管理中心</span>
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 错误提示 */}
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* 用户名输入 */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      用户名
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none">
                        <User
                          className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
                          style={{
                            filter: 'none',
                            backdropFilter: 'none',
                            isolation: 'isolate'
                          }}
                        />
                      </div>
                      <Input
                        id="username"
                        type="text"
                        placeholder="请输入管理员用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-11 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 group"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* 密码输入 */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      密码
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none">
                        <Lock
                          className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
                          style={{
                            filter: 'none',
                            backdropFilter: 'none',
                            isolation: 'isolate'
                          }}
                        />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 pr-11 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 group"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-all duration-200 z-20"
                        disabled={isLoading}
                        style={{
                          filter: 'none',
                          backdropFilter: 'none',
                          isolation: 'isolate'
                        }}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* 记住我 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={async (checked) => {
                          const v = Boolean(checked)
                          setRememberMe(v)
                          // 同步记录用户偏好
                          await ClientConfigManager.setItem('last_login_remember_me', v ? '1' : '0')
                          if (!v) {
                            clearRemember()
                          }
                        }}
                        disabled={isLoading}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        记住我的登录状态
                      </Label>
                    </div>
                  </div>

                  {/* 登录按钮 */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] login-button"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        正在登录...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        进入管理中心
                      </>
                    )}
                  </Button>
                </form>

                {/* 底部装饰 */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-1">
                    <Film className="h-3 w-3" />
                    <span>Powered by TMDB API</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

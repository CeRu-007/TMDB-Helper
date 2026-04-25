"use client"

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useAuth } from '@/shared/components/auth-provider'
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { saveRemember, loadRemember, clearRemember } from '@/lib/auth/secure-remember'
import { validatePassword } from '@/lib/auth/password-validator'
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
  LogIn,
  UserPlus,
  Check,
  X
} from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRestoring, setIsRestoring] = useState(true)

  const { login, register, isInitialSetup } = useAuth()

  useEffect(() => {
    if (isInitialSetup) {
      setMode('register')
      setIsRestoring(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const r = await loadRemember()
        if (cancelled) return
        if (r.username) setUsername(r.username)
        if (r.remember && r.password) setPassword(r.password)
        if (r.remember) setRememberMe(true)

        const savedUser = await ClientConfigManager.getItem('last_login_username')
        if (cancelled) return
        if (savedUser && !r.username) setUsername(savedUser)

        const remember = await ClientConfigManager.getItem('last_login_remember_me')
        if (cancelled) return
        if (remember === '1' && !r.remember) setRememberMe(true)
      } catch {} finally {
        if (!cancelled) setIsRestoring(false)
      }
    })()

    return () => { cancelled = true }
  }, [isInitialSetup])

  const passwordStrength = useMemo(() => validatePassword(password), [password])

  const strengthColor = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  }

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  }

  const strengthLabel = {
    weak: '弱',
    medium: '中等',
    strong: '强',
  }

  const handleLogin = async (e: React.FormEvent) => {
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
      } else {
        setError('用户名或密码错误')
      }
    } catch (error) {
      setError('登录失败,请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (!passwordStrength.valid) {
      setError('密码不满足要求')
      return
    }

    setIsLoading(true)

    try {
      const result = await register(username, password)
      if (!result.success) {
        setError(result.error || '注册失败,请稍后重试')
      }
    } catch (error) {
      setError('注册失败,请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
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

          {isRestoring ? (
            <div className="glass-card rounded-2xl p-8 shadow-xl flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-slate-100"></div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
                  {mode === 'login' ? '欢迎回来' : '创建账户'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {mode === 'login'
                    ? '输入您的凭据以访问您的账户'
                    : isInitialSetup
                      ? '首次使用，请创建管理员账户'
                      : '创建一个新的账户'}
                </p>
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">
                {error && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
                  </Alert>
                )}

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
                      placeholder={mode === 'register' ? '请设置密码' : '请输入密码'}
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

                  {mode === 'register' && password && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strengthColor[passwordStrength.strength]} ${strengthWidth[passwordStrength.strength]}`}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength.strength === 'weak' ? 'text-red-500' :
                          passwordStrength.strength === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {strengthLabel[passwordStrength.strength]}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { key: 'minLength' as const, label: '至少8个字符' },
                          { key: 'hasUppercase' as const, label: '包含大写字母' },
                          { key: 'hasLowercase' as const, label: '包含小写字母' },
                          { key: 'hasNumber' as const, label: '包含数字' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            {passwordStrength.checks[key] ? (
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <X className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <span className={`text-xs ${
                              passwordStrength.checks[key]
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      确认密码
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </div>
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="请再次输入密码"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-400 dark:focus:border-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500">两次输入的密码不一致</p>
                    )}
                  </div>
                )}

                {mode === 'login' && (
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
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 mr-2"></div>
                      {mode === 'login' ? '正在登录...' : '正在注册...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? (
                        <>
                          <LogIn className="h-5 w-5 mr-2" />
                          登录
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5 mr-2" />
                          注册
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>

              {isInitialSetup && mode === 'register' && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setError('')
                      setConfirmPassword('')
                    }}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    disabled={isLoading}
                  >
                    已有账户？点击登录
                  </button>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center gap-1">
                  <Film className="h-3 w-3" />
                  Powered by TMDB API
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-6">
            © 2024 TMDB Helper. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

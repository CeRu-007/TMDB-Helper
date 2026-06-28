"use client"

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('user')
  const { t: tc } = useTranslation('common')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null)

  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      let adminExists = true

      try {
        const res = await fetch('/api/auth/check-admin', {
          method: 'GET',
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          adminExists = data.hasAdmin === true
        }
      } catch {
        adminExists = true
      }

      if (cancelled) return

      setHasAdmin(adminExists)

      if (!adminExists) {
        setMode('register')
        setPassword('')
        setConfirmPassword('')
        setRememberMe(false)
      }

      if (adminExists) {
        try {
          const r = await loadRemember()
          if (r.username) setUsername(r.username)
          if (r.remember && r.password) setPassword(r.password)
          if (r.remember) setRememberMe(true)

          const savedUser = await ClientConfigManager.getItem('last_login_username')
          if (savedUser) setUsername(savedUser)

          const remember = await ClientConfigManager.getItem('last_login_remember_me')
          if (remember === '1') setRememberMe(true)
        } catch {}
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

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

  const strengthLabel: Record<string, string> = {
    weak: tc('weak', { defaultValue: '弱' }),
    medium: tc('medium', { defaultValue: '中等' }),
    strong: tc('strong', { defaultValue: '强' }),
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(username, password, rememberMe)

      if (!result.success) {
        setError(result.error || t('invalidCredentials'))
      } else {
        try {
          if (rememberMe) {
            void saveRemember(username, password, true)
          } else {
            clearRemember()
          }
        } catch {}
        try {
          const PC = (window as any).PasswordCredential
          if (navigator.credentials && PC) {
            const cred = new PC({ id: username, password, name: username })
            ;(navigator.credentials as any).store(cred)
          }
        } catch {}
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t('loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    if (!passwordStrength.valid) {
      setError(t('passwordNotMet'))
      return
    }

    setIsLoading(true)

    try {
      const result = await register(username, password)
      if (!result.success) {
        setError(result.error || t('registerFailed'))
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t('registerFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAdmin === null) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/50 border-t-foreground"></div>
      </div>
    )
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
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl mb-3 md:mb-4 overflow-hidden">
              <Image
                src="/images/tmdb-helper-logo-new.png"
                alt={tc('appLogoAlt')}
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl md:text-2xl font-light tracking-wide text-foreground mb-1 md:mb-2">
              TMDB Helper
            </h1>
            <p className="text-sm text-muted-foreground">
              {tc('appSubtitle')}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-1">
                  {mode === 'login' ? t('welcomeBack') : t('createAccount')}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {mode === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
                </p>
              </div>

              <form
                action={mode === 'login' ? '/api/auth/login' : '/api/auth/register'}
                method="post"
                onSubmit={mode === 'login' ? handleLogin : handleRegister}
                className="space-y-4 md:space-y-5"
              >
                {error && (
                    <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground text-sm font-medium">
                    {t('username')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                      <User className="w-5 h-5" />
                    </div>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder={t('usernamePlaceholder')}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground text-sm font-medium">
                    {t('password')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'register' ? t('registerPasswordPlaceholder') : t('passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {mode === 'register' && password && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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
                          { key: 'minLength' as const, label: t('minLength') },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            {passwordStrength.checks[key] ? (
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <X className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <span className={`text-xs ${
                              passwordStrength.checks[key]
                                ? 'text-green-600'
                                : 'text-muted-foreground'
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
                    <Label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
                      {t('confirmPassword')}
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </div>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t('confirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500">{t('passwordMismatch')}</p>
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
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Label htmlFor="rememberMe" className="text-muted-foreground text-sm cursor-pointer">
                      {t('rememberMe')}
                    </Label>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground mr-2"></div>
                      {mode === 'login' ? t('loggingIn') : t('registering')}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? (
                        <>
                          <LogIn className="h-5 w-5 mr-2" />
                          {t('loginButton')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5 mr-2" />
                          {t('registerButton')}
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>

              {hasAdmin !== false && (
                <div className="mt-4 text-center">
                  <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login')
                        setError('')
                        setConfirmPassword('')
                      }}
                      className="w-full md:w-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {mode === 'login' ? t('noAccountRegister') : t('hasAccountLogin')}
                    </button>
                  </div>
              )}

              <div className="mt-4 md:mt-6 text-center">
                <p className="text-muted-foreground text-xs flex items-center justify-center gap-1">
                  <Film className="h-3 w-3" />
                  Powered by TMDB API
                </p>
              </div>
            </div>

          <p className="text-center text-muted-foreground text-xs mt-4 md:mt-6">
            © 2024 TMDB Helper. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

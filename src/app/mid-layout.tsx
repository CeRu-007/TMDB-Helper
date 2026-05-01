"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { UserIdentityProvider } from "@/shared/components/user-identity-provider"
import { AuthProvider, useAuth } from "@/shared/components/auth-provider"
import { Toaster } from "@/shared/components/ui/toaster"
import { ModelServiceProvider } from "@/lib/contexts/ModelServiceContext"
import { useAppInitialization } from "@/shared/hooks/use-app-initialization"
import { useThemePersistence } from "@/shared/hooks/use-theme-persistence"
import { UpdateNotificationDialog } from "@/features/system/components/UpdateNotificationDialog"
import "@/lib/i18n"

function ThemeSync() {
  useThemePersistence()
  return null
}

const AppWithToaster = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <Toaster />
  </>
)

function AuthContent({ children, isLoginPage }: { children: ReactNode; isLoginPage: boolean }) {
  const { isAuthenticated, isLoading, isInitialSetup } = useAuth()

  if (isLoading) {
    return null
  }

  // 登录页面直接渲染，不检查认证状态
  if (isLoginPage) {
    return (
      <UserIdentityProvider>
        <DataProvider>
          <ModelServiceProvider>
            <AppWithToaster>{children}</AppWithToaster>
          </ModelServiceProvider>
        </DataProvider>
      </UserIdentityProvider>
    )
  }

  // 首次设置时重定向到登录页（注册模式）
  if (isInitialSetup) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  // 未认证用户重定向到登录页
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  return (
    <UserIdentityProvider>
      <DataProvider>
        <ModelServiceProvider>
          <AppWithToaster>{children}</AppWithToaster>
        </ModelServiceProvider>
      </DataProvider>
    </UserIdentityProvider>
  )
}

export default function MidLayout({
  children,
}: {
  children: ReactNode
}): JSX.Element {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login' || pathname === '/login/'

  useAppInitialization()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeSync />
      <UpdateNotificationDialog />
      <AuthProvider>
        <AuthContent isLoginPage={isLoginPage}>
          {children}
        </AuthContent>
      </AuthProvider>
    </ThemeProvider>
  )
}

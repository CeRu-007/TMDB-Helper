"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { UserIdentityProvider } from "@/shared/components/user-identity-provider"
import { AuthProvider, AuthGuard, useAuth } from "@/shared/components/auth-provider"
import { Toaster } from "@/shared/components/ui/toaster"
import { ModelServiceProvider } from "@/lib/contexts/ModelServiceContext"
import { useAppInitialization } from "@/shared/hooks/use-app-initialization"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"
import { loadRemember } from "@/lib/auth/secure-remember"
import "@/lib/i18n"

const AppWithToaster = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <Toaster />
  </>
)

function AuthContent({ children, isLoginPage }: { children: ReactNode; isLoginPage: boolean }) {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isLoginPage, isLoading, isAuthenticated])

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
  const isLoginPage = pathname === '/login'

  useAppInitialization()

  useEffect(() => {
    if (isLoginPage) {
      const prefetchLoginData = async () => {
        try {
          const r = await loadRemember()
          if (r.username) {
            await ClientConfigManager.setItem('last_login_username', r.username)
          }
          if (r.remember) {
            await ClientConfigManager.setItem('last_login_remember_me', '1')
          }
        } catch {}
      }
      prefetchLoginData()
    }
  }, [isLoginPage])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <AuthContent isLoginPage={isLoginPage}>
          {children}
        </AuthContent>
      </AuthProvider>
    </ThemeProvider>
  )
}
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
import "@/lib/i18n"

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

  if (isInitialSetup || !isAuthenticated) {
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
  const isLoginPage = pathname === '/login'

  useAppInitialization()

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

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

function AuthContent({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname() ?? ''
  const isLoginPage = pathname.startsWith('/login')

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

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    window.location.href = '/login'
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
  useAppInitialization()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeSync />
      <UpdateNotificationDialog />
      <AuthProvider>
        <AuthContent>
          {children}
        </AuthContent>
      </AuthProvider>
    </ThemeProvider>
  )
}

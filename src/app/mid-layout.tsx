"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { UserIdentityProvider } from "@/shared/components/user-identity-provider"
import { AuthProvider, AuthGuard } from "@/shared/components/auth-provider"
import { Toaster } from "@/shared/components/ui/toaster"
import { ModelServiceProvider } from "@/lib/contexts/ModelServiceContext"
import { useAppInitialization } from "@/shared/hooks/use-app-initialization"

// Combined provider component for better readability
const AppProviders = ({ children }: { children: ReactNode }) => (
  <UserIdentityProvider>
    <DataProvider>
      <ModelServiceProvider>
        {children}
      </ModelServiceProvider>
    </DataProvider>
  </UserIdentityProvider>
)

const AppWithToaster = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <Toaster />
  </>
)

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
        {isLoginPage ? (
          // Login page: no auth protection or identity provider needed
          <AppWithToaster>
            {children}
          </AppWithToaster>
        ) : (
          // Main app: requires authentication
          <AuthGuard>
            <AppProviders>
              <AppWithToaster>
                {children}
              </AppWithToaster>
            </AppProviders>
          </AuthGuard>
        )}
      </AuthProvider>
    </ThemeProvider>
  )
}
"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { EnhancedDataProvider } from "@/components/enhanced-client-data-provider"
import { UserIdentityProvider } from "@/components/user-identity-provider"
import { AuthProvider, AuthGuard } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { OptimisticUpdateStatus } from "@/components/ui/optimistic-update-status"
import { suppressRefWarnings } from "@/lib/utils"

export default function MidLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // 应用启动时抑制React ref警告
  useEffect(() => {
    suppressRefWarnings();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {isLoginPage ? (
          // 登录页面：不需要认证保护和用户身份提供者
          <>
            {children}
            <Toaster />
          </>
        ) : (
          // 主应用：需要认证保护
          <AuthGuard>
            <UserIdentityProvider>
              <EnhancedDataProvider>
                {children}
                <Toaster />
                <OptimisticUpdateStatus showOnlyFailed={true} autoHide={true} />
              </EnhancedDataProvider>
            </UserIdentityProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </ThemeProvider>
  )
}
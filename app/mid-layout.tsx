"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/components/client-data-provider"
import { UserIdentityProvider } from "@/components/user-identity-provider"
import { AuthProvider, AuthGuard } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

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
              <DataProvider>
                {children}
                <Toaster />
              </DataProvider>
            </UserIdentityProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </ThemeProvider>
  )
}
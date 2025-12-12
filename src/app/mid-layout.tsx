"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/components/features/auth/client-data-provider"
import { UserIdentityProvider } from "@/components/features/auth/user-identity-provider"
import { AuthProvider, AuthGuard } from "@/components/features/auth/auth-provider"
import { Toaster } from "@/components/common/toaster"
import { ModelServiceProvider } from "@/lib/contexts/ModelServiceContext"

import { suppressRefWarnings } from "@/lib/utils"
import { ConfigMigration } from "@/lib/utils/config-migration"

export default function MidLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // 应用启动时抑制React ref警告和执行配置迁移
  useEffect(() => {
    suppressRefWarnings();

    // 执行配置迁移
    ConfigMigration.autoMigrate().catch(error => {
      
    });
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
                <ModelServiceProvider>
                  {children}
                  <Toaster />
                </ModelServiceProvider>
              </DataProvider>
            </UserIdentityProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </ThemeProvider>
  )
}
"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { UserIdentityProvider } from "@/shared/components/user-identity-provider"
import { AuthProvider, AuthGuard } from "@/shared/components/auth-provider"
import { Toaster } from "@/shared/components/ui/toaster"
import { ModelServiceProvider } from "@/lib/contexts/ModelServiceContext"

import { suppressRefWarnings } from "@/lib/utils"
import { ConfigMigration } from "@/shared/lib/utils/config-migration"

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
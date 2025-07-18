"use client"

import { ReactNode, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { EnhancedDataProvider } from "@/components/enhanced-client-data-provider"
import { UserIdentityProvider } from "@/components/user-identity-provider"
import { Toaster } from "@/components/ui/toaster"
import { OptimisticUpdateStatus } from "@/components/ui/optimistic-update-status"
import { suppressRefWarnings } from "@/lib/utils"

export default function MidLayout({
  children,
}: {
  children: ReactNode
}) {
  // 应用启动时抑制React ref警告
  useEffect(() => {
    suppressRefWarnings();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserIdentityProvider>
        <EnhancedDataProvider>
          {children}
          <Toaster />
          <OptimisticUpdateStatus showOnlyFailed={true} autoHide={true} />
        </EnhancedDataProvider>
      </UserIdentityProvider>
    </ThemeProvider>
  )
} 
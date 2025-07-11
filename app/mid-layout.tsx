"use client"

import { ReactNode, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/components/client-data-provider"
import { Toaster } from "@/components/ui/toaster"
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
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </ThemeProvider>
  )
} 
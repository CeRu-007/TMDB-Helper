"use client"

import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { Toaster } from "@/shared/components/ui/toaster"

export default function FinalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </ThemeProvider>
  )
}

"use client"

import { ReactNode } from "react"
import { ThemeProvider } from "next-themes"

export default function TempLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
} 
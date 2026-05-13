import type { Metadata, Viewport } from "next"
import "./globals.css"
import type React from "react"
import MidLayout from "./mid-layout"
import Script from "next/script"
import { ElectronClassProvider } from "./electron-class-provider"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "TMDB维护助手",
  description: "管理和维护TMDB词条的专业工具",
  generator: 'v0.dev',
  icons: {
    icon: '/tmdb-helper-logo.png',
    shortcut: '/tmdb-helper-logo.png',
    apple: '/tmdb-helper-logo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ElectronClassProvider>
          <MidLayout>{children}</MidLayout>
        </ElectronClassProvider>
      </body>
    </html>
  )
}

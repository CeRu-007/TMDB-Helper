import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import MidLayout from "./mid-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TMDB维护助手",
  description: "管理和维护TMDB词条的专业工具",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <MidLayout>{children}</MidLayout>
      </body>
    </html>
  )
}

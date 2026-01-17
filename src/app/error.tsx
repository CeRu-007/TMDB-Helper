'use client'

import { useEffect } from 'react'
import { Button } from "@/components/common/button"
import Link from "next/link"
import { logger } from "@/lib/utils/logger"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('ErrorPage', 'Application error occurred', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-foreground">500</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground">服务器错误</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          抱歉，服务器遇到了一个错误。请稍后再试。
        </p>
        <div className="space-x-4">
          <Button onClick={reset}>
            重试
          </Button>
          <Link href="/">
            <Button variant="outline">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
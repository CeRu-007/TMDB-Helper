'use client'

import { useEffect } from 'react'
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { logger } from "@/lib/utils/logger"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation("errors")

  useEffect(() => {
    logger.error('[ErrorPage] Application error occurred', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-foreground">500</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground">{t("serverErrorTitle")}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("serverErrorDescription")}
        </p>
        <div className="space-x-4">
          <Button onClick={reset}>
            {t("retry")}
          </Button>
          <Link href="/">
            <Button variant="outline">
              {t("backToHome")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
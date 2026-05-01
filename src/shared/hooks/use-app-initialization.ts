"use client"

import { useEffect, useRef } from "react"
import { suppressRefWarnings } from "@/lib/utils"
import { ConfigMigration } from "@/lib/utils/config-migration"
import { StorageCleaner } from "@/lib/storage/storage-cleaner"
import { useUpdateCheck } from "@/lib/hooks/use-update-check"

export function useAppInitialization(): void {
  const { checkForUpdates } = useUpdateCheck()
  const hasCheckedUpdate = useRef(false)

  useEffect(function initializeApp() {
    suppressRefWarnings()
    StorageCleaner.autoCleanup()

    ConfigMigration.autoMigrate().catch(function handleMigrationError(error) {
    })

    if (!hasCheckedUpdate.current) {
      hasCheckedUpdate.current = true
      const timer = setTimeout(() => {
        if (process.env.NODE_ENV === 'production') {
          checkForUpdates().catch(() => {
          })
        }
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [])
}

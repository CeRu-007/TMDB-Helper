"use client"

import { useEffect } from "react"
import { suppressRefWarnings } from "@/lib/utils"
import { ConfigMigration } from "@/shared/lib/utils/config-migration"
import { StorageCleaner } from "@/lib/storage/storage-cleaner"

export function useAppInitialization(): void {
  useEffect(function initializeApp() {
    suppressRefWarnings()
    StorageCleaner.autoCleanup()

    ConfigMigration.autoMigrate().catch(function handleMigrationError(error) {
      // Error is intentionally ignored - migration failures should not block app startup
    })
  }, [])
}
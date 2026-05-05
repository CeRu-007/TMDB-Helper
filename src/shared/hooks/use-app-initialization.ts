"use client"

import { useEffect } from "react"
import { suppressRefWarnings } from "@/lib/utils"
import { ConfigMigration } from "@/lib/utils/config-migration"
import { StorageCleaner } from "@/lib/storage/storage-cleaner"

export function useAppInitialization(): void {
  useEffect(function initializeApp() {
    suppressRefWarnings()
    StorageCleaner.autoCleanup()

    ConfigMigration.autoMigrate().catch(function handleMigrationError() {
    })
  }, [])
}

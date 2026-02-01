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
      // Error is intentionally ignored - migration failures should not block app startup
    })

    // 延迟 3 秒检查更新，避免影响首屏加载
    // 只执行一次，避免重复检查
    if (!hasCheckedUpdate.current) {
      hasCheckedUpdate.current = true
      const timer = setTimeout(() => {
        // 仅在非开发环境下自动检查更新
        if (process.env.NODE_ENV === 'production') {
          checkForUpdates({ showToast: true }).catch(() => {
            // 检查失败时静默处理，不阻塞用户使用
          })
        }
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [])
}
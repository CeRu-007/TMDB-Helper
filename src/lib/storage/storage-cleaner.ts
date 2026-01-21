/**
 * localStorage cleaning and repair utility
 * Handles corrupted localStorage data
 */

import { storageService } from './storage-service'

const CLEANUP_FLAG = 'storage_cleaned_v2'
const STRING_KEYS = [
  'last_login_username',
  'last_login_remember_me',
  'tmdb_api_key',
  'tmdb_import_path',
  'siliconflow_api_key',
  'modelscope_api_key',
  'general_settings',
  'appearance_settings',
  'video_thumbnail_settings',
  'task_scheduler_config',
  'episode_generator_api_provider',
  'tmdb_helper_user_salt',
  'last_login_password_enc'
] as const

interface CleanupResult {
  success: boolean
  cleanedKeys: string[]
  errors: string[]
}

interface CleanupStatus {
  needsCleanup: boolean
  cleanupComplete: boolean
  corruptedKeys: string[]
}

function isJsonValid(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function findCorruptedKeys(): string[] {
  const corrupted: string[] = []

  for (const key of STRING_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null && value.trim() !== '' && !isJsonValid(value)) {
      corrupted.push(key)
    }
  }

  return corrupted
}

function attemptRepair(key: string, value: string): string | null {
  if (!STRING_KEYS.includes(key)) {
    return null
  }

  if (!value.startsWith('"') && !value.startsWith('{') && !value.startsWith('[')) {
    return JSON.stringify(value)
  }

  return null
}

/**
 * Detects and repairs corrupted localStorage data
 */
export class StorageCleaner {
  /**
   * Check if cleanup is needed
   */
  static needsCleanup(): boolean {
    if (typeof window === 'undefined') return false

    const cleaned = localStorage.getItem(CLEANUP_FLAG)
    if (cleaned === 'true') return false

    return findCorruptedKeys().length > 0
  }

  /**
   * Execute cleanup
   */
  static cleanup(): CleanupResult {
    const result: CleanupResult = {
      success: false,
      cleanedKeys: [],
      errors: []
    }

    if (typeof window === 'undefined') {
      result.errors.push('Cleanup can only be executed in browser environment')
      return result
    }

    try {
      const keys = Object.keys(localStorage)

      for (const key of keys) {
        const value = localStorage.getItem(key)
        if (!value?.trim()) continue

        if (!isJsonValid(value)) {
          const fixed = attemptRepair(key, value)
          if (fixed !== null) {
            localStorage.setItem(key, fixed)
            result.cleanedKeys.push(key)
          } else {
            localStorage.removeItem(key)
            result.cleanedKeys.push(key)
          }
        }
      }

      localStorage.setItem(CLEANUP_FLAG, 'true')
      result.success = true
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Reset cleanup flag (for testing)
   */
  static resetCleanupFlag(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLEANUP_FLAG)
    }
  }

  /**
   * Get cleanup status
   */
  static getCleanupStatus(): CleanupStatus {
    if (typeof window === 'undefined') {
      return {
        needsCleanup: false,
        cleanupComplete: true,
        corruptedKeys: []
      }
    }

    const cleanupComplete = localStorage.getItem(CLEANUP_FLAG) === 'true'
    const corruptedKeys = cleanupComplete ? [] : findCorruptedKeys()

    return {
      needsCleanup: corruptedKeys.length > 0,
      cleanupComplete,
      corruptedKeys
    }
  }

  /**
   * Auto cleanup (called on app startup)
   */
  static autoCleanup(): void {
    if (this.needsCleanup()) {
      const result = this.cleanup()
      if (result.success) {
        console.log(`[StorageCleaner] Cleaned ${result.cleanedKeys.length} corrupted localStorage keys`)
      } else {
        console.error('[StorageCleaner] Cleanup failed:', result.errors)
      }
    }
  }
}

export const cleanupStorage = () => StorageCleaner.cleanup()
export const needsStorageCleanup = () => StorageCleaner.needsCleanup()
export const getStorageCleanupStatus = () => StorageCleaner.getCleanupStatus()
export const autoCleanupStorage = () => StorageCleaner.autoCleanup()
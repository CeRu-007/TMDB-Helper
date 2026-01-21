/**
 * Unified Storage Service
 *
 * Provides a type-safe, centralized interface for localStorage operations
 * with error handling, validation, and consistent patterns across the application.
 *
 * Usage:
 *   StorageService.set('user-preferences', { theme: 'dark', language: 'zh' })
 *   const prefs = StorageService.get('user-preferences', { theme: 'light', language: 'en' })
 *   StorageService.remove('user-preferences')
 */

import { log } from '@/shared/lib/utils/logger'

class StorageService {
  private static instance: StorageService;
  private isAvailable: boolean = false;

  private constructor() {
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Check if localStorage is available
   */
  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return false;
      }

      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      log.warn('StorageService', 'localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Store a value in localStorage with type safety
   *
   * @param key - The storage key
   * @param value - The value to store (will be JSON serialized)
   * @throws Error if storage is unavailable or serialization fails
   */
  public set<T>(key: string, value: T): void {
    if (!this.isAvailable) {
      log.warn('StorageService', `Storage not available, skipping set operation for key: ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      log.debug('StorageService', `Set value for key: ${key}`);
    } catch (error) {
      log.error('StorageService', `Failed to set value for key ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`StorageService.set failed for key '${key}': ${errorMessage}`);
    }
  }

  /**
   * Retrieve a value from localStorage with type safety
   *
   * @param key - The storage key
   * @param defaultValue - The default value to return if key doesn't exist
   * @returns The stored value or the default value
   */
  public get<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable) {
      log.warn('StorageService', `Storage not available, returning default value for key: ${key}`);
      return defaultValue;
    }

    try {
      const serialized = window.localStorage.getItem(key);
      if (serialized === null) {
        log.debug('StorageService', `Key not found, returning default value: ${key}`);
        return defaultValue;
      }

      // Try to parse JSON
      try {
        const value = JSON.parse(serialized) as T;
        log.debug('StorageService', `Retrieved value for key: ${key}`);
        return value;
      } catch (parseError) {
        // JSON parse failed - might be a plain string instead of JSON object
        // Try returning the raw string value (if type compatible)
        log.warn('StorageService', `JSON parse failed for key ${key}, attempting to return raw value:`, parseError);

        // If expected type is string, return raw value
        if (typeof defaultValue === 'string') {
          return serialized as T;
        }

        // Otherwise return default value
        log.warn('StorageService', `Expected type is not string for key ${key}, returning default value`);
        return defaultValue;
      }
    } catch (error) {
      log.error('StorageService', `Failed to get value for key ${key}, returning default:`, error);
      return defaultValue;
    }
  }

  /**
   * Remove a value from localStorage
   *
   * @param key - The storage key to remove
   */
  public remove(key: string): void {
    if (!this.isAvailable) {
      log.warn('StorageService', `Storage not available, skipping remove operation for key: ${key}`);
      return;
    }

    try {
      window.localStorage.removeItem(key);
      log.debug('StorageService', `Removed value for key: ${key}`);
    } catch (error) {
      log.error('StorageService', `Failed to remove value for key ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`StorageService.remove failed for key '${key}': ${errorMessage}`);
    }
  }

  /**
   * Clear all values from localStorage
   *
   * @warning This will remove all stored data, use with caution
   */
  public clear(): void {
    if (!this.isAvailable) {
      log.warn('StorageService', 'Storage not available, skipping clear operation');
      return;
    }

    try {
      window.localStorage.clear();
      log.info('StorageService', 'Cleared all storage values');
    } catch (error) {
      log.error('StorageService', 'Failed to clear storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`StorageService.clear failed: ${errorMessage}`);
    }
  }

  /**
   * Check if a key exists in localStorage
   *
   * @param key - The storage key to check
   * @returns True if the key exists, false otherwise
   */
  public has(key: string): boolean {
    if (!this.isAvailable) {
      return false;
    }

    try {
      return window.localStorage.getItem(key) !== null;
    } catch (error) {
      log.error('StorageService', `Failed to check key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys in localStorage
   *
   * @returns Array of all storage keys
   */
  public keys(): string[] {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      log.error('StorageService', 'Failed to get storage keys:', error);
      return [];
    }
  }

  /**
   * Get the size of localStorage in bytes
   *
   * @returns Size in bytes
   */
  public size(): number {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      let totalSize = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const value = window.localStorage.getItem(key);
          // UTF-16 uses 2 bytes per character
          totalSize += (key.length + (value?.length || 0)) * 2;
        }
      }
      return totalSize;
    } catch (error) {
      log.error('StorageService', 'Failed to calculate storage size:', error);
      return 0;
    }
  }

  /**
   * Remove all keys that match a pattern
   *
   * @param pattern - Regular expression pattern to match keys
   * @returns Number of keys removed
   */
  public removeByPattern(pattern: RegExp): number {
    const keys = this.keys();
    let removedCount = 0;

    for (const key of keys) {
      if (pattern.test(key)) {
        this.remove(key);
        removedCount++;
      }
    }

    log.info('StorageService', `Removed ${removedCount} keys matching pattern: ${pattern}`);
    return removedCount;
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();

// Export convenience methods for direct usage
export const setStorage = <T>(key: string, value: T): void => storageService.set(key, value);
export const getStorage = <T>(key: string, defaultValue: T): T => storageService.get(key, defaultValue);
export const removeStorage = (key: string): void => storageService.remove(key);
export const clearStorage = (): void => storageService.clear();
export const hasStorage = (key: string): boolean => storageService.has(key);
export const storageKeys = (): string[] => storageService.keys();
export const storageSize = (): number => storageService.size();
export const removeStorageByPattern = (pattern: RegExp): number => storageService.removeByPattern(pattern);

export default storageService;
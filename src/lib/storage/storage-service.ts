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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class StorageService {
  private static instance: StorageService;
  private isAvailable: boolean = false;
  private loggerEnabled: boolean = process.env.NODE_ENV !== 'production';

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
      this.log('warn', 'localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Log messages (only in development mode)
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.loggerEnabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[StorageService ${timestamp}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
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
      this.log('warn', 'Storage not available, skipping set operation for key:', key);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      this.log('debug', `Set value for key: ${key}`);
    } catch (error) {
      this.log('error', `Failed to set value for key ${key}:`, error);
      throw new Error(`StorageService.set failed for key '${key}': ${error instanceof Error ? error.message : String(error)}`);
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
      this.log('warn', 'Storage not available, returning default value for key:', key);
      return defaultValue;
    }

    try {
      const serialized = window.localStorage.getItem(key);
      if (serialized === null) {
        this.log('debug', `Key not found, returning default value: ${key}`);
        return defaultValue;
      }

      const value = JSON.parse(serialized) as T;
      this.log('debug', `Retrieved value for key: ${key}`);
      return value;
    } catch (error) {
      this.log('error', `Failed to get value for key ${key}, returning default:`, error);
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
      this.log('warn', 'Storage not available, skipping remove operation for key:', key);
      return;
    }

    try {
      window.localStorage.removeItem(key);
      this.log('debug', `Removed value for key: ${key}`);
    } catch (error) {
      this.log('error', `Failed to remove value for key ${key}:`, error);
      throw new Error(`StorageService.remove failed for key '${key}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all values from localStorage
   * 
   * @warning This will remove all stored data, use with caution
   */
  public clear(): void {
    if (!this.isAvailable) {
      this.log('warn', 'Storage not available, skipping clear operation');
      return;
    }

    try {
      window.localStorage.clear();
      this.log('info', 'Cleared all storage values');
    } catch (error) {
      this.log('error', 'Failed to clear storage:', error);
      throw new Error(`StorageService.clear failed: ${error instanceof Error ? error.message : String(error)}`);
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
      this.log('error', `Failed to check key ${key}:`, error);
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
      this.log('error', 'Failed to get storage keys:', error);
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
      let size = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const value = window.localStorage.getItem(key);
          size += (key.length + (value?.length || 0)) * 2; // UTF-16 uses 2 bytes per character
        }
      }
      return size;
    } catch (error) {
      this.log('error', 'Failed to calculate storage size:', error);
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
    let removed = 0;

    for (const key of keys) {
      if (pattern.test(key)) {
        this.remove(key);
        removed++;
      }
    }

    this.log('info', `Removed ${removed} keys matching pattern: ${pattern}`);
    return removed;
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
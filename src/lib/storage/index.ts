/**
 * Storage Service Module
 * 
 * Exports the unified storage service for type-safe localStorage operations
 */

export { StorageService, storageService, setStorage, getStorage, removeStorage, clearStorage, hasStorage, storageKeys, storageSize, removeStorageByPattern } from './storage-service';
export type { LogLevel } from './storage-service';
export { default } from './storage-service';
/**
 * Storage Service Module
 *
 * Exports the unified storage service for type-safe localStorage operations
 */

export {
  storageService,
  setStorage,
  getStorage,
  removeStorage,
  clearStorage,
  hasStorage,
  storageKeys,
  storageSize,
  removeStorageByPattern,
} from './storage-service';
import LogLevel from './storage-service';
export { default } from './storage-service';

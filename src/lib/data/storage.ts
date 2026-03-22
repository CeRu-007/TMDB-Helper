import { ItemManager } from './storage/item-manager';
import { ImportExportManager } from './storage/import-export-manager';

/**
 * Centralized storage management class that delegates to specialized managers
 */
export class StorageManager {
  // Item management methods
  static getItemsWithRetry = ItemManager.getItemsWithRetry;
  static getItems = ItemManager.getItems;
  static addItem = ItemManager.addItem;
  static updateItem = ItemManager.updateItem;
  static deleteItem = ItemManager.deleteItem;
  static findItemById = ItemManager.findItemById;
  static hasAnyItems = ItemManager.hasAnyItems;

  // Import/Export methods
  static exportData = ImportExportManager.exportData;
  static validateImportData = ImportExportManager.validateImportData;
  static importData = ImportExportManager.importData;
  static debugImport = ImportExportManager.debugImport;

  // Environment checks
  static isClient = (): boolean => typeof window !== 'undefined';
  static isStorageAvailable = (): boolean => true;
}

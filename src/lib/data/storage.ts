import { ItemManager } from './storage/item-manager';
import { TaskManager } from './storage/task-manager';
import { ImportExportManager } from './storage/import-export-manager';
import { TaskAssociationManager } from './storage/task-association-manager';
import type { ExecutionLog, ScheduledTask } from './storage/types';

export type { ExecutionLog, ScheduledTask };

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

  // Task management methods
  static getScheduledTasks = TaskManager.getScheduledTasks;
  static addScheduledTask = TaskManager.addScheduledTask;
  static updateScheduledTask = TaskManager.updateScheduledTask;
  static deleteScheduledTask = TaskManager.deleteScheduledTask;
  static getRelatedScheduledTasks = TaskManager.getRelatedScheduledTasks;
  static getItemScheduledTasks = TaskManager.getItemScheduledTasks;
  static forceRefreshScheduledTasks = TaskManager.forceRefreshScheduledTasks;
  static clearScheduledTasksCache = TaskManager.clearScheduledTasksCache;

  // Import/Export methods
  static exportData = ImportExportManager.exportData;
  static validateImportData = ImportExportManager.validateImportData;
  static importData = ImportExportManager.importData;
  static debugImport = ImportExportManager.debugImport;

  // Task association methods
  static validateAndFixTaskAssociations = TaskAssociationManager.validateAndFixTaskAssociations;
  static fixScheduledTaskAssociations = TaskAssociationManager.fixScheduledTaskAssociations;

  // Environment checks
  static isClient = (): boolean => typeof window !== 'undefined';
  static isStorageAvailable = (): boolean => true;
}

import { ItemManager } from './storage/item-manager';
import { TaskManager } from './storage/task-manager';
import { ImportExportManager } from './storage/import-export-manager';
import { TaskAssociationManager } from './storage/task-association-manager';

// 执行日志条目接口
export interface ExecutionLog {
  id: string;
  timestamp: string;
  step: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  details?: unknown;
}

export interface ScheduledTask {
  id: string;
  itemId: string; // 关联的项目ID
  itemTitle: string; // 冗余存储项目标题，用于显示和恢复
  itemTmdbId?: string; // 冗余存储项目TMDB ID，用于恢复关联
  name: string;
  type: 'tmdb-import';
  schedule: {
    type: 'weekly' | 'daily';
    dayOfWeek?: number; // 0-6，周一到周日，仅weekly类型需要
    secondDayOfWeek?: number; // 0-6，第二播出日，用于每周双更剧集，可选
    hour: number; // 0-23
    minute: number; // 0-59
  };
  action: {
    seasonNumber: number;
    autoUpload: boolean;
    conflictAction: 'w' | 'y' | 'n'; // w=覆盖写入, y=跳过, n=取消
    autoRemoveMarked: boolean;
    autoConfirm?: boolean; // 新增：自动确认上传（输入y）
    removeAirDateColumn?: boolean; // 删除air_date列
    removeRuntimeColumn?: boolean; // 删除runtime列
    removeBackdropColumn?: boolean; // 删除backdrop列
    autoMarkUploaded?: boolean; // 新增：自动标记已上传的集数
    // 用户自定义特殊处理选项
    enableYoukuSpecialHandling?: boolean; // 优酷平台特殊处理（+1集数）
    enableTitleCleaning?: boolean; // 词条标题清理功能
    autoDeleteWhenCompleted?: boolean; // 完结后自动删除任务
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  lastRunStatus?: 'success' | 'failed' | 'user_interrupted'; // 新增：最后执行状态
  lastRunError?: string | null; // 新增：最后执行错误信息
  // 执行日志相关字段
  currentStep?: string; // 当前执行步骤
  executionProgress?: number; // 执行进度 (0-100)
  executionLogs?: ExecutionLog[]; // 执行日志列表
  isRunning?: boolean; // 是否正在执行
  createdAt: string;
  updatedAt: string;
}

export class StorageManager {
  // Item management methods (from ItemManager)
  static getItemsWithRetry = (...args: Parameters<typeof ItemManager.getItemsWithRetry>) => ItemManager.getItemsWithRetry(...args);
  static getItems = (...args: Parameters<typeof ItemManager.getItems>) => ItemManager.getItems(...args);
  static addItem = (...args: Parameters<typeof ItemManager.addItem>) => ItemManager.addItem(...args);
  static updateItem = (...args: Parameters<typeof ItemManager.updateItem>) => ItemManager.updateItem(...args);
  static deleteItem = (...args: Parameters<typeof ItemManager.deleteItem>) => ItemManager.deleteItem(...args);
  static findItemById = (...args: Parameters<typeof ItemManager.findItemById>) => ItemManager.findItemById(...args);
  static hasAnyItems = (...args: Parameters<typeof ItemManager.hasAnyItems>) => ItemManager.hasAnyItems(...args);

  // Task management methods (from TaskManager)
  static getScheduledTasks = (...args: Parameters<typeof TaskManager.getScheduledTasks>) => TaskManager.getScheduledTasks(...args);
  static addScheduledTask = (...args: Parameters<typeof TaskManager.addScheduledTask>) => TaskManager.addScheduledTask(...args);
  static updateScheduledTask = (...args: Parameters<typeof TaskManager.updateScheduledTask>) => TaskManager.updateScheduledTask(...args);
  static deleteScheduledTask = (...args: Parameters<typeof TaskManager.deleteScheduledTask>) => TaskManager.deleteScheduledTask(...args);
  static getRelatedScheduledTasks = (...args: Parameters<typeof TaskManager.getRelatedScheduledTasks>) => TaskManager.getRelatedScheduledTasks(...args);
  static getItemScheduledTasks = (...args: Parameters<typeof TaskManager.getItemScheduledTasks>) => TaskManager.getItemScheduledTasks(...args);
  static forceRefreshScheduledTasks = (...args: Parameters<typeof TaskManager.forceRefreshScheduledTasks>) => TaskManager.forceRefreshScheduledTasks(...args);
  static clearScheduledTasksCache = (...args: Parameters<typeof TaskManager.clearScheduledTasksCache>) => TaskManager.clearScheduledTasksCache(...args);

  // Import/Export methods (from ImportExportManager)
  static exportData = (...args: Parameters<typeof ImportExportManager.exportData>) => ImportExportManager.exportData(...args);
  static validateImportData = (...args: Parameters<typeof ImportExportManager.validateImportData>) => ImportExportManager.validateImportData(...args);
  static importData = (...args: Parameters<typeof ImportExportManager.importData>) => ImportExportManager.importData(...args);
  static debugImport = (...args: Parameters<typeof ImportExportManager.debugImport>) => ImportExportManager.debugImport(...args);

  // Task association methods (from TaskAssociationManager)
  static validateAndFixTaskAssociations = (...args: Parameters<typeof TaskAssociationManager.validateAndFixTaskAssociations>) => TaskAssociationManager.validateAndFixTaskAssociations(...args);
  static fixScheduledTaskAssociations = (...args: Parameters<typeof TaskAssociationManager.fixScheduledTaskAssociations>) => TaskAssociationManager.fixScheduledTaskAssociations(...args);

  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * 检查存储是否可用
   */
  static isStorageAvailable(): boolean {
    return true;
  }
}

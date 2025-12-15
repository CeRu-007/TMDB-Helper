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

export interface ImportDataValidationResult {
  isValid: boolean;
  error?: string;
  data?: {
    items: unknown[];
    tasks: ScheduledTask[];
    version?: string;
    exportDate?: string;
  };
  stats?: {
    itemCount: number;
    taskCount: number;
    validItemCount: number;
    validTaskCount: number;
  };
  isDuplicate?: boolean; // 新增：标识是否为重复数据
  duplicateInfo?: string; // 新增：重复信息描述
}

export interface StorageStatus {
  hasItems: boolean;
  itemCount: number;
  storageType: 'fileStorage';
  isClientEnvironment: boolean;
  isStorageAvailable: boolean;
  lastError?: string;
}

export interface TaskAssociationValidationResult {
  totalTasks: number;
  invalidTasks: number;
  fixedTasks: number;
  deletedTasks: number;
  details: string[];
}

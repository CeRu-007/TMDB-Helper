/**
 * Task Scheduler Module
 * 统一导出调度器模块的所有公共接口
 */

// 导出主调度器（保持向后兼容）
export { default as TaskScheduler } from './scheduler';
export { taskScheduler } from './scheduler';

// 导出类型定义
export * from './types';

// 导出子模块（可选，供高级使用）
export { TaskManager } from './task-manager';
export { TaskExecutor } from './task-executor';
export { TimerManager } from './timer-manager';
export { ProjectManager } from './project-manager';
export { TaskLifecycle } from './task-lifecycle';
export { TaskQueue } from './task-queue';
export { SchedulerValidator } from './scheduler-validator';

// 导出任务执行相关的子模块
export { TMDBImportWorkflow } from './tmdb-import-workflow';
export { PlatformExtractor } from './platform-extractor';
export { CSVProcessor } from './csv-processor';
export { TMDBImporter } from './tmdb-importer';
export { EpisodeMarker } from './episode-marker';
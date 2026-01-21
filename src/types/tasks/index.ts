import { BaseEntity, Status } from '../common'

// Task base types
export interface Task extends BaseEntity {
  name: string
  description?: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  config: TaskConfig
  schedule?: TaskSchedule
  executionHistory?: TaskExecution[]
  dependencies?: string[] // task IDs
  tags?: string[]
  projectId?: string
  createdBy: string
  assignedTo?: string
  estimatedDuration?: number
  actualDuration?: number
  retryCount?: number
  maxRetries?: number
  timeout?: number
  metadata?: Record<string, unknown>
}

export enum TaskType {
  TMDB_IMPORT = 'tmdb_import',
  PLATFORM_EXTRACTION = 'platform_extraction',
  DATA_SYNC = 'data_sync',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
  METADATA_EXTRACTION = 'metadata_extraction',
  SUBTITLE_EXTRACTION = 'subtitle_extraction',
  VIDEO_ANALYSIS = 'video_analysis',
  IMAGE_PROCESSING = 'image_processing',
  CUSTOM = 'custom'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  RETRYING = 'retrying',
  TIMEOUT = 'timeout'
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

// Task configuration
export interface TaskConfig {
  [key: string]: unknown
  // Common config fields
  inputPath?: string
  outputPath?: string
  filters?: Record<string, unknown>
  options?: Record<string, unknown>
}

// TMDB Import specific config
export interface TmdbImportConfig extends TaskConfig {
  tmdbApiKey?: string
  importType: 'movie' | 'tv_show' | 'person'
  tmdbId?: number
  searchQuery?: string
  language?: string
  includeImages?: boolean
  includeVideos?: boolean
  includeCredits?: boolean
  maxResults?: number
}

// Platform extraction specific config
export interface PlatformExtractionConfig extends TaskConfig {
  platform: string
  sourcePath: string
  destinationPath: string
  extractSubtitles?: boolean
  extractMetadata?: boolean
  extractThumbnails?: boolean
  quality?: 'low' | 'medium' | 'high'
}

// Task scheduling
export interface TaskSchedule {
  type: ScheduleType
  enabled: boolean
  timezone?: string
  nextRun?: number
  lastRun?: number
  interval?: number
  cronExpression?: string
  endDate?: number
  maxRuns?: number
  runCount?: number
}

export enum ScheduleType {
  ONCE = 'once',
  INTERVAL = 'interval',
  CRON = 'cron',
  MANUAL = 'manual'
}

// Task execution
export interface TaskExecution extends BaseEntity {
  taskId: string
  status: TaskStatus
  startedAt?: number
  completedAt?: number
  duration?: number
  progress: TaskProgress
  logs: TaskLog[]
  result?: TaskResult
  error?: TaskError
  resources?: ResourceUsage
  triggeredBy: 'schedule' | 'manual' | 'dependency'
  retryAttempt?: number
}

export interface TaskProgress {
  percentage: number
  currentStep?: string
  totalSteps?: number
  completedSteps?: number
  estimatedTimeRemaining?: number
  message?: string
}

export interface TaskLog {
  id: string
  level: LogLevel
  message: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface TaskResult {
  success: boolean
  data?: unknown
  statistics?: TaskStatistics
  artifacts?: TaskArtifact[]
}

export interface TaskStatistics {
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  itemsSkipped: number
  startTime: number
  endTime: number
  duration: number
  throughput?: number
}

export interface TaskArtifact {
  name: string
  type: string
  path: string
  size: number
  checksum?: string
  metadata?: Record<string, unknown>
}

export interface TaskError {
  code: string
  message: string
  stack?: string
  details?: Record<string, unknown>
  recoverable: boolean
  retryable: boolean
}

export interface ResourceUsage {
  cpu: {
    percentage: number
    cores: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
    readSpeed?: number
    writeSpeed?: number
  }
  network?: {
    bytesIn: number
    bytesOut: number
    speed?: number
  }
}

// Task queue management
export interface TaskQueue {
  id: string
  name: string
  description?: string
  maxConcurrency: number
  priority: number
  isActive: boolean
  tasks: QueuedTask[]
  metrics: QueueMetrics
}

export interface QueuedTask {
  task: Task
  queuePosition: number
  enqueuedAt: number
  estimatedStartAt?: number
  dependencies: string[]
  dependents: string[]
}

export interface QueueMetrics {
  totalTasks: number
  pendingTasks: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
  averageWaitTime: number
  averageExecutionTime: number
  throughput: number
}

// Task templates
export interface TaskTemplate extends BaseEntity {
  name: string
  description: string
  taskType: TaskType
  configTemplate: TaskConfig
  scheduleTemplate?: TaskSchedule
  isActive: boolean
  usageCount: number
  createdBy: string
}

// Task monitoring and alerts
export interface TaskAlert extends BaseEntity {
  taskId: string
  type: AlertType
  severity: AlertSeverity
  message: string
  resolved: boolean
  acknowledgedBy?: string
  acknowledgedAt?: number
}

export enum AlertType {
  TASK_FAILED = 'task_failed',
  TASK_TIMEOUT = 'task_timeout',
  QUEUE_FULL = 'queue_full',
  RESOURCE_HIGH = 'resource_high',
  TASK_STALLED = 'task_stalled',
  DEPENDENCY_FAILED = 'dependency_failed'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Bulk operations
export interface BulkTaskOperation {
  operation: BulkOperationType
  taskIds: string[]
  parameters?: Record<string, unknown>
}

export enum BulkOperationType {
  START = 'start',
  STOP = 'stop',
  CANCEL = 'cancel',
  RETRY = 'retry',
  DELETE = 'delete',
  UPDATE_PRIORITY = 'update_priority',
  UPDATE_SCHEDULE = 'update_schedule'
}

export interface BulkTaskResult {
  operation: BulkOperationType
  total: number
  successful: number
  failed: number
  results: TaskOperationResult[]
}

export interface TaskOperationResult {
  taskId: string
  success: boolean
  error?: string
}
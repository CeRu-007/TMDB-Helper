/**
 * Stores Index
 * 导出所有 Zustand stores 和 hooks
 */

// Media Store
export {
  useMediaStore,
  useMediaItems,
  useMediaLoading,
  useMediaError,
  useMediaInitialized,
  useMediaStats,
} from './media-store'

// MediaNews Store
export {
  useMediaNewsStore,
  useUpcomingItems,
  useRecentItems,
  useMediaNewsLoading,
  useMediaNewsErrors,
  useMediaNewsRegion,
} from './media-news-store'

// UI Store
export {
  useUIStore,
  useDialogState,
  useFilterState,
  useSelectionState,
} from './ui-store'

// Task Store
export {
  useTaskStore,
  useTasks,
  useRunningTasks,
  useTaskLoading,
  useTaskError,
  useTaskStats,
} from './task-store'

// 向后兼容的 hooks
export * from './hooks'

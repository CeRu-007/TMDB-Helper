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
  useUpcomingItemsForRegion,
  useRecentItemsForRegion,
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

// 向后兼容的 hooks
export * from './hooks'

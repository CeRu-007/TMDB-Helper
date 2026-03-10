/**
 * UI Store - UI 状态管理
 * 管理对话框状态、选中项、过滤条件等
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { TMDBItem } from '@/types/tmdb-item'

// 对话框状态类型
interface DialogState {
  showAddDialog: boolean
  showSettingsDialog: boolean
  settingsInitialSection: string | undefined
  showTasksDialog: boolean
  showImportDialog: boolean
  showExportDialog: boolean
  showExecutionLogs: boolean
  showScheduledTaskDialog: boolean
}

// 过滤状态类型
interface FilterState {
  activeTab: string
  selectedDayFilter: 'recent' | number
  selectedCategory: string
  searchQuery: string
}

// 选中的项目类型
interface SelectionState {
  selectedItem: TMDBItem | null
  scheduledTaskItem: TMDBItem | null
}

// UI 状态接口
interface UIState extends DialogState, FilterState, SelectionState {
  // 对话框操作
  openAddDialog: () => void
  closeAddDialog: () => void
  openSettingsDialog: (section?: string) => void
  closeSettingsDialog: () => void
  openTasksDialog: () => void
  closeTasksDialog: () => void
  openImportDialog: () => void
  closeImportDialog: () => void
  openExportDialog: () => void
  closeExportDialog: () => void
  openExecutionLogs: () => void
  closeExecutionLogs: () => void
  openScheduledTaskDialog: () => void
  closeScheduledTaskDialog: () => void
  
  // 过滤操作
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: 'recent' | number) => void
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
  
  // 选中项操作
  setSelectedItem: (item: TMDBItem | null) => void
  setScheduledTaskItem: (item: TMDBItem | null) => void
  clearSelections: () => void
  
  // 全局操作
  closeAllDialogs: () => void
  reset: () => void
}

// 初始状态
const initialDialogState: DialogState = {
  showAddDialog: false,
  showSettingsDialog: false,
  settingsInitialSection: undefined,
  showTasksDialog: false,
  showImportDialog: false,
  showExportDialog: false,
  showExecutionLogs: false,
  showScheduledTaskDialog: false,
}

const initialFilterState: FilterState = {
  activeTab: 'ongoing',
  selectedDayFilter: 'recent',
  selectedCategory: 'all',
  searchQuery: '',
}

const initialSelectionState: SelectionState = {
  selectedItem: null,
  scheduledTaskItem: null,
}

const initialState = {
  ...initialDialogState,
  ...initialFilterState,
  ...initialSelectionState,
}

// 创建 store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // 对话框操作
        openAddDialog: () => set({ showAddDialog: true }, false, 'openAddDialog'),
        closeAddDialog: () => set({ showAddDialog: false }, false, 'closeAddDialog'),
        
        openSettingsDialog: (section) => set(
          { showSettingsDialog: true, settingsInitialSection: section },
          false,
          'openSettingsDialog'
        ),
        closeSettingsDialog: () => set(
          { showSettingsDialog: false, settingsInitialSection: undefined },
          false,
          'closeSettingsDialog'
        ),
        
        openTasksDialog: () => set({ showTasksDialog: true }, false, 'openTasksDialog'),
        closeTasksDialog: () => set({ showTasksDialog: false }, false, 'closeTasksDialog'),
        
        openImportDialog: () => set({ showImportDialog: true }, false, 'openImportDialog'),
        closeImportDialog: () => set({ showImportDialog: false }, false, 'closeImportDialog'),
        
        openExportDialog: () => set({ showExportDialog: true }, false, 'openExportDialog'),
        closeExportDialog: () => set({ showExportDialog: false }, false, 'closeExportDialog'),
        
        openExecutionLogs: () => set({ showExecutionLogs: true }, false, 'openExecutionLogs'),
        closeExecutionLogs: () => set({ showExecutionLogs: false }, false, 'closeExecutionLogs'),
        
        openScheduledTaskDialog: () => set(
          { showScheduledTaskDialog: true },
          false,
          'openScheduledTaskDialog'
        ),
        closeScheduledTaskDialog: () => set(
          { showScheduledTaskDialog: false },
          false,
          'closeScheduledTaskDialog'
        ),
        
        // 过滤操作
        setActiveTab: (activeTab) => set({ activeTab }, false, 'setActiveTab'),
        setSelectedDayFilter: (selectedDayFilter) => set(
          { selectedDayFilter },
          false,
          'setSelectedDayFilter'
        ),
        setSelectedCategory: (selectedCategory) => set(
          { selectedCategory },
          false,
          'setSelectedCategory'
        ),
        setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),
        resetFilters: () => set(initialFilterState, false, 'resetFilters'),
        
        // 选中项操作
        setSelectedItem: (selectedItem) => set({ selectedItem }, false, 'setSelectedItem'),
        setScheduledTaskItem: (scheduledTaskItem) => set(
          { scheduledTaskItem },
          false,
          'setScheduledTaskItem'
        ),
        clearSelections: () => set(initialSelectionState, false, 'clearSelections'),
        
        // 全局操作
        closeAllDialogs: () => set(initialDialogState, false, 'closeAllDialogs'),
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'ui-store',
        // 持久化过滤状态，不持久化对话框状态
        partialize: (state) => ({
          activeTab: state.activeTab,
          selectedDayFilter: state.selectedDayFilter,
          selectedCategory: state.selectedCategory,
        }),
      }
    ),
    { name: 'UIStore' }
  )
)

// 选择器 hooks
export const useDialogState = () => useUIStore((state) => ({
  showAddDialog: state.showAddDialog,
  showSettingsDialog: state.showSettingsDialog,
  settingsInitialSection: state.settingsInitialSection,
  showTasksDialog: state.showTasksDialog,
  showImportDialog: state.showImportDialog,
  showExportDialog: state.showExportDialog,
  showExecutionLogs: state.showExecutionLogs,
  showScheduledTaskDialog: state.showScheduledTaskDialog,
}))

export const useFilterState = () => useUIStore((state) => ({
  activeTab: state.activeTab,
  selectedDayFilter: state.selectedDayFilter,
  selectedCategory: state.selectedCategory,
  searchQuery: state.searchQuery,
}))

export const useSelectionState = () => useUIStore((state) => ({
  selectedItem: state.selectedItem,
  scheduledTaskItem: state.scheduledTaskItem,
}))

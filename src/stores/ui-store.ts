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
  showImportDialog: boolean
  showExportDialog: boolean
  showJournalDialog: boolean
  journalUnreadCount: number
  addDialogPrefilledData: {
    id: number
    title: string
    mediaType: 'movie' | 'tv'
    posterPath?: string | null
    releaseDate: string
    overview?: string
    voteAverage?: number
  } | null
}

// 过滤状态类型
interface FilterState {
  activeTab: string
  selectedDayFilter: 'recent' | number
  selectedCategory: string
  searchQuery: string
  selectedPlatform: string
}

// 选中的项目类型
interface SelectionState {
  selectedItem: TMDBItem | null
}

// UI 状态接口
interface UIState extends DialogState, FilterState, SelectionState {
  // 对话框操作
  openAddDialog: (prefilledData?: DialogState['addDialogPrefilledData']) => void
  closeAddDialog: () => void
  openSettingsDialog: (section?: string) => void
  closeSettingsDialog: () => void
  openImportDialog: () => void
  closeImportDialog: () => void
  openExportDialog: () => void
  closeExportDialog: () => void
  openJournalDialog: () => void
  closeJournalDialog: () => void
  setJournalUnreadCount: (count: number) => void

  // 过滤操作
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: 'recent' | number) => void
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  setSelectedPlatform: (platform: string) => void
  resetFilters: () => void

  // 选中项操作
  setSelectedItem: (item: TMDBItem | null) => void
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
  showImportDialog: false,
  showExportDialog: false,
  showJournalDialog: false,
  journalUnreadCount: 0,
  addDialogPrefilledData: null,
}

const initialFilterState: FilterState = {
  activeTab: 'ongoing',
  selectedDayFilter: 'recent',
  selectedCategory: 'all',
  searchQuery: '',
  selectedPlatform: 'all',
}

const initialSelectionState: SelectionState = {
  selectedItem: null,
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
        openAddDialog: (prefilledData) => set({ 
          showAddDialog: true, 
          addDialogPrefilledData: prefilledData || null 
        }, false, 'openAddDialog'),
        closeAddDialog: () => set({ showAddDialog: false, addDialogPrefilledData: null }, false, 'closeAddDialog'),
        openSettingsDialog: (section?: string) => set({ showSettingsDialog: true, settingsInitialSection: section }, false, 'openSettingsDialog'),
        closeSettingsDialog: () => set({ showSettingsDialog: false, settingsInitialSection: undefined }, false, 'closeSettingsDialog'),
        openImportDialog: () => set({ showImportDialog: true }, false, 'openImportDialog'),
        closeImportDialog: () => set({ showImportDialog: false }, false, 'closeImportDialog'),
        openExportDialog: () => set({ showExportDialog: true }, false, 'openExportDialog'),
        closeExportDialog: () => set({ showExportDialog: false }, false, 'closeExportDialog'),
        openJournalDialog: () => set({ showJournalDialog: true }, false, 'openJournalDialog'),
        closeJournalDialog: () => set({ showJournalDialog: false }, false, 'closeJournalDialog'),
        setJournalUnreadCount: (count: number) => set({ journalUnreadCount: count }, false, 'setJournalUnreadCount'),

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
        setSelectedPlatform: (selectedPlatform) => set({ selectedPlatform }, false, 'setSelectedPlatform'),
        resetFilters: () => set(initialFilterState, false, 'resetFilters'),

        // 选中项操作
        setSelectedItem: (selectedItem) => set({ selectedItem }, false, 'setSelectedItem'),
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
  addDialogPrefilledData: state.addDialogPrefilledData,
  showSettingsDialog: state.showSettingsDialog,
  settingsInitialSection: state.settingsInitialSection,
  showImportDialog: state.showImportDialog,
  showExportDialog: state.showExportDialog,
  showJournalDialog: state.showJournalDialog,
}))

export const useFilterState = () => useUIStore((state) => ({
  activeTab: state.activeTab,
  selectedDayFilter: state.selectedDayFilter,
  selectedCategory: state.selectedCategory,
  searchQuery: state.searchQuery,
  selectedPlatform: state.selectedPlatform,
}))

export const useSelectionState = () => useUIStore((state) => ({
  selectedItem: state.selectedItem,
}))

/**
 * useHomeState - 使用 Zustand stores 的向后兼容 hook
 * 
 * 这个 hook 是一个过渡层，将原有的 useHomeState API 映射到 Zustand stores。
 * 未来可以直接使用 stores 中的选择器 hooks。
 * 
 * @deprecated 建议直接使用 useUIStore 和 useTaskStore
 */

import { useCallback } from 'react'
import { useUIStore, useTaskStore } from '@/stores'
import type { TMDBItem } from '@/types/tmdb-item'
import type { ScheduledTask } from '@/lib/data/storage/types'

// 向后兼容的类型定义
export interface UseHomeStateReturn {
  // 对话框状态
  showAddDialog: boolean
  showSettingsDialog: boolean
  settingsInitialSection: string | undefined
  showTasksDialog: boolean
  showImportDialog: boolean
  showExportDialog: boolean
  showExecutionLogs: boolean
  showScheduledTaskDialog: boolean

  // 选中的项目
  selectedItem: TMDBItem | null
  scheduledTaskItem: TMDBItem | null

  // 运行中的任务
  runningTasks: ScheduledTask[]

  // 主页面状态
  activeTab: string
  selectedDayFilter: 'recent' | number
  selectedCategory: string

  // 设置函数
  setShowAddDialog: (show: boolean) => void
  setShowSettingsDialog: (show: boolean) => void
  setSettingsInitialSection: (section: string | undefined) => void
  setShowTasksDialog: (show: boolean) => void
  setShowImportDialog: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void
  setShowExecutionLogs: (show: boolean) => void
  setShowScheduledTaskDialog: (show: boolean) => void

  setSelectedItem: (item: TMDBItem | null) => void
  setScheduledTaskItem: (item: TMDBItem | null) => void
  setRunningTasks: (tasks: ScheduledTask[]) => void
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: 'recent' | number) => void
  setSelectedCategory: (category: string) => void
}

/**
 * @deprecated 建议直接使用 useUIStore 和 useTaskStore
 */
export function useHomeState(): UseHomeStateReturn {
  // 从 UI Store 获取状态和操作
  const showAddDialog = useUIStore((s) => s.showAddDialog)
  const showSettingsDialog = useUIStore((s) => s.showSettingsDialog)
  const settingsInitialSection = useUIStore((s) => s.settingsInitialSection)
  const showTasksDialog = useUIStore((s) => s.showTasksDialog)
  const showImportDialog = useUIStore((s) => s.showImportDialog)
  const showExportDialog = useUIStore((s) => s.showExportDialog)
  const showExecutionLogs = useUIStore((s) => s.showExecutionLogs)
  const showScheduledTaskDialog = useUIStore((s) => s.showScheduledTaskDialog)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const scheduledTaskItem = useUIStore((s) => s.scheduledTaskItem)
  const activeTab = useUIStore((s) => s.activeTab)
  const selectedDayFilter = useUIStore((s) => s.selectedDayFilter)
  const selectedCategory = useUIStore((s) => s.selectedCategory)

  // 从 UI Store 获取操作方法
  const openAddDialog = useUIStore((s) => s.openAddDialog)
  const closeAddDialog = useUIStore((s) => s.closeAddDialog)
  const openSettingsDialog = useUIStore((s) => s.openSettingsDialog)
  const closeSettingsDialog = useUIStore((s) => s.closeSettingsDialog)
  const openTasksDialog = useUIStore((s) => s.openTasksDialog)
  const closeTasksDialog = useUIStore((s) => s.closeTasksDialog)
  const openImportDialog = useUIStore((s) => s.openImportDialog)
  const closeImportDialog = useUIStore((s) => s.closeImportDialog)
  const openExportDialog = useUIStore((s) => s.openExportDialog)
  const closeExportDialog = useUIStore((s) => s.closeExportDialog)
  const openExecutionLogs = useUIStore((s) => s.openExecutionLogs)
  const closeExecutionLogs = useUIStore((s) => s.closeExecutionLogs)
  const openScheduledTaskDialog = useUIStore((s) => s.openScheduledTaskDialog)
  const closeScheduledTaskDialog = useUIStore((s) => s.closeScheduledTaskDialog)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)
  const setScheduledTaskItem = useUIStore((s) => s.setScheduledTaskItem)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const setSelectedDayFilter = useUIStore((s) => s.setSelectedDayFilter)
  const setSelectedCategory = useUIStore((s) => s.setSelectedCategory)

  // 从 Task Store 获取状态和操作
  const runningTasks = useTaskStore((s) => s.runningTasks)
  const setRunningTasks = useTaskStore((s) => s.setRunningTasks)

  // 向后兼容的设置函数
  const setShowAddDialog = useCallback(
    (show: boolean) => (show ? openAddDialog() : closeAddDialog()),
    [openAddDialog, closeAddDialog]
  )

  const setShowSettingsDialog = useCallback(
    (show: boolean) => (show ? openSettingsDialog() : closeSettingsDialog()),
    [openSettingsDialog, closeSettingsDialog]
  )

  const setSettingsInitialSection = useCallback(
    (section: string | undefined) => {
      if (section) {
        openSettingsDialog(section)
      }
    },
    [openSettingsDialog]
  )

  const setShowTasksDialog = useCallback(
    (show: boolean) => (show ? openTasksDialog() : closeTasksDialog()),
    [openTasksDialog, closeTasksDialog]
  )

  const setShowImportDialog = useCallback(
    (show: boolean) => (show ? openImportDialog() : closeImportDialog()),
    [openImportDialog, closeImportDialog]
  )

  const setShowExportDialog = useCallback(
    (show: boolean) => (show ? openExportDialog() : closeExportDialog()),
    [openExportDialog, closeExportDialog]
  )

  const setShowExecutionLogs = useCallback(
    (show: boolean) => (show ? openExecutionLogs() : closeExecutionLogs()),
    [openExecutionLogs, closeExecutionLogs]
  )

  const setShowScheduledTaskDialog = useCallback(
    (show: boolean) => (show ? openScheduledTaskDialog() : closeScheduledTaskDialog()),
    [openScheduledTaskDialog, closeScheduledTaskDialog]
  )

  return {
    // 对话框状态
    showAddDialog,
    showSettingsDialog,
    settingsInitialSection,
    showTasksDialog,
    showImportDialog,
    showExportDialog,
    showExecutionLogs,
    showScheduledTaskDialog,

    // 选中的项目
    selectedItem,
    scheduledTaskItem,

    // 运行中的任务
    runningTasks,

    // 主页面状态
    activeTab,
    selectedDayFilter,
    selectedCategory,

    // 设置函数
    setShowAddDialog,
    setShowSettingsDialog,
    setSettingsInitialSection,
    setShowTasksDialog,
    setShowImportDialog,
    setShowExportDialog,
    setShowExecutionLogs,
    setShowScheduledTaskDialog,

    setSelectedItem,
    setScheduledTaskItem,
    setRunningTasks,
    setActiveTab,
    setSelectedDayFilter,
    setSelectedCategory,
  }
}

"use client"

import { useState } from 'react'
import { TMDBItem } from '@/lib/data/storage'
import { ScheduledTask } from '@/lib/data/storage'

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
  selectedDayFilter: "recent" | number
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
  setSelectedDayFilter: (filter: "recent" | number) => void
  setSelectedCategory: (category: string) => void
}

export function useHomeState(): UseHomeStateReturn {
  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined)
  const [showTasksDialog, setShowTasksDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showExecutionLogs, setShowExecutionLogs] = useState(false)
  const [showScheduledTaskDialog, setShowScheduledTaskDialog] = useState(false)

  // 选中的项目
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)
  const [scheduledTaskItem, setScheduledTaskItem] = useState<TMDBItem | null>(null)

  // 运行中的任务
  const [runningTasks, setRunningTasks] = useState<ScheduledTask[]>([])

  // 主页面状态
  const [activeTab, setActiveTab] = useState("ongoing")
  const [selectedDayFilter, setSelectedDayFilter] = useState<"recent" | number>("recent")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

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
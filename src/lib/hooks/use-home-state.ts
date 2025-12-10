"use client"

import { useState, useCallback } from 'react'
import { TMDBItem } from '@/lib/data/storage'
import { log } from '@/lib/utils/logger'

export interface UseHomeStateReturn {
  // 对话框状态
  showAddDialog: boolean
  showSettingsDialog: boolean
  showTasksDialog: boolean
  showImportDialog: boolean
  showExportDialog: boolean
  showExecutionLogs: boolean
  setShowAddDialog: (show: boolean) => void
  setShowSettingsDialog: (show: boolean) => void
  setShowTasksDialog: (show: boolean) => void
  setShowImportDialog: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void
  setShowExecutionLogs: (show: boolean) => void

  // 选中项目
  selectedItem: TMDBItem | null
  setSelectedItem: (item: TMDBItem | null) => void

  // 当前日期和筛选
  currentDay: number
  setCurrentDay: (day: number) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedDayFilter: "recent" | number
  setSelectedDayFilter: (filter: "recent" | number) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  selectedRegion: string
  setSelectedRegion: (region: string) => void
  mediaNewsType: string
  setMediaNewsType: (type: string) => void
}

export function useHomeState(): UseHomeStateReturn {
  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showTasksDialog, setShowTasksDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showExecutionLogs, setShowExecutionLogs] = useState(false)

  // 选中项目
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)

  // 当前日期和筛选
  const [currentDay, setCurrentDay] = useState(() => {
    if (typeof window !== 'undefined') {
      const jsDay = new Date().getDay() // 0-6，0是周日
      return jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
    }
    return 0 // 默认周一
  })

  const [activeTab, setActiveTab] = useState("ongoing")
  const [selectedDayFilter, setSelectedDayFilter] = useState<"recent" | number>("recent")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("CN")
  const [mediaNewsType, setMediaNewsType] = useState<string>('upcoming')

  // 带日志的状态更新函数
  const handleSetShowAddDialog = useCallback((show: boolean) => {
    log.debug('HomeState', `设置添加对话框: ${show}`)
    setShowAddDialog(show)
  }, [])

  const handleSetShowSettingsDialog = useCallback((show: boolean) => {
    log.debug('HomeState', `设置设置对话框: ${show}`)
    setShowSettingsDialog(show)
  }, [])

  const handleSetShowTasksDialog = useCallback((show: boolean) => {
    log.debug('HomeState', `设置任务对话框: ${show}`)
    setShowTasksDialog(show)
  }, [])

  const handleSetShowImportDialog = useCallback((show: boolean) => {
    log.debug('HomeState', `设置导入对话框: ${show}`)
    setShowImportDialog(show)
  }, [])

  const handleSetShowExportDialog = useCallback((show: boolean) => {
    log.debug('HomeState', `设置导出对话框: ${show}`)
    setShowExportDialog(show)
  }, [])

  const handleSetShowExecutionLogs = useCallback((show: boolean) => {
    log.debug('HomeState', `设置执行日志对话框: ${show}`)
    setShowExecutionLogs(show)
  }, [])

  const handleSetSelectedItem = useCallback((item: TMDBItem | null) => {
    log.debug('HomeState', `选中项目: ${item?.title || 'null'}`)
    setSelectedItem(item)
  }, [])

  const handleSetActiveTab = useCallback((tab: string) => {
    log.debug('HomeState', `切换标签页: ${tab}`)
    setActiveTab(tab)
  }, [])

  const handleSetSelectedCategory = useCallback((category: string) => {
    log.debug('HomeState', `切换分类: ${category}`)
    setSelectedCategory(category)
  }, [])

  const handleSetSelectedRegion = useCallback((region: string) => {
    log.debug('HomeState', `切换区域: ${region}`)
    setSelectedRegion(region)
  }, [])

  return {
    // 对话框状态
    showAddDialog,
    showSettingsDialog,
    showTasksDialog,
    showImportDialog,
    showExportDialog,
    showExecutionLogs,
    setShowAddDialog: handleSetShowAddDialog,
    setShowSettingsDialog: handleSetShowSettingsDialog,
    setShowTasksDialog: handleSetShowTasksDialog,
    setShowImportDialog: handleSetShowImportDialog,
    setShowExportDialog: handleSetShowExportDialog,
    setShowExecutionLogs: handleSetShowExecutionLogs,

    // 选中项目
    selectedItem,
    setSelectedItem: handleSetSelectedItem,

    // 当前日期和筛选
    currentDay,
    setCurrentDay,
    activeTab,
    setActiveTab: handleSetActiveTab,
    selectedDayFilter,
    setSelectedDayFilter,
    selectedCategory,
    setSelectedCategory: handleSetSelectedCategory,
    selectedRegion,
    setSelectedRegion: handleSetSelectedRegion,
    mediaNewsType,
    setMediaNewsType
  }
}
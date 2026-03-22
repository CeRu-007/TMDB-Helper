"use client"

import { useState } from 'react'
import { TMDBItem } from '@/lib/data/storage'

export interface UseHomeStateReturn {
  // 对话框状态
  showAddDialog: boolean
  showSettingsDialog: boolean
  settingsInitialSection: string | undefined
  showImportDialog: boolean
  showExportDialog: boolean

  // 选中的项目
  selectedItem: TMDBItem | null

  // 主页面状态
  activeTab: string
  selectedDayFilter: "recent" | number
  selectedCategory: string

  // 设置函数
  setShowAddDialog: (show: boolean) => void
  setShowSettingsDialog: (show: boolean) => void
  setSettingsInitialSection: (section: string | undefined) => void
  setShowImportDialog: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void

  setSelectedItem: (item: TMDBItem | null) => void
  setActiveTab: (tab: string) => void
  setSelectedDayFilter: (filter: "recent" | number) => void
  setSelectedCategory: (category: string) => void
}

export function useHomeState(): UseHomeStateReturn {
  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // 选中的项目
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)

  // 主页面状态
  const [activeTab, setActiveTab] = useState("ongoing")
  const [selectedDayFilter, setSelectedDayFilter] = useState<"recent" | number>("recent")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  return {
    // 对话框状态
    showAddDialog,
    showSettingsDialog,
    settingsInitialSection,
    showImportDialog,
    showExportDialog,

    // 选中的项目
    selectedItem,

    // 主页面状态
    activeTab,
    selectedDayFilter,
    selectedCategory,

    // 设置函数
    setShowAddDialog,
    setShowSettingsDialog,
    setSettingsInitialSection,
    setShowImportDialog,
    setShowExportDialog,

    setSelectedItem,
    setActiveTab,
    setSelectedDayFilter,
    setSelectedCategory,
  }
}

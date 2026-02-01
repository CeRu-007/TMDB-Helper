"use client"

import { useState, useEffect } from "react"
import type { TMDBItem } from "@/lib/data/storage"
import { DELAY_1500MS } from "@/lib/constants/constants"

interface UseItemDetailStateProps {
  item: TMDBItem
  onUpdate: (item: TMDBItem) => void
}

export function useItemDetailState({ item, onUpdate }: UseItemDetailStateProps) {
  // 核心状态
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item)
  const [localItem, setLocalItem] = useState<TMDBItem>(item)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState("details")
  const [scrollPosition, setScrollPosition] = useState(0)

  // 对话框状态
  const [showEpisodeChangeDialog, setShowEpisodeChangeDialog] = useState(false)
  const [episodeChangeData, setEpisodeChangeData] = useState<{
    oldCount: number
    newCount: number
    action: "increase" | "decrease"
  } | null>(null)
  const [showDeleteSeasonDialog, setShowDeleteSeasonDialog] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)
  const [scheduledTaskDialogOpen, setScheduledTaskDialogOpen] = useState(false)

  // 操作状态
  const [isRefreshingTMDBData, setIsRefreshingTMDBData] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 外观设置
  const [appearanceSettings, setAppearanceSettings] = useState<{
    detailBackdropBlurEnabled?: boolean
    detailBackdropBlurIntensity?: 'light' | 'medium' | 'heavy'
    detailBackdropOverlayOpacity?: number
  } | null>(null)

  // 同步本地状态与传入的item
  useEffect(() => {
    setLocalItem(item)
    setEditData(item)
  }, [item])

  // 更新项目的统一方法
  const updateLocalItem = (updatedItem: TMDBItem, notifyOnUpdate: boolean = true) => {
    setLocalItem(updatedItem)
    if (editing) {
      setEditData(updatedItem)
    }
    // 如果 notifyOnUpdate 为 true，才调用 onUpdate 回调
    if (notifyOnUpdate) {
      onUpdate(updatedItem)
    }
  }

  // 显示复制反馈
  const showFeedback = (message: string, duration: number = DELAY_1500MS) => {
    setCopyFeedback(message)
    setTimeout(() => setCopyFeedback(null), duration)
  }

  return {
    // 状态
    editing,
    setEditing,
    editData,
    setEditData,
    localItem,
    setLocalItem,
    copyFeedback,
    setCopyFeedback,
    detailTab,
    setDetailTab,
    scrollPosition,
    setScrollPosition,

    // 对话框状态
    showEpisodeChangeDialog,
    setShowEpisodeChangeDialog,
    episodeChangeData,
    setEpisodeChangeData,
    showDeleteSeasonDialog,
    setShowDeleteSeasonDialog,
    seasonToDelete,
    setSeasonToDelete,
    showDeleteDialog,
    setShowDeleteDialog,
    showMetadataDialog,
    setShowMetadataDialog,
    showFixBugDialog,
    setShowFixBugDialog,
    scheduledTaskDialogOpen,
    setScheduledTaskDialogOpen,

    // 操作状态
    isRefreshingTMDBData,
    setIsRefreshingTMDBData,
    refreshError,
    setRefreshError,
    isSaving,
    setIsSaving,

    // 外观设置
    appearanceSettings,
    setAppearanceSettings,

    // 工具方法
    updateLocalItem,
    showFeedback,
  }
}
"use client"

import { useState, useEffect } from "react"
import type { TMDBItem } from "@/lib/data/storage"
import { DELAY_1500MS } from "@/lib/constants/constants"

interface UseItemDetailStateProps {
  item: TMDBItem
  onUpdate: (item: TMDBItem) => void
}

export function useItemDetailState({ item, onUpdate }: UseItemDetailStateProps) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item)
  const [localItem, setLocalItem] = useState<TMDBItem>(item)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState("details")

  const [showEpisodeChangeDialog, setShowEpisodeChangeDialog] = useState(false)
  const [episodeChangeData, setEpisodeChangeData] = useState<{
    oldCount: number
    newCount: number
    action: "increase" | "decrease"
  } | null>(null)
  const [showDeleteSeasonDialog, setShowDeleteSeasonDialog] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFixBugDialog, setShowFixBugDialog] = useState(false)

  const [isRefreshingTMDBData, setIsRefreshingTMDBData] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
    showFixBugDialog,
    setShowFixBugDialog,

    isRefreshingTMDBData,
    setIsRefreshingTMDBData,
    refreshError,
    setRefreshError,
    isSaving,
    setIsSaving,

    appearanceSettings,
    setAppearanceSettings,

    updateLocalItem,
    showFeedback,
  }
}
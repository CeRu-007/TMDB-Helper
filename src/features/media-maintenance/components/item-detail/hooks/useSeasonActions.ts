"use client"

import { useState, useCallback } from "react"
import type { TMDBItem, Season } from "@/lib/data/storage"
import { DELAY_1S, DELAY_2S } from "@/lib/constants/constants"

interface UseSeasonActionsProps {
  localItem: TMDBItem
  editing: boolean
  editData: TMDBItem
  onLocalItemUpdate: (updatedItem: TMDBItem) => void
  onEditDataUpdate: (updatedData: TMDBItem) => void
  onShowFeedback: (message: string, duration?: number) => void
  onShowDeleteDialog: (seasonNumber: number) => void
}

export function useSeasonActions({
  localItem,
  editing,
  editData,
  onLocalItemUpdate,
  onEditDataUpdate,
  onShowFeedback,
  onShowDeleteDialog
}: UseSeasonActionsProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined)
  const [customSeasonNumber, setCustomSeasonNumber] = useState(1)

  // 获取当前季节数据
  const getCurrentSeason = useCallback(() => {
    if (!localItem.seasons || !selectedSeason) return null
    return localItem.seasons.find((s) => s.seasonNumber === selectedSeason) || null
  }, [localItem.seasons, selectedSeason])

  // 处理季数切换
  const handleSeasonClick = useCallback((seasonNumber: number) => {
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)
    onShowFeedback(`已切换到第${seasonNumber}季`, DELAY_1S)
  }, [onShowFeedback])

  // 处理季数调整
  const handleSeasonAdjust = useCallback((newSeason: number) => {
    const adjustedSeason = Math.max(1, Math.min(20, newSeason))
    setCustomSeasonNumber(adjustedSeason)
    onShowFeedback(`已切换到第 ${adjustedSeason} 季`)
  }, [onShowFeedback])

  // 添加新季
  const handleAddSeason = useCallback((seasonNumber: number, episodeCount: number) => {
    if (seasonNumber < 1 || episodeCount < 1) return

    // 检查季是否已存在
    const seasonExists = localItem.seasons?.some(season =>
      season.seasonNumber === seasonNumber
    )

    if (seasonExists) {
      onShowFeedback(`第${seasonNumber}季已存在`)
      return
    }

    // 创建新季数据
    const newSeason: Season = {
      seasonNumber,
      totalEpisodes: episodeCount,
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        number: i + 1,
        completed: false,
      })),
    }

    // 更新季数列表
    const updatedSeasons = [...(localItem.seasons || []), newSeason].sort((a, b) => a.seasonNumber - b.seasonNumber)

    // 更新扁平化的episodes数组
    const updatedEpisodes = [
      ...(localItem.episodes || []),
      ...newSeason.episodes.map((ep) => ({
        ...ep,
        seasonNumber: newSeason.seasonNumber,
      })),
    ]

    // 更新总集数
    const updatedTotalEpisodes = (localItem.totalEpisodes || 0) + episodeCount

    // 创建更新后的对象
    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: updatedTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    onLocalItemUpdate(updatedItem)

    // 如果在编辑模式，同时更新editData
    if (editing) {
      onEditDataUpdate({
        ...editData,
        seasons: updatedSeasons,
        episodes: updatedEpisodes,
        totalEpisodes: updatedTotalEpisodes
      })
    }

    // 选中新添加的季
    setSelectedSeason(seasonNumber)
    setCustomSeasonNumber(seasonNumber)

    onShowFeedback(`已添加第${seasonNumber}季，共${episodeCount}集`, DELAY_2S)
  }, [localItem, editing, editData, onLocalItemUpdate, onEditDataUpdate, onShowFeedback])

  // 删除季数
  const handleDeleteSeason = useCallback((seasonNumber: number) => {
    onShowDeleteDialog(seasonNumber)
  }, [onShowDeleteDialog])

  // 确认删除季数
  const confirmDeleteSeason = useCallback((seasonNumber: number) => {
    if (!localItem.seasons) return

    // 过滤掉要删除的季
    const updatedSeasons = localItem.seasons.filter(season => season.seasonNumber !== seasonNumber)

    // 更新扁平化的episodes数组，移除该季的所有集数
    const updatedEpisodes = localItem.episodes?.filter(
      episode => !episode.seasonNumber || episode.seasonNumber !== seasonNumber
    ) || []

    // 重新计算总集数
    const newTotalEpisodes = updatedEpisodes.length

    // 创建更新后的item对象
    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: newTotalEpisodes,
      updatedAt: new Date().toISOString()
    }

    onLocalItemUpdate(updatedItem)

    // 如果删除的是当前选中的季，取消选择
    if (selectedSeason === seasonNumber) {
      setSelectedSeason(undefined)
    }

    onShowFeedback(`已删除第${seasonNumber}季`, DELAY_2S)
  }, [localItem, selectedSeason, onLocalItemUpdate, onShowFeedback])

  // 重置季数
  const handleResetSeason = useCallback(() => {
    if (!selectedSeason || !localItem.seasons) return

    const updatedSeasons = localItem.seasons.map((season) => {
      if (season.seasonNumber === selectedSeason) {
        const resetEpisodes = season.episodes.map((ep) => ({ ...ep, completed: false }))
        return { ...season, episodes: resetEpisodes }
      }
      return season
    })

    const updatedEpisodes = updatedSeasons.flatMap((season) =>
      season.episodes.map((ep) => ({
        ...ep,
        seasonNumber: season.seasonNumber,
      }))
    )

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      updatedAt: new Date().toISOString(),
    }

    // 更新状态
    updatedItem.status = "ongoing"
    updatedItem.completed = false

    onLocalItemUpdate(updatedItem)
    onShowFeedback(`第${selectedSeason}季已重置`, DELAY_2S)
  }, [selectedSeason, localItem.seasons, localItem, onLocalItemUpdate, onShowFeedback])

  // 处理总集数变更
  const handleTotalEpisodesChange = useCallback((newCount: number) => {
    if (!selectedSeason || !localItem.seasons) return

    const currentSeason = localItem.seasons.find(s => s.seasonNumber === selectedSeason)
    if (!currentSeason) return

    const oldCount = currentSeason.totalEpisodes
    if (newCount === oldCount) return

    // 更新季的总集数
    const updatedSeasons = localItem.seasons.map((season) => {
      if (season.seasonNumber === selectedSeason) {
        let updatedEpisodes = [...season.episodes]

        if (newCount > oldCount) {
          // 增加集数
          const newEpisodes = Array.from({ length: newCount - oldCount }, (_, i) => ({
            number: oldCount + i + 1,
            completed: false,
          }))
          updatedEpisodes = [...season.episodes, ...newEpisodes]
        } else {
          // 减少集数
          updatedEpisodes = season.episodes.slice(0, newCount)
        }

        return {
          ...season,
          totalEpisodes: newCount,
          episodes: updatedEpisodes,
        }
      }
      return season
    })

    // 更新扁平化的episodes数组
    const updatedEpisodes = updatedSeasons.flatMap((season) =>
      season.episodes.map((ep) => ({
        ...ep,
        seasonNumber: season.seasonNumber,
      }))
    )

    // 更新总集数
    const newTotalEpisodes = updatedEpisodes.length

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: updatedEpisodes,
      totalEpisodes: newTotalEpisodes,
      updatedAt: new Date().toISOString(),
    }

    onLocalItemUpdate(updatedItem)
    onShowFeedback(`第${selectedSeason}季集数已更新为${newCount}集`, DELAY_2S)
  }, [selectedSeason, localItem.seasons, localItem, onLocalItemUpdate, onShowFeedback])

  return {
    // 状态
    selectedSeason,
    customSeasonNumber,
    currentSeason: getCurrentSeason(),

    // 操作方法
    handleSeasonClick,
    handleSeasonAdjust,
    handleAddSeason,
    handleDeleteSeason,
    confirmDeleteSeason,
    handleResetSeason,
    handleTotalEpisodesChange,

    // 设置方法
    setSelectedSeason,
    setCustomSeasonNumber,
  }
}
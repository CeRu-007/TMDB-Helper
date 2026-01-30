"use client"

import { useState, useCallback } from "react"
import type { TMDBItem, Episode } from "@/lib/data/storage"
import { DELAY_1S, DELAY_500MS } from "@/lib/constants/constants"

interface UseEpisodeActionsProps {
  localItem: TMDBItem
  selectedSeason: number | undefined
  onLocalItemUpdate: (updatedItem: TMDBItem) => void
  onShowFeedback: (message: string, duration?: number) => void
}

export function useEpisodeActions({
  localItem,
  selectedSeason,
  onLocalItemUpdate,
  onShowFeedback
}: UseEpisodeActionsProps) {
  const [lastClickedEpisode, setLastClickedEpisode] = useState<number | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [highlightedEpisode, setHighlightedEpisode] = useState<number | null>(null)

  // 处理剧集状态切换
  const handleEpisodeToggle = useCallback(async (episodeNumber: number, completed: boolean, seasonNumber: number) => {
    // 计算要操作的集数范围
    let episodeNumbers: number[] = []
    let rangeInfo = ''

    if (isShiftPressed) {
      if (lastClickedEpisode === null) {
        setLastClickedEpisode(episodeNumber)
        onShowFeedback(`已选择起点：第${episodeNumber集}`, DELAY_1S)
        return
      } else {
        const start = Math.min(lastClickedEpisode, episodeNumber)
        const end = Math.max(lastClickedEpisode, episodeNumber)
        episodeNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i)
        rangeInfo = `第${start}-${end}集`
        setLastClickedEpisode(null)
      }
    } else {
      episodeNumbers = [episodeNumber]
      rangeInfo = `第${episodeNumber}集`
    }

    const feedbackText = completed ? `${rangeInfo}已标记为完成` : `${rangeInfo}已标记为未完成`
    onShowFeedback(feedbackText)

    let updatedItem = { ...localItem }

    if (updatedItem.seasons && seasonNumber) {
      const updatedSeasons = updatedItem.seasons.map((season) => {
        if (season.seasonNumber === seasonNumber) {
          const updatedEpisodes = season.episodes.map((ep) =>
            episodeNumbers.includes(ep.number) ? { ...ep, completed } : ep
          )
          return { ...season, episodes: updatedEpisodes }
        }
        return season
      })

      const allEpisodes = updatedSeasons.flatMap((season) =>
        season.episodes.map((ep) => ({
          ...ep,
          seasonNumber: season.seasonNumber,
        }))
      )

      updatedItem = {
        ...updatedItem,
        seasons: updatedSeasons,
        episodes: allEpisodes,
        updatedAt: new Date().toISOString(),
      }
    } else {
      const updatedEpisodes = (updatedItem.episodes || []).map((ep) =>
        episodeNumbers.includes(ep.number) ? { ...ep, completed } : ep
      )

      updatedItem = {
        ...updatedItem,
        episodes: updatedEpisodes,
        updatedAt: new Date().toISOString(),
      }
    }

    // 更新状态
    const allCompleted = updatedItem.episodes?.every((ep) => ep.completed) && updatedItem.episodes.length > 0
    if (allCompleted && updatedItem.status === "ongoing") {
      updatedItem.status = "completed"
      updatedItem.completed = true
    } else if (!allCompleted && updatedItem.status === "completed") {
      updatedItem.status = "ongoing"
      updatedItem.completed = false
    }

    onLocalItemUpdate(updatedItem)

    if (!(isShiftPressed && lastClickedEpisode !== null && lastClickedEpisode !== episodeNumber)) {
      setLastClickedEpisode(episodeNumber)
    }
  }, [localItem, isShiftPressed, lastClickedEpisode, onLocalItemUpdate, onShowFeedback])

  // 处理剧集点击
  const handleEpisodeClick = useCallback((episodeNumber: number) => {
    setLastClickedEpisode(episodeNumber)
    setHighlightedEpisode(episodeNumber)

    // 清除高亮效果
    setTimeout(() => setHighlightedEpisode(null), DELAY_500MS)
  }, [])

  // 批量切换剧集状态
  const handleBatchToggle = useCallback((seasonNumber: number, completed: boolean) => {
    if (!localItem.seasons) return

    const updatedSeasons = localItem.seasons.map((season) => {
      if (season.seasonNumber === seasonNumber) {
        const updatedEpisodes = season.episodes.map((ep) => ({ ...ep, completed }))
        return { ...season, episodes: updatedEpisodes }
      }
      return season
    })

    const allEpisodes = updatedSeasons.flatMap((season) =>
      season.episodes.map((ep) => ({
        ...ep,
        seasonNumber: season.seasonNumber,
      }))
    )

    const updatedItem = {
      ...localItem,
      seasons: updatedSeasons,
      episodes: allEpisodes,
      updatedAt: new Date().toISOString(),
    }

    // 更新状态
    const allCompleted = completed && allEpisodes.length > 0
    if (allCompleted && localItem.status === "ongoing") {
      updatedItem.status = "completed"
      updatedItem.completed = true
    } else if (!allCompleted && localItem.status === "completed") {
      updatedItem.status = "ongoing"
      updatedItem.completed = false
    }

    onLocalItemUpdate(updatedItem)
    onShowFeedback(completed ? "全季已标记为完成" : "全季已标记为未完成")
  }, [localItem, onLocalItemUpdate, onShowFeedback])

  // 标记下一集为已完成
  const handleMarkNextEpisode = useCallback(() => {
    if (!selectedSeason || !localItem.seasons) {
      onShowFeedback('当前季没有集数')
      return
    }

    const currentSeason = localItem.seasons.find(s => s.seasonNumber === selectedSeason)
    if (!currentSeason || !currentSeason.episodes) {
      onShowFeedback('当前季没有集数')
      return
    }

    // 找到第一个未完成的集数
    const nextEpisode = currentSeason.episodes.find(ep => !ep.completed)
    if (!nextEpisode) {
      onShowFeedback('当前季所有集数已完成')
      return
    }

    // 标记该集数为已完成
    handleEpisodeToggle(nextEpisode.number, true, selectedSeason)
  }, [selectedSeason, localItem.seasons, handleEpisodeToggle, onShowFeedback])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
      document.body.classList.add('shift-select-mode')
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
      document.body.classList.remove('shift-select-mode')
    }
  }, [])

  return {
    // 状态
    lastClickedEpisode,
    highlightedEpisode,
    isShiftPressed,

    // 操作方法
    handleEpisodeToggle,
    handleEpisodeClick,
    handleBatchToggle,
    handleMarkNextEpisode,

    // 键盘事件
    handleKeyDown,
    handleKeyUp,

    // 设置方法
    setHighlightedEpisode,
  }
}
import { useState, useCallback } from "react"
import type { CSVData, UseTMDBTableHistoryReturn } from "../types"

const MAX_HISTORY_SIZE = 50

export function useTMDBTableHistory(
  initialData: CSVData
): UseTMDBTableHistoryReturn {
  const [history, setHistory] = useState<CSVData[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // 保存到历史记录
  const saveToHistory = useCallback(
    (data: CSVData) => {
      setHistory((prev) => {
        // 如果当前不在历史记录末尾，删除当前位置之后的所有记录
        const newHistory =
          currentIndex >= 0 ? prev.slice(0, currentIndex + 1) : [...prev]

        // 添加新记录
        newHistory.push(data)

        // 限制历史记录数量
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift()
          setCurrentIndex(MAX_HISTORY_SIZE - 1)
        } else {
          setCurrentIndex(newHistory.length - 1)
        }

        return newHistory
      })
    },
    [currentIndex]
  )

  // 撤销
  const undo = useCallback((): CSVData | null => {
    if (currentIndex <= 0) return null

    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex] || null
  }, [currentIndex, history])

  // 重做
  const redo = useCallback((): CSVData | null => {
    if (currentIndex >= history.length - 1) return null

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex] || null
  }, [currentIndex, history])

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  return {
    // 状态
    history,
    currentIndex,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,

    // 操作方法
    saveToHistory,
    undo,
    redo,
    clearHistory,
  }
}

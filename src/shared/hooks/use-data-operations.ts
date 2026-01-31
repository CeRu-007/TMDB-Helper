"use client"

import { useState } from "react"
import { useIsClient } from "@/lib/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/data/storage"
import { realtimeSyncManager } from "@/lib/data/realtime-sync-manager"

export function useDataOperations(
  items: TMDBItem[],
  setItems: React.Dispatch<React.SetStateAction<TMDBItem[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [loading, setLoading] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const isClient = useIsClient()

  const addItem = async (item: TMDBItem) => {
    if (!isClient) return

    try {
      const success = await StorageManager.addItem(item)
      if (!success) {
        throw new Error("添加项目失败")
      }

      setItems(prevItems => [...prevItems, item])

      await realtimeSyncManager.notifyDataChange({
        type: 'item_added',
        data: item
      })
    } catch (err) {
      setError("添加项目失败")
      throw err
    }
  }

  const updateItem = async (item: TMDBItem) => {
    if (!isClient) return

    const originalItem = items.find(i => i.id === item.id)
    if (!originalItem) {
      setError("要更新的项目不存在")
      return
    }

    try {
      setItems(prevItems =>
        prevItems.map(prevItem =>
          prevItem.id === item.id ? item : prevItem
        )
      )

      const success = await StorageManager.updateItem(item)
      if (!success) {
        throw new Error("更新项目失败")
      }

      await realtimeSyncManager.notifyDataChange({
        type: 'item_updated',
        data: item
      })
    } catch (err) {
      setError("更新项目失败")
      setItems(items) // Revert on error
    }
  }

  const deleteItem = async (id: string) => {
    if (!isClient) return

    const originalItem = items.find(i => i.id === id)
    if (!originalItem) {
      setError("要删除的项目不存在")
      return
    }

    try {
      setItems(prevItems => prevItems.filter(item => item.id !== id))

      const success = await StorageManager.deleteItem(id)
      if (!success) {
        throw new Error("删除项目失败")
      }

      await realtimeSyncManager.notifyDataChange({
        type: 'item_deleted',
        data: { id, item: originalItem }
      })
    } catch (err) {
      setError("删除项目失败")
      setItems(items) // Revert on error
    }
  }

  const exportData = async () => {
    if (!isClient) return

    try {
      setLoading(true)
      const data = await StorageManager.exportData()
      const blob = new Blob([data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tmdb-helper-backup-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError("导出数据失败")
    } finally {
      setLoading(false)
    }
  }

  const importData = async (jsonData: string) => {
    if (!isClient) return

    try {
      setLoading(true)
      setError(null)

      const result = await StorageManager.importData(jsonData)

      if (!result.success) {
        throw new Error(result.error || "导入数据失败")
      }

      return result.stats
    } catch (err) {
      setError(`导入数据失败：${err instanceof Error ? err.message : '请检查文件格式'}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  const getOptimisticStats = () => {
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      failed: 0,
      retrying: 0,
      avgRetryCount: 0
    }
  }

  return {
    loading,
    pendingOperations,
    addItem,
    updateItem,
    deleteItem,
    exportData,
    importData,
    clearError,
    getOptimisticStats
  }
}
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useIsClient } from "@/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/storage"

// 创建上下文
interface DataContextType {
  items: TMDBItem[]
  loading: boolean
  error: string | null
  initialized: boolean
  refreshData: () => Promise<void>
  addItem: (item: TMDBItem) => Promise<void>
  updateItem: (item: TMDBItem) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  exportData: () => Promise<void>
  importData: (jsonData: string) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const isClient = useIsClient()

  // 加载数据
  const loadData = async () => {
    if (!isClient) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await StorageManager.getItemsWithRetry()
      setItems(data)
      setInitialized(true)
    } catch (err) {
      console.error("Failed to load data:", err)
      setError("加载数据失败，请刷新页面重试")
    } finally {
      setLoading(false)
    }
  }

  // 当客户端渲染完成后加载数据
  useEffect(() => {
    if (isClient) {
      loadData()
    }
  }, [isClient])

  // 添加项目
  const addItem = async (item: TMDBItem) => {
    if (!isClient) return
    
    try {
      setLoading(true)
      const success = await StorageManager.addItem(item)
      if (!success) {
        throw new Error("添加项目失败")
      }
      await loadData()
    } catch (err) {
      console.error("Failed to add item:", err)
      setError("添加项目失败")
    } finally {
      setLoading(false)
    }
  }

  // 更新项目
  const updateItem = async (item: TMDBItem) => {
    if (!isClient) return
    
    try {
      setLoading(true)
      const success = await StorageManager.updateItem(item)
      if (!success) {
        throw new Error("更新项目失败")
      }
      await loadData()
    } catch (err) {
      console.error("Failed to update item:", err)
      setError("更新项目失败")
    } finally {
      setLoading(false)
    }
  }

  // 删除项目
  const deleteItem = async (id: string) => {
    if (!isClient) return
    
    try {
      setLoading(true)
      const success = await StorageManager.deleteItem(id)
      if (!success) {
        throw new Error("删除项目失败")
      }
      await loadData()
    } catch (err) {
      console.error("Failed to delete item:", err)
      setError("删除项目失败")
    } finally {
      setLoading(false)
    }
  }

  // 导出数据
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
      console.error("Failed to export data:", err)
      setError("导出数据失败")
    } finally {
      setLoading(false)
    }
  }

  // 导入数据
  const importData = async (jsonData: string) => {
    console.log("DataProvider.importData called");
    if (!isClient) {
      console.log("Not in client environment, skipping import");
      return;
    }

    try {
      setLoading(true)
      setError(null)
      console.log("Calling StorageManager.importData...");
      const success = await StorageManager.importData(jsonData)
      console.log("StorageManager.importData result:", success);

      if (!success) {
        throw new Error("导入数据失败")
      }

      console.log("Reloading data after import...");
      await loadData()
      console.log("Data reload completed");
    } catch (err) {
      console.error("Failed to import data:", err)
      setError(`导入数据失败：${err instanceof Error ? err.message : '请检查文件格式'}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value = {
    items,
    loading,
    error,
    initialized,
    refreshData: loadData,
    addItem,
    updateItem,
    deleteItem,
    exportData,
    importData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
} 
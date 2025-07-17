"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useIsClient } from "@/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/storage"
import { realtimeSyncManager } from "@/lib/realtime-sync-manager"
import { optimisticUpdateManager } from "@/lib/optimistic-update-manager"

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
  const [baseItems, setBaseItems] = useState<TMDBItem[]>([]) // 基础数据
  const [items, setItems] = useState<TMDBItem[]>([]) // 应用乐观更新后的数据
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
      setBaseItems(data)
      setInitialized(true)
      console.log('[DataProvider] 加载数据成功:', data.length, '个项目')
    } catch (err) {
      console.error("Failed to load data:", err)
      setError("加载数据失败，请刷新页面重试")
    } finally {
      setLoading(false)
    }
  }

  // 应用乐观更新到数据
  const applyOptimisticUpdates = () => {
    const updatedItems = optimisticUpdateManager.applyOptimisticUpdates(baseItems, 'item')
    setItems(updatedItems)
  }

  // 初始化实时同步和乐观更新
  useEffect(() => {
    if (!isClient) return

    console.log('[DataProvider] 初始化实时同步和乐观更新')

    // 初始化实时同步管理器
    realtimeSyncManager.initialize()

    // 监听数据变更事件
    const handleDataChange = (event: any) => {
      console.log('[DataProvider] 收到实时数据变更:', event)
      
      switch (event.type) {
        case 'item_added':
        case 'item_updated':
        case 'item_deleted':
        case 'task_completed':
          // 重新加载数据以确保一致性
          loadData()
          break
      }
    }

    // 监听乐观更新变化
    const handleOptimisticUpdate = () => {
      applyOptimisticUpdates()
    }

    realtimeSyncManager.addEventListener('*', handleDataChange)
    optimisticUpdateManager.addListener(handleOptimisticUpdate)

    // 清理函数
    return () => {
      realtimeSyncManager.removeEventListener('*', handleDataChange)
      optimisticUpdateManager.removeListener(handleOptimisticUpdate)
    }
  }, [isClient])

  // 当基础数据变化时，重新应用乐观更新
  useEffect(() => {
    applyOptimisticUpdates()
  }, [baseItems])

  // 当客户端渲染完成后加载数据
  useEffect(() => {
    if (isClient) {
      loadData()
    }
  }, [isClient])

  // 添加项目
  const addItem = async (item: TMDBItem) => {
    if (!isClient) return
    
    // 乐观更新：立即添加到UI
    const operationId = optimisticUpdateManager.addOperation({
      type: 'add',
      entity: 'item',
      data: item
    })

    try {
      console.log('[DataProvider] 乐观添加项目:', item.title)
      
      // 发送到服务器
      const success = await StorageManager.addItem(item)
      if (!success) {
        throw new Error("添加项目失败")
      }

      // 确认操作成功
      optimisticUpdateManager.confirmOperation(operationId, item)
      
      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_added',
        data: item
      })

      console.log('[DataProvider] 项目添加成功:', item.title)
    } catch (err) {
      console.error("Failed to add item:", err)
      setError("添加项目失败")
      
      // 标记操作失败
      optimisticUpdateManager.failOperation(operationId, err instanceof Error ? err.message : '添加项目失败')
    }
  }

  // 更新项目
  const updateItem = async (item: TMDBItem) => {
    if (!isClient) return
    
    // 保存原始数据用于回滚
    const originalItem = baseItems.find(i => i.id === item.id)
    
    // 乐观更新：立即更新UI
    const operationId = optimisticUpdateManager.addOperation({
      type: 'update',
      entity: 'item',
      data: item,
      originalData: originalItem
    })

    try {
      console.log('[DataProvider] 乐观更新项目:', item.title)
      
      // 发送到服务器
      const success = await StorageManager.updateItem(item)
      if (!success) {
        throw new Error("更新项目失败")
      }

      // 确认操作成功
      optimisticUpdateManager.confirmOperation(operationId, item)
      
      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_updated',
        data: item
      })

      console.log('[DataProvider] 项目更新成功:', item.title)
    } catch (err) {
      console.error("Failed to update item:", err)
      setError("更新项目失败")
      
      // 标记操作失败
      optimisticUpdateManager.failOperation(operationId, err instanceof Error ? err.message : '更新项目失败')
    }
  }

  // 删除项目
  const deleteItem = async (id: string) => {
    if (!isClient) return
    
    // 保存原始数据用于回滚
    const originalItem = baseItems.find(i => i.id === id)
    if (!originalItem) {
      setError("要删除的项目不存在")
      return
    }
    
    // 乐观更新：立即从UI移除
    const operationId = optimisticUpdateManager.addOperation({
      type: 'delete',
      entity: 'item',
      data: { id },
      originalData: originalItem
    })

    try {
      console.log('[DataProvider] 乐观删除项目:', originalItem.title)
      
      // 发送到服务器
      const success = await StorageManager.deleteItem(id)
      if (!success) {
        throw new Error("删除项目失败")
      }

      // 确认操作成功
      optimisticUpdateManager.confirmOperation(operationId)
      
      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_deleted',
        data: { id, item: originalItem }
      })

      console.log('[DataProvider] 项目删除成功:', originalItem.title)
    } catch (err) {
      console.error("Failed to delete item:", err)
      setError("删除项目失败")
      
      // 标记操作失败
      optimisticUpdateManager.failOperation(operationId, err instanceof Error ? err.message : '删除项目失败')
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
      const result = await StorageManager.importData(jsonData)
      console.log("StorageManager.importData result:", result);

      if (!result.success) {
        throw new Error(result.error || "导入数据失败")
      }

      console.log("Reloading data after import...");
      await loadData()
      console.log("Data reload completed");

      // 返回导入统计信息
      return result.stats;
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
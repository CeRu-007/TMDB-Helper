"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useIsClient } from "@/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/storage"
import { realtimeSyncManager } from "@/lib/realtime-sync-manager"

// 创建上下文
interface DataContextType {
  items: TMDBItem[]
  baseItems: TMDBItem[]
  loading: boolean
  error: string | null
  initialized: boolean
  isConnected: boolean
  pendingOperations: number
  refreshData: () => Promise<void>
  addItem: (item: TMDBItem) => Promise<void>
  updateItem: (item: TMDBItem) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  exportData: () => Promise<void>
  importData: (jsonData: string) => Promise<void>
  clearError: () => void
  getOptimisticStats: () => any
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
  const [items, setItems] = useState<TMDBItem[]>([]) // 项目数据
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
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
      
      setError("加载数据失败，请刷新页面重试")
    } finally {
      setLoading(false)
    }
  }

  // 初始化实时同步
  useEffect(() => {
    if (!isClient) return

    // 初始化实时同步管理器
    const initializeSync = async () => {
      try {
        await realtimeSyncManager.initialize()
        setIsConnected(realtimeSyncManager.isConnectionActive())

        // 监听连接状态变化
        const checkConnection = setInterval(() => {
          setIsConnected(realtimeSyncManager.isConnectionActive())
        }, 5000)

        return () => clearInterval(checkConnection)
      } catch (error) {
        
        setIsConnected(false)
      }
    }

    initializeSync()

    // 监听数据变更事件
    const handleDataChange = (event: any) => {
      
      switch (event.type) {
        case 'item_added':
          // 添加新项目时，直接更新状态
          
          setItems(prevItems => [...prevItems, event.data])
          break
        case 'item_updated':
        case 'episode_updated':  // 添加对集数更新事件的处理
          // 更新项目时，直接更新状态而不是重新加载全部数据
          
          if (event.data && event.data.id) {
            setItems(prevItems => 
              prevItems.map(item => 
                item.id === event.data.id ? event.data : item
              )
            )
          } else {
            // 如果没有有效数据，则重新加载
            loadData()
          }
          break
        case 'item_deleted':
          // 删除项目时，直接更新状态
          
          if (event.data && event.data.id) {
            setItems(prevItems => prevItems.filter(item => item.id !== event.data.id))
          } else {
            loadData()
          }
          break
        case 'task_completed':
          // 任务完成时，可能需要重新加载数据
          
          loadData()
          break
      }
    }

    realtimeSyncManager.addEventListener('*', handleDataChange)

    // 清理函数
    return () => {
      realtimeSyncManager.removeEventListener('*', handleDataChange)
    }
  }, [isClient])

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
      
      // 发送到服务器
      const success = await StorageManager.addItem(item)
      if (!success) {
        throw new Error("添加项目失败")
      }

      // 立即更新本地状态
      setItems(prevItems => [...prevItems, item])

      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_added',
        data: item
      })

    } catch (err) {
      
      setError("添加项目失败")
    }
  }

  // 更新项目
  const updateItem = async (item: TMDBItem) => {
    if (!isClient) return

    try {
      
      // 立即更新本地状态
      setItems(prevItems =>
        prevItems.map(prevItem =>
          prevItem.id === item.id ? item : prevItem
        )
      )

      // 发送到服务器
      const success = await StorageManager.updateItem(item)
      if (!success) {
        throw new Error("更新项目失败")
      }

      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_updated',
        data: item
      })

    } catch (err) {
      
      setError("更新项目失败")
      // 如果更新失败，重新加载数据以确保一致性
      loadData()
    }
  }

  // 删除项目
  const deleteItem = async (id: string) => {
    if (!isClient) return

    // 查找要删除的项目
    const originalItem = items.find(i => i.id === id)
    if (!originalItem) {
      setError("要删除的项目不存在")
      return
    }

    try {
      
      // 立即从本地状态移除
      setItems(prevItems => prevItems.filter(item => item.id !== id))

      // 发送到服务器
      const success = await StorageManager.deleteItem(id)
      if (!success) {
        throw new Error("删除项目失败")
      }

      // 通知其他客户端
      await realtimeSyncManager.notifyDataChange({
        type: 'item_deleted',
        data: { id, item: originalItem }
      })

    } catch (err) {
      
      setError("删除项目失败")
      // 如果删除失败，重新加载数据以确保一致性
      loadData()
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
      
      setError("导出数据失败")
    } finally {
      setLoading(false)
    }
  }

  // 导入数据
  const importData = async (jsonData: string) => {
    
    if (!isClient) {
      
      return;
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await StorageManager.importData(jsonData)
      
      if (!result.success) {
        throw new Error(result.error || "导入数据失败")
      }

      await loadData()
      
      // 返回导入统计信息
      return result.stats;
    } catch (err) {
      
      setError(`导入数据失败：${err instanceof Error ? err.message : '请检查文件格式'}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // 清除错误
  const clearError = () => {
    setError(null)
  }

  // 获取乐观更新统计（兼容性函数，返回空数据）
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

  const value = {
    items,
    baseItems: items, // 简化版本中baseItems和items相同
    loading,
    error,
    initialized,
    isConnected,
    pendingOperations,
    refreshData: loadData,
    addItem,
    updateItem,
    deleteItem,
    exportData,
    importData,
    clearError,
    getOptimisticStats
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
} 
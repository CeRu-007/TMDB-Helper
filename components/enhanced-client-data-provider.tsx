"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { useIsClient } from "@/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/storage"
import { realtimeSyncManager } from "@/lib/realtime-sync-manager"
import { optimisticUpdateManager } from "@/lib/optimistic-update-manager"
import { performanceMonitor } from "@/lib/performance-monitor"
import { errorRecoveryManager } from "@/lib/error-recovery-manager"
import { operationQueueManager } from "@/lib/operation-queue-manager"
import { dataConsistencyValidator } from "@/lib/data-consistency-validator"
import { toast } from "@/components/ui/use-toast"

// 创建上下文
interface EnhancedDataContextType {
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

const EnhancedDataContext = createContext<EnhancedDataContextType | undefined>(undefined)

export function useEnhancedData() {
  const context = useContext(EnhancedDataContext)
  if (context === undefined) {
    throw new Error("useEnhancedData must be used within an EnhancedDataProvider")
  }
  return context
}

export function EnhancedDataProvider({ children }: { children: ReactNode }) {
  const [baseItems, setBaseItems] = useState<TMDBItem[]>([]) // 基础数据
  const [items, setItems] = useState<TMDBItem[]>([]) // 应用乐观更新后的数据
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const isClient = useIsClient()

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isClient) return
    
    const loadEventId = performanceMonitor.startEvent('data_load')
    setLoading(true)
    setError(null)
    
    try {
      const data = await StorageManager.getItemsWithRetry()
      setBaseItems(data)
      setInitialized(true)
      console.log('[EnhancedDataProvider] 加载数据成功:', data.length, '个项目')
      
      performanceMonitor.endEvent(loadEventId, true)
    } catch (err) {
      console.error("Failed to load data:", err)
      setError("加载数据失败，请刷新页面重试")
      
      performanceMonitor.endEvent(loadEventId, false, err instanceof Error ? err.message : '加载失败')
      
      // 使用错误恢复管理器处理数据加载错误
      errorRecoveryManager.handleError(
        err instanceof Error ? err : new Error('加载数据失败'),
        'data',
        { loadDataFunction: loadData }
      )
      
      // 显示错误提示
      toast({
        title: "数据加载失败",
        description: "无法加载项目数据，请检查网络连接后重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [isClient])

  // 应用乐观更新到数据
  const applyOptimisticUpdates = useCallback(() => {
    const updatedItems = optimisticUpdateManager.applyOptimisticUpdates(baseItems, 'item')
    setItems(updatedItems)
  }, [baseItems])

  // 处理实时数据变更
  const handleRealtimeDataChange = useCallback((event: any) => {
    console.log('[EnhancedDataProvider] 收到实时数据变更:', event)
    
    switch (event.type) {
      case 'item_added':
      case 'item_updated':
      case 'item_deleted':
        // 重新加载数据以确保一致性
        loadData()
        
        // 显示通知
        toast({
          title: "数据已更新",
          description: `项目数据已在其他设备上更新`,
          duration: 3000
        })
        break
        
      case 'episode_updated':
        // 集数更新时重新加载数据
        loadData()
        
        toast({
          title: "集数进度已更新",
          description: `项目 "${event.data.itemTitle}" 的观看进度已更新`,
          duration: 3000
        })
        break
        
      case 'season_added':
      case 'season_deleted':
        // 季数变更时重新加载数据
        loadData()
        
        toast({
          title: "季数信息已更新",
          description: `项目 "${event.data.itemTitle}" 的季数信息已更新`,
          duration: 3000
        })
        break
        
      case 'progress_updated':
        // 进度更新时重新加载数据
        loadData()
        
        toast({
          title: "观看进度已更新",
          description: `项目进度已实时同步`,
          duration: 2000
        })
        break
        
      case 'task_completed':
        // 任务完成时重新加载数据
        loadData()
        
        // 显示任务完成通知
        toast({
          title: "任务执行完成",
          description: `定时任务 "${event.data.taskName}" 执行完成`,
          duration: 5000
        })
        break
        
      case 'task_status_changed':
        if (event.data.status === 'failed') {
          toast({
            title: "任务执行失败",
            description: `定时任务 "${event.data.taskName}" 执行失败: ${event.data.error}`,
            variant: "destructive",
            duration: 8000
          })
        }
        break
        
      case 'batch_operation':
        // 批量操作完成时重新加载数据
        loadData()
        
        toast({
          title: "批量操作完成",
          description: `已完成 ${event.data.operationCount} 个操作`,
          duration: 4000
        })
        break
        
      case 'data_imported':
        // 数据导入完成时重新加载数据
        loadData()
        
        toast({
          title: "数据导入完成",
          description: `已导入 ${event.data.itemCount || 0} 个项目`,
          duration: 5000
        })
        break
        
      case 'data_exported':
        toast({
          title: "数据导出完成",
          description: "数据已成功导出",
          duration: 3000
        })
        break
        
      case 'connection_status':
        if (event.data.connected) {
          toast({
            title: "连接已恢复",
            description: "实时同步连接已重新建立",
            duration: 3000
          })
        } else {
          toast({
            title: "连接已断开",
            description: "实时同步连接已断开，正在尝试重连",
            variant: "destructive",
            duration: 5000
          })
        }
        break
    }
  }, [loadData])

  // 处理乐观更新变化
  const handleOptimisticUpdate = useCallback((operations: any[]) => {
    setPendingOperations(operations.filter(op => op.status === 'pending').length)
    applyOptimisticUpdates()
  }, [applyOptimisticUpdates])

  // 初始化实时同步和乐观更新
  useEffect(() => {
    if (!isClient) return

    console.log('[EnhancedDataProvider] 初始化实时同步和乐观更新')

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
        console.error('[EnhancedDataProvider] 实时同步初始化失败:', error)
        setIsConnected(false)
      }
    }

    initializeSync()

    // 监听数据变更事件
    realtimeSyncManager.addEventListener('*', handleRealtimeDataChange)

    // 监听乐观更新变化
    optimisticUpdateManager.addListener(handleOptimisticUpdate)

    // 设置操作队列的执行器
    operationQueueManager.setOperationExecutor(async (operation) => {
      try {
        console.log(`[EnhancedDataProvider] 执行队列操作: ${operation.type} ${operation.itemId}`);

        let success = false;
        switch (operation.type) {
          case 'update':
            success = await StorageManager.updateItem(operation.data);
            break;
          case 'add':
            success = await StorageManager.addItem(operation.data);
            break;
          case 'delete':
            success = await StorageManager.deleteItem(operation.itemId);
            break;
        }

        if (success) {
          // 通知其他客户端
          await realtimeSyncManager.notifyDataChange({
            type: `item_${operation.type}d` as any,
            data: operation.data
          });

          // 显示成功提示
          toast({
            title: "操作成功",
            description: `项目 "${operation.data.title}" ${operation.type === 'update' ? '更新' : operation.type === 'add' ? '添加' : '删除'}成功`,
            duration: 3000
          });
        }

        return success;
      } catch (error) {
        console.error(`[EnhancedDataProvider] 队列操作失败:`, error);

        // 显示错误提示
        toast({
          title: "操作失败",
          description: `项目操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
          duration: 5000
        });

        return false;
      }
    });

    // 启动数据一致性验证
    dataConsistencyValidator.startPeriodicValidation();

    // 清理函数
    return () => {
      realtimeSyncManager.removeEventListener('*', handleRealtimeDataChange)
      optimisticUpdateManager.removeListener(handleOptimisticUpdate)
      dataConsistencyValidator.stopPeriodicValidation()
    }
  }, [isClient, handleRealtimeDataChange, handleOptimisticUpdate])

  // 当基础数据变化时，重新应用乐观更新
  useEffect(() => {
    applyOptimisticUpdates()
  }, [baseItems, applyOptimisticUpdates])

  // 当客户端渲染完成后加载数据
  useEffect(() => {
    if (isClient) {
      loadData()
    }
  }, [isClient, loadData])

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
      console.log('[EnhancedDataProvider] 乐观添加项目:', item.title)
      
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

      console.log('[EnhancedDataProvider] 项目添加成功:', item.title)
      
      // 显示成功提示
      toast({
        title: "项目添加成功",
        description: `已成功添加项目 "${item.title}"`,
        duration: 3000
      })
      
    } catch (err) {
      console.error("Failed to add item:", err)
      const errorMessage = err instanceof Error ? err.message : '添加项目失败'
      setError(errorMessage)

      // 标记操作失败（不立即显示toast，让用户通过状态组件处理）
      optimisticUpdateManager.failOperation(operationId, errorMessage)

      // 只在网络错误或超时时显示toast，其他错误通过状态组件处理
      if (errorMessage.includes('网络') || errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        toast({
          title: "网络错误",
          description: "请检查网络连接后重试",
          variant: "destructive",
          duration: 5000
        })
      }
    }
  }

  // 更新项目（增强版，支持并发控制和防抖）
  const updateItem = async (item: TMDBItem) => {
    if (!isClient) return

    // 性能监控开始
    const performanceId = `update_item_${item.id}_${Date.now()}`;
    performanceMonitor.startEvent(performanceId);

    try {
      // 保存原始数据用于回滚
      const originalItem = baseItems.find(i => i.id === item.id)

      // 检查是否有相同项目的操作正在进行
      const queueStatus = operationQueueManager.getQueueStatus();
      const hasQueuedOperation = queueStatus.queuesByItem[item.id] > 0;

      if (hasQueuedOperation) {
        console.log(`[EnhancedDataProvider] 项目 ${item.id} 有操作在队列中，将合并操作`);
      }

      // 乐观更新：立即更新UI（增强版会自动处理合并）
      const operationId = optimisticUpdateManager.addOperation({
        type: 'update',
        entity: 'item',
        data: item,
        originalData: originalItem
      })

      console.log('[EnhancedDataProvider] 乐观更新项目:', item.title, `操作ID: ${operationId}`)

      // 注意：实际的服务器更新现在由OptimisticUpdateManager通过队列处理
      // 这里不再直接调用StorageManager.updateItem，避免并发冲突

      // 显示操作状态提示
      toast({
        title: "正在更新项目",
        description: `正在更新项目 "${item.title}"...`,
        duration: 2000
      })

      // 性能监控结束
      performanceMonitor.endEvent(performanceId, true);

    } catch (err) {
      console.error("Failed to update item:", err)
      const errorMessage = err instanceof Error ? err.message : '更新项目失败'
      setError(errorMessage)

      // 性能监控结束（失败）
      performanceMonitor.endEvent(performanceId, false, errorMessage);

      // 标记操作失败（不立即显示toast，让用户通过状态组件处理）
      optimisticUpdateManager.failOperation(operationId, errorMessage)

      // 只在网络错误或超时时显示toast，其他错误通过状态组件处理
      if (errorMessage.includes('网络') || errorMessage.includes('超时') || errorMessage.includes('timeout')) {
        toast({
          title: "网络错误",
          description: "请检查网络连接后重试",
          variant: "destructive",
          duration: 5000
        })
      }
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
      console.log('[EnhancedDataProvider] 乐观删除项目:', originalItem.title)
      
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

      console.log('[EnhancedDataProvider] 项目删除成功:', originalItem.title)
      
      // 显示成功提示
      toast({
        title: "项目删除成功",
        description: `已成功删除项目 "${originalItem.title}"`,
        duration: 3000
      })
      
    } catch (err) {
      console.error("Failed to delete item:", err)
      const errorMessage = err instanceof Error ? err.message : '删除项目失败'
      setError(errorMessage)
      
      // 标记操作失败
      optimisticUpdateManager.failOperation(operationId, errorMessage)
      
      // 显示错误提示
      toast({
        title: "删除项目失败",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
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
      
      toast({
        title: "数据导出成功",
        description: "数据已成功导出到文件",
        duration: 3000
      })
    } catch (err) {
      console.error("Failed to export data:", err)
      const errorMessage = err instanceof Error ? err.message : '导出数据失败'
      setError(errorMessage)
      
      toast({
        title: "数据导出失败",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  // 导入数据
  const importData = async (jsonData: string) => {
    console.log("EnhancedDataProvider.importData called");
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

      // 通知其他客户端数据已更新
      await realtimeSyncManager.notifyDataChange({
        type: 'item_added', // 使用通用的数据变更类型
        data: { importStats: result.stats }
      })

      toast({
        title: "数据导入成功",
        description: `成功导入 ${result.stats?.itemCount || 0} 个项目`,
        duration: 5000
      })

      // 返回导入统计信息
      return result.stats;
    } catch (err) {
      console.error("Failed to import data:", err)
      const errorMessage = err instanceof Error ? err.message : '导入数据失败'
      setError(`导入数据失败：${errorMessage}`)
      
      toast({
        title: "数据导入失败",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  // 清除错误
  const clearError = () => {
    setError(null)
  }

  // 获取乐观更新统计
  const getOptimisticStats = () => {
    return optimisticUpdateManager.getStats()
  }

  const value: EnhancedDataContextType = {
    items,
    baseItems,
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

  return (
    <EnhancedDataContext.Provider value={value}>
      {children}
    </EnhancedDataContext.Provider>
  )
}
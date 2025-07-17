/**
 * 乐观更新管理器
 * 负责处理乐观更新逻辑，提供即时的UI反馈
 */

import { TMDBItem, ScheduledTask } from './storage'

export type OptimisticOperation = {
  id: string
  type: 'add' | 'update' | 'delete'
  entity: 'item' | 'task'
  data: any
  originalData?: any
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
}

export type OptimisticUpdateListener = (operations: OptimisticOperation[]) => void

class OptimisticUpdateManager {
  private static instance: OptimisticUpdateManager
  private pendingOperations: Map<string, OptimisticOperation> = new Map()
  private listeners: Set<OptimisticUpdateListener> = new Set()
  private operationTimeout = 10000 // 10秒超时

  private constructor() {}

  public static getInstance(): OptimisticUpdateManager {
    if (!OptimisticUpdateManager.instance) {
      OptimisticUpdateManager.instance = new OptimisticUpdateManager()
    }
    return OptimisticUpdateManager.instance
  }

  /**
   * 添加乐观更新操作
   */
  public addOperation(operation: Omit<OptimisticOperation, 'id' | 'timestamp' | 'status'>): string {
    const operationId = `${operation.type}_${operation.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullOperation: OptimisticOperation = {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      status: 'pending'
    }

    this.pendingOperations.set(operationId, fullOperation)
    console.log(`[OptimisticUpdate] 添加乐观更新操作: ${operationId}`, fullOperation)

    // 设置超时处理
    setTimeout(() => {
      if (this.pendingOperations.has(operationId)) {
        console.warn(`[OptimisticUpdate] 操作超时: ${operationId}`)
        this.failOperation(operationId, '操作超时')
      }
    }, this.operationTimeout)

    this.notifyListeners()
    return operationId
  }

  /**
   * 确认操作成功
   */
  public confirmOperation(operationId: string, actualData?: any): void {
    const operation = this.pendingOperations.get(operationId)
    if (operation) {
      operation.status = 'confirmed'
      if (actualData) {
        operation.data = actualData
      }
      console.log(`[OptimisticUpdate] 确认操作成功: ${operationId}`)
      
      // 延迟移除已确认的操作，给UI一些时间来处理
      setTimeout(() => {
        this.pendingOperations.delete(operationId)
        this.notifyListeners()
      }, 100)
    }
  }

  /**
   * 标记操作失败
   */
  public failOperation(operationId: string, error: string): void {
    const operation = this.pendingOperations.get(operationId)
    if (operation) {
      operation.status = 'failed'
      console.error(`[OptimisticUpdate] 操作失败: ${operationId}, 错误: ${error}`)
      
      // 失败的操作保留更长时间，以便UI显示错误状态
      setTimeout(() => {
        this.pendingOperations.delete(operationId)
        this.notifyListeners()
      }, 3000)
      
      this.notifyListeners()
    }
  }

  /**
   * 获取所有待处理的操作
   */
  public getPendingOperations(): OptimisticOperation[] {
    return Array.from(this.pendingOperations.values())
  }

  /**
   * 获取特定实体的待处理操作
   */
  public getPendingOperationsForEntity(entity: 'item' | 'task', entityId?: string): OptimisticOperation[] {
    return this.getPendingOperations().filter(op => {
      if (op.entity !== entity) return false
      if (entityId && op.data.id !== entityId) return false
      return true
    })
  }

  /**
   * 应用乐观更新到数据集合
   */
  public applyOptimisticUpdates<T extends { id: string }>(
    originalData: T[],
    entity: 'item' | 'task'
  ): T[] {
    let result = [...originalData]
    const operations = this.getPendingOperationsForEntity(entity)

    for (const operation of operations) {
      switch (operation.type) {
        case 'add':
          // 检查是否已存在（避免重复添加）
          if (!result.find(item => item.id === operation.data.id)) {
            result.push(operation.data)
          }
          break

        case 'update':
          const updateIndex = result.findIndex(item => item.id === operation.data.id)
          if (updateIndex !== -1) {
            result[updateIndex] = { ...result[updateIndex], ...operation.data }
          }
          break

        case 'delete':
          result = result.filter(item => item.id !== operation.data.id)
          break
      }
    }

    return result
  }

  /**
   * 添加监听器
   */
  public addListener(listener: OptimisticUpdateListener): void {
    this.listeners.add(listener)
    console.log('[OptimisticUpdate] 添加监听器')
  }

  /**
   * 移除监听器
   */
  public removeListener(listener: OptimisticUpdateListener): void {
    this.listeners.delete(listener)
    console.log('[OptimisticUpdate] 移除监听器')
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const operations = this.getPendingOperations()
    this.listeners.forEach(listener => {
      try {
        listener(operations)
      } catch (error) {
        console.error('[OptimisticUpdate] 监听器执行失败:', error)
      }
    })
  }

  /**
   * 清理所有操作
   */
  public clear(): void {
    this.pendingOperations.clear()
    this.notifyListeners()
    console.log('[OptimisticUpdate] 清理所有待处理操作')
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    total: number
    pending: number
    confirmed: number
    failed: number
  } {
    const operations = this.getPendingOperations()
    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      confirmed: operations.filter(op => op.status === 'confirmed').length,
      failed: operations.filter(op => op.status === 'failed').length
    }
  }
}

export const optimisticUpdateManager = OptimisticUpdateManager.getInstance()
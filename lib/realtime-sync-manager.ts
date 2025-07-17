/**
 * 实时同步管理器
 * 负责处理客户端与服务端的实时数据同步
 */

import { TMDBItem, ScheduledTask } from './storage'
import { performanceMonitor } from './performance-monitor'
import { errorRecoveryManager } from './error-recovery-manager'

export type DataChangeEvent = {
    type: 'item_added' | 'item_updated' | 'item_deleted' | 'task_completed' | 'task_status_changed' | 
          'episode_updated' | 'season_added' | 'season_deleted' | 'progress_updated' | 
          'batch_operation' | 'data_imported' | 'data_exported' | 'connection_status'
    data: any
    timestamp: number
    userId?: string
}

export type SyncEventListener = (event: DataChangeEvent) => void

class RealtimeSyncManager {
    private static instance: RealtimeSyncManager
    private eventSource: EventSource | null = null
    private listeners: Map<string, Set<SyncEventListener>> = new Map()
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectDelay = 1000
    private isConnected = false

    private constructor() { }

    public static getInstance(): RealtimeSyncManager {
        if (!RealtimeSyncManager.instance) {
            RealtimeSyncManager.instance = new RealtimeSyncManager()
        }
        return RealtimeSyncManager.instance
    }

    /**
     * 初始化实时同步连接
     */
    public async initialize(): Promise<void> {
        if (typeof window === 'undefined') {
            console.log('[RealtimeSync] 服务端环境，跳过初始化')
            return
        }

        const connectionEventId = performanceMonitor.startEvent('connection')

        try {
            console.log('[RealtimeSync] 初始化实时同步连接')

            // 创建 Server-Sent Events 连接
            this.eventSource = new EventSource('/api/realtime-sync')

            this.eventSource.onopen = () => {
                console.log('[RealtimeSync] 连接已建立')
                this.isConnected = true
                this.reconnectAttempts = 0
                
                // 记录连接成功
                performanceMonitor.endEvent(connectionEventId, true)
                
                // 发送连接状态事件
                this.notifyListeners('connection_status', {
                    type: 'connection_status',
                    data: { connected: true },
                    timestamp: Date.now()
                })
            }

            this.eventSource.onmessage = (event) => {
                const messageEventId = performanceMonitor.startEvent('message')
                
                try {
                    const data: DataChangeEvent = JSON.parse(event.data)
                    console.log('[RealtimeSync] 收到数据变更事件:', data)
                    this.notifyListeners(data.type, data)
                    
                    performanceMonitor.endEvent(messageEventId, true)
                } catch (error) {
                    console.error('[RealtimeSync] 解析事件数据失败:', error)
                    performanceMonitor.endEvent(messageEventId, false, error instanceof Error ? error.message : '解析失败')
                    
                    // 使用错误恢复管理器处理错误
                    errorRecoveryManager.handleError(
                        error instanceof Error ? error : new Error('解析事件数据失败'),
                        'sync',
                        { event: event.data }
                    )
                }
            }

            this.eventSource.onerror = (error) => {
                console.error('[RealtimeSync] 连接错误:', error)
                this.isConnected = false
                
                performanceMonitor.endEvent(connectionEventId, false, '连接错误')
                
                // 发送连接状态事件
                this.notifyListeners('connection_status', {
                    type: 'connection_status',
                    data: { connected: false },
                    timestamp: Date.now()
                })
                
                // 使用错误恢复管理器处理连接错误
                const connectionError = new Error('实时同步连接错误')
                errorRecoveryManager.handleError(connectionError, 'connection', {
                    reconnectFunction: () => this.handleReconnect()
                })
            }

        } catch (error) {
            console.error('[RealtimeSync] 初始化失败:', error)
            performanceMonitor.endEvent(connectionEventId, false, error instanceof Error ? error.message : '初始化失败')
            
            // 使用错误恢复管理器处理初始化错误
            errorRecoveryManager.handleError(
                error instanceof Error ? error : new Error('初始化失败'),
                'connection'
            )
        }
    }

    /**
     * 处理重连逻辑
     */
    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[RealtimeSync] 达到最大重连次数，停止重连')
            return
        }

        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

        console.log(`[RealtimeSync] ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`)

        setTimeout(() => {
            this.cleanup()
            this.initialize()
        }, delay)
    }

    /**
     * 添加事件监听器
     */
    public addEventListener(eventType: string, listener: SyncEventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set())
        }
        this.listeners.get(eventType)!.add(listener)
        console.log(`[RealtimeSync] 添加 ${eventType} 事件监听器`)
    }

    /**
     * 移除事件监听器
     */
    public removeEventListener(eventType: string, listener: SyncEventListener): void {
        const listeners = this.listeners.get(eventType)
        if (listeners) {
            listeners.delete(listener)
            if (listeners.size === 0) {
                this.listeners.delete(eventType)
            }
        }
        console.log(`[RealtimeSync] 移除 ${eventType} 事件监听器`)
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners(eventType: string, event: DataChangeEvent): void {
        const listeners = this.listeners.get(eventType)
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event)
                } catch (error) {
                    console.error(`[RealtimeSync] 事件监听器执行失败:`, error)
                }
            })
        }

        // 同时通知通用监听器
        const allListeners = this.listeners.get('*')
        if (allListeners) {
            allListeners.forEach(listener => {
                try {
                    listener(event)
                } catch (error) {
                    console.error(`[RealtimeSync] 通用事件监听器执行失败:`, error)
                }
            })
        }
    }

    /**
     * 发送数据变更事件到服务端
     */
    public async notifyDataChange(event: Omit<DataChangeEvent, 'timestamp'>): Promise<void> {
        try {
            const fullEvent: DataChangeEvent = {
                ...event,
                timestamp: Date.now()
            }

            console.log('[RealtimeSync] 发送数据变更通知:', fullEvent)

            await fetch('/api/realtime-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fullEvent)
            })
        } catch (error) {
            console.error('[RealtimeSync] 发送数据变更通知失败:', error)
        }
    }

    /**
     * 获取连接状态
     */
    public isConnectionActive(): boolean {
        return this.isConnected && this.eventSource?.readyState === EventSource.OPEN
    }

    /**
     * 清理资源
     */
    public cleanup(): void {
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
        this.isConnected = false
        console.log('[RealtimeSync] 清理连接资源')
    }

    /**
     * 销毁实例
     */
    public destroy(): void {
        this.cleanup()
        this.listeners.clear()
        console.log('[RealtimeSync] 销毁实时同步管理器')
    }
}

export const realtimeSyncManager = RealtimeSyncManager.getInstance()
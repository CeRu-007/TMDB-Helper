/**
 * 实时同步管理器
 * 负责处理客户端与服务端的实时数据同步
 */

import { TMDBItem, ScheduledTask } from './storage';
import { performanceMonitor } from '@/shared/lib/utils/performance-monitor';
import { errorRecoveryManager } from '@/shared/lib/utils/error-recovery-manager';

export type DataChangeEvent = {
  type:
    | 'item_added'
    | 'item_updated'
    | 'item_deleted'
    | 'task_completed'
    | 'task_status_changed'
    | 'episode_updated'
    | 'season_added'
    | 'season_deleted'
    | 'progress_updated'
    | 'batch_operation'
    | 'data_imported'
    | 'data_exported'
    | 'connection_status';
  data: any;
  timestamp: number;
  userId?: string;
  sourceConnectionId?: string; // 添加操作来源标识
};

export type SyncEventListener = (event: DataChangeEvent) => void;

class RealtimeSyncManager {
  private static instance: RealtimeSyncManager;
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SyncEventListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private connectionId: string | null = null; // 当前连接ID
  private connectionEstablishedTime: number | null = null; // 连接建立时间，用于连接去重
  private isInitializing = false; // 防止重复初始化
  private initializationPromise: Promise<void> | null = null; // 初始化Promise，用于确保单次初始化

  // 添加事件去重和防抖机制
  private recentEvents: Map<
    string,
    { timestamp: number; data: DataChangeEvent }
  > = new Map();
  private eventDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly EVENT_DEBOUNCE_TIME = 250; // 事件防抖时间（毫秒）
  private readonly EVENT_EXPIRY_TIME = 5000; // 事件过期时间（毫秒）

  private constructor() {}

  public static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager();
    }
    return RealtimeSyncManager.instance;
  }

  /**
   * 初始化实时同步连接
   */
  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // 如果正在初始化，返回已有的Promise
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // 防止重复初始化，实现连接去重
    if (
      this.eventSource &&
      this.eventSource.readyState !== EventSource.CLOSED
    ) {
      // 如果连接已经建立，直接返回
      if (this.isConnected) {
        return;
      }
      // 如果连接未完全关闭，先清理
      this.cleanup();
    }

    // 设置初始化状态
    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * 执行实际的初始化逻辑
   */
  private async performInitialization(): Promise<void> {
    const connectionEventId = performanceMonitor.startEvent('connection');

    try {
      // 生成唯一连接ID
      this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.connectionEstablishedTime = Date.now();

      // 创建 Server-Sent Events 连接
      this.eventSource = new EventSource('/api/system/realtime-sync');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // 记录连接成功
        performanceMonitor.endEvent(connectionEventId, true);

        // 发送连接状态事件
        this.notifyListeners('connection_status', {
          type: 'connection_status',
          data: { connected: true, connectionId: this.connectionId },
          timestamp: Date.now(),
        });
      };

      this.eventSource.onmessage = (event) => {
        const messageEventId = performanceMonitor.startEvent('message');

        try {
          const data: DataChangeEvent = JSON.parse(event.data);

          // 过滤掉自己发出的事件，避免循环处理
          if (
            data.sourceConnectionId &&
            data.sourceConnectionId === this.connectionId
          ) {
            performanceMonitor.endEvent(messageEventId, true);
            return;
          }

          // 使用防抖和去重机制处理事件
          if (this.shouldProcessEvent(data)) {
            this.handleEventWithDebounce(data);
          }

          performanceMonitor.endEvent(messageEventId, true);
        } catch (error) {
          performanceMonitor.endEvent(
            messageEventId,
            false,
            error instanceof Error ? error.message : '解析失败',
          );

          // 使用错误恢复管理器处理错误
          errorRecoveryManager.handleError(
            error instanceof Error ? error : new Error('解析事件数据失败'),
            'sync',
            { event: event.data },
          );
        }
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;

        performanceMonitor.endEvent(connectionEventId, false, '连接错误');

        // 发送连接状态事件
        this.notifyListeners('connection_status', {
          type: 'connection_status',
          data: { connected: false },
          timestamp: Date.now(),
        });

        // 使用错误恢复管理器处理连接错误
        const connectionError = new Error('实时同步连接错误');
        errorRecoveryManager.handleError(connectionError, 'connection', {
          reconnectFunction: () => this.handleReconnect(),
        });
      };
    } catch (error) {
      performanceMonitor.endEvent(
        connectionEventId,
        false,
        error instanceof Error ? error.message : '初始化失败',
      );

      // 使用错误恢复管理器处理初始化错误
      errorRecoveryManager.handleError(
        error instanceof Error ? error : new Error('初始化失败'),
        'connection',
      );
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.cleanup();
      this.initialize();
    }, delay);
  }

  /**
   * 检查是否应该处理事件（去重逻辑）
   */
  private shouldProcessEvent(event: DataChangeEvent): boolean {
    // 为每个事件生成唯一标识符
    const eventId = `${event.type}_${JSON.stringify(event.data)}_${event.sourceConnectionId || 'unknown'}`;

    const now = Date.now();
    const existingEvent = this.recentEvents.get(eventId);

    // 如果事件在防抖窗口内已经处理过，则跳过
    if (
      existingEvent &&
      now - existingEvent.timestamp < this.EVENT_EXPIRY_TIME
    ) {
      return false;
    }

    // 记录事件
    this.recentEvents.set(eventId, { timestamp: now, data: event });

    // 清理过期事件
    this.cleanupExpiredEvents();

    return true;
  }

  /**
   * 使用防抖机制处理事件
   */
  private handleEventWithDebounce(event: DataChangeEvent): void {
    // 为每种事件类型创建防抖ID（根据事件类型和关键数据）
    const debounceId = `${event.type}_${this.getEventKey(event)}`;

    // 清除之前的防抖计时器
    if (this.eventDebounceTimers.has(debounceId)) {
      clearTimeout(this.eventDebounceTimers.get(debounceId)!);
    }

    // 设置新的防抖计时器
    const timer = setTimeout(() => {
      this.notifyListeners(event.type, event);
      this.eventDebounceTimers.delete(debounceId);
    }, this.EVENT_DEBOUNCE_TIME);

    this.eventDebounceTimers.set(debounceId, timer);
  }

  /**
   * 从事件中提取关键标识符，用于防抖
   */
  private getEventKey(event: DataChangeEvent): string {
    // 根据事件类型提取关键标识符
    switch (event.type) {
      case 'item_added':
      case 'item_updated':
      case 'item_deleted':
        return event.data.id || 'unknown';
      case 'episode_updated':
        return `${event.data.item?.id || 'unknown'}_${event.data.episodeNumber || 'unknown'}`;
      case 'season_added':
      case 'season_deleted':
        return `${event.data.item?.id || 'unknown'}_${event.data.seasonNumber || 'unknown'}`;
      case 'task_completed':
      case 'task_status_changed':
        return event.data.taskId || event.data.id || 'unknown';
      default:
        return JSON.stringify(event.data).substring(0, 50); // 取前50个字符作为标识
    }
  }

  /**
   * 清理过期事件
   */
  private cleanupExpiredEvents(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, event] of this.recentEvents) {
      if (now - event.timestamp > this.EVENT_EXPIRY_TIME) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.recentEvents.delete(id);
    }
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(
    eventType: string,
    listener: SyncEventListener,
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(
    eventType: string,
    listener: SyncEventListener,
  ): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(eventType: string, event: DataChangeEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {}
      });
    }

    // 同时通知通用监听器
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {}
      });
    }
  }

  /**
   * 发送数据变更事件到服务端
   */
  public async notifyDataChange(
    event: Omit<DataChangeEvent, 'timestamp' | 'sourceConnectionId'>,
  ): Promise<void> {
    try {
      const fullEvent: DataChangeEvent = {
        ...event,
        timestamp: Date.now(),
        sourceConnectionId: this.connectionId, // 添加源连接ID
      };

      await fetch('/api/system/realtime-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      });
    } catch (error) {}
  }

  /**
   * 获取连接状态
   */
  public isConnectionActive(): boolean {
    return (
      this.isConnected && this.eventSource?.readyState === EventSource.OPEN
    );
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // 清理防抖计时器
    for (const timer of this.eventDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.eventDebounceTimers.clear();

    // 清理事件缓存
    this.recentEvents.clear();

    this.isConnected = false;
    this.connectionId = null;
    this.connectionEstablishedTime = null;
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.cleanup();
    this.listeners.clear();
  }
}

export const realtimeSyncManager = RealtimeSyncManager.getInstance();

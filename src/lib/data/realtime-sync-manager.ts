/**
 * Realtime sync manager for client-server data synchronization
 */

import { TMDBItem, ScheduledTask } from './storage'
import { ConnectionManager } from './connection-manager'
import { EventDebouncer, DataChangeEvent, SyncEventListener } from './event-debouncer'

class RealtimeSyncManager {
  private static instance: RealtimeSyncManager
  private listeners: Map<string, Set<SyncEventListener>> = new Map()
  private connectionManager: ConnectionManager
  private eventDebouncer: EventDebouncer
  private isInitializing = false
  private initializationPromise: Promise<void> | null = null

  private constructor() {
    this.connectionManager = new ConnectionManager((connected) => {
      this.notifyListeners('connection_status', {
        type: 'connection_status',
        data: { connected: true, connectionId: this.connectionManager.getConnectionId() },
        timestamp: Date.now(),
      })
    })

    this.eventDebouncer = new EventDebouncer((eventType, event) => {
      this.notifyListeners(eventType, event)
    })

    this.connectionManager.setOnMessage(this.handleMessage.bind(this))
  }

  public static getInstance(): RealtimeSyncManager {
    if (!RealtimeSyncManager.instance) {
      RealtimeSyncManager.instance = new RealtimeSyncManager()
    }
    return RealtimeSyncManager.instance
  }

  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise
    }

    this.isInitializing = true
    this.initializationPromise = this.connectionManager.connect()

    try {
      await this.initializationPromise
    } finally {
      this.isInitializing = false
      this.initializationPromise = null
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data: DataChangeEvent = JSON.parse(event.data)

      if (data.sourceConnectionId === this.connectionManager.getConnectionId()) {
        return
      }

      if (this.eventDebouncer.shouldProcessEvent(data)) {
        this.eventDebouncer.handleEventWithDebounce(data)
      }
    } catch (error) {
      // Error is handled by ConnectionManager
    }
  }

  public addEventListener(eventType: string, listener: SyncEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  public removeEventListener(eventType: string, listener: SyncEventListener): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  private notifyListeners(eventType: string, event: DataChangeEvent): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          // Ignore listener errors
        }
      })
    }

    const allListeners = this.listeners.get('*')
    if (allListeners) {
      allListeners.forEach((listener) => {
        try {
          listener(event)
        } catch (error) {
          // Ignore listener errors
        }
      })
    }
  }

  public async notifyDataChange(
    event: Omit<DataChangeEvent, 'timestamp' | 'sourceConnectionId'>
  ): Promise<void> {
    try {
      const fullEvent: DataChangeEvent = {
        ...event,
        timestamp: Date.now(),
        sourceConnectionId: this.connectionManager.getConnectionId(),
      }

      await fetch('/api/system/realtime-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      })
    } catch (error) {
      // Ignore network errors
    }
  }

  public isConnectionActive(): boolean {
    return this.connectionManager.isActive()
  }

  public cleanup(): void {
    this.connectionManager.cleanup()
    this.eventDebouncer.cleanup()
  }

  public destroy(): void {
    this.cleanup()
    this.listeners.clear()
  }
}

export const realtimeSyncManager = RealtimeSyncManager.getInstance()
export type { DataChangeEvent, SyncEventListener }
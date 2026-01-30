import { performanceMonitor } from '@/shared/lib/utils/performance-monitor'
import { errorRecoveryManager } from '@/shared/lib/utils/error-recovery-manager'
import { logger } from '@/lib/utils/logger'

export interface ConnectionEvent {
  type: 'connection_status'
  data: { connected: boolean; connectionId?: string }
  timestamp: number
}

export type ConnectionListener = (event: ConnectionEvent) => void

export class ConnectionManager {
  private eventSource: EventSource | null = null
  private listeners: Set<ConnectionListener> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnected = false
  private connectionId: string | null = null
  private onMessage?: (event: MessageEvent) => void

  constructor(private onConnectionChange?: (connected: boolean) => void) {}

  public async connect(): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      if (this.isConnected) {
        return
      }
      this.cleanup()
    }

    const connectionEventId = performanceMonitor.startEvent('connection')

    try {
      this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.eventSource = new EventSource('/api/system/realtime-sync')

      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected && this.eventSource) {
          this.cleanup()
          this.isConnected = false

          if (process.env.NODE_ENV === 'development') {
            logger.warn('[ConnectionManager] Connection timeout')
          }
        }
      }, 10000)

      this.eventSource.onopen = () => {
        clearTimeout(connectionTimeout)
        this.isConnected = true
        this.reconnectAttempts = 0
        performanceMonitor.endEvent(connectionEventId, true)
        this.onConnectionChange?.(true)
        this.notifyListeners({
          type: 'connection_status',
          data: { connected: true, connectionId: this.connectionId! },
          timestamp: Date.now()
        })
      }

      this.eventSource.onmessage = (event) => {
        const messageEventId = performanceMonitor.startEvent('message')

        try {
          this.onMessage?.(event)
          performanceMonitor.endEvent(messageEventId, true)
        } catch (error) {
          performanceMonitor.endEvent(
            messageEventId,
            false,
            error instanceof Error ? error.message : 'Parse failed'
          )
          errorRecoveryManager.handleError(
            error instanceof Error ? error : new Error('Failed to parse message'),
            'sync',
            { event: event.data }
          )
        }
      }

      this.eventSource.onerror = () => {
        clearTimeout(connectionTimeout)
        this.isConnected = false
        performanceMonitor.endEvent(connectionEventId, false, 'Connection error')
        this.onConnectionChange?.(false)
        this.notifyListeners({
          type: 'connection_status',
          data: { connected: false },
          timestamp: Date.now()
        })

        const connectionError = new Error('Realtime sync connection error')
        errorRecoveryManager.handleError(connectionError, 'connection', {
          reconnectFunction: () => this.handleReconnect()
        })
      }
    } catch (error) {
      performanceMonitor.endEvent(
        connectionEventId,
        false,
        error instanceof Error ? error.message : 'Initialization failed'
      )
      errorRecoveryManager.handleError(
        error instanceof Error ? error : new Error('Initialization failed'),
        'connection'
      )
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      this.cleanup()
      this.connect()
    }, delay)
  }

  public addListener(listener: ConnectionListener): void {
    this.listeners.add(listener)
  }

  public removeListener(listener: ConnectionListener): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(event: ConnectionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        // Ignore listener errors
      }
    })
  }

  public setOnMessage(handler: (event: MessageEvent) => void): void {
    this.onMessage = handler
  }

  public isActive(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN
  }

  public getConnectionId(): string | null {
    return this.connectionId
  }

  public cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnected = false
    this.connectionId = null
  }
}
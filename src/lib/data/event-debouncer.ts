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
    | 'connection_status'
  data: any
  timestamp: number
  userId?: string
  sourceConnectionId?: string
}

export type SyncEventListener = (event: DataChangeEvent) => void

export class EventDebouncer {
  private recentEvents: Map<string, { timestamp: number; data: DataChangeEvent }> = new Map()
  private eventDebounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly EVENT_DEBOUNCE_TIME = 250
  private readonly EVENT_EXPIRY_TIME = 5000

  constructor(private readonly notifyListeners: (eventType: string, event: DataChangeEvent) => void) {}

  public shouldProcessEvent(event: DataChangeEvent): boolean {
    const eventId = `${event.type}_${JSON.stringify(event.data)}_${event.sourceConnectionId || 'unknown'}`
    const now = Date.now()
    const existingEvent = this.recentEvents.get(eventId)

    if (existingEvent && now - existingEvent.timestamp < this.EVENT_EXPIRY_TIME) {
      return false
    }

    this.recentEvents.set(eventId, { timestamp: now, data: event })
    this.cleanupExpiredEvents()
    return true
  }

  public handleEventWithDebounce(event: DataChangeEvent): void {
    const debounceId = `${event.type}_${this.getEventKey(event)}`

    if (this.eventDebounceTimers.has(debounceId)) {
      clearTimeout(this.eventDebounceTimers.get(debounceId)!)
    }

    const timer = setTimeout(() => {
      this.notifyListeners(event.type, event)
      this.eventDebounceTimers.delete(debounceId)
    }, this.EVENT_DEBOUNCE_TIME)

    this.eventDebounceTimers.set(debounceId, timer)
  }

  private getEventKey(event: DataChangeEvent): string {
    switch (event.type) {
      case 'item_added':
      case 'item_updated':
      case 'item_deleted':
        return event.data.id || 'unknown'
      case 'episode_updated':
        return `${event.data.item?.id || 'unknown'}_${event.data.episodeNumber || 'unknown'}`
      case 'season_added':
      case 'season_deleted':
        return `${event.data.item?.id || 'unknown'}_${event.data.seasonNumber || 'unknown'}`
      case 'task_completed':
      case 'task_status_changed':
        return event.data.taskId || event.data.id || 'unknown'
      default:
        return JSON.stringify(event.data).substring(0, 50)
    }
  }

  private cleanupExpiredEvents(): void {
    const now = Date.now()
    const expiredIds: string[] = []

    for (const [id, event] of this.recentEvents) {
      if (now - event.timestamp > this.EVENT_EXPIRY_TIME) {
        expiredIds.push(id)
      }
    }

    for (const id of expiredIds) {
      this.recentEvents.delete(id)
    }
  }

  public cleanup(): void {
    for (const timer of this.eventDebounceTimers.values()) {
      clearTimeout(timer)
    }
    this.eventDebounceTimers.clear()
    this.recentEvents.clear()
  }
}
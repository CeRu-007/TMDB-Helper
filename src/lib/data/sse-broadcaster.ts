import { TIMEOUT_30S, INTERVAL_10S } from '@/lib/constants/constants'
import { logger } from '@/lib/utils/logger'

interface SSEConnection {
  controller: ReadableStreamDefaultController
  userId: string
  lastPing: number
}

const connections = new Map<string, SSEConnection>()

setInterval(() => {
  const now = Date.now()
  for (const [connectionId, connection] of connections.entries()) {
    if (now - connection.lastPing > TIMEOUT_30S) {
      try {
        connection.controller.close()
      } catch {}
      connections.delete(connectionId)
    }
  }
}, INTERVAL_10S)

export function addConnection(
  connectionId: string,
  controller: ReadableStreamDefaultController,
  userId: string
): void {
  connections.set(connectionId, {
    controller,
    userId,
    lastPing: Date.now(),
  })
}

export function updatePing(connectionId: string): boolean {
  const connection = connections.get(connectionId)
  if (connection) {
    connection.lastPing = Date.now()
    return true
  }
  return false
}

export function removeConnection(connectionId: string): void {
  connections.delete(connectionId)
}

export function sendToConnection(
  connectionId: string,
  data: string
): boolean {
  const connection = connections.get(connectionId)
  if (!connection) return false
  try {
    connection.controller.enqueue(new TextEncoder().encode(data))
    return true
  } catch {
    connections.delete(connectionId)
    return false
  }
}

export function broadcastToUser(userId: string, eventData: Record<string, unknown>): number {
  const userConnections = Array.from(connections.entries())
    .filter(([_, connection]) => connection.userId === userId)

  if (userConnections.length === 0) return 0

  const message = `data: ${JSON.stringify({
    ...eventData,
    userId,
    timestamp: Date.now(),
  })}\n\n`

  let broadcastCount = 0
  for (const [connectionId] of userConnections) {
    if (sendToConnection(connectionId, message)) {
      broadcastCount++
    }
  }

  return broadcastCount
}

export function broadcastToAllUsers(eventData: Record<string, unknown>): number {
  const userIds = new Set<string>()
  for (const connection of connections.values()) {
    userIds.add(connection.userId)
  }

  let totalCount = 0
  for (const userId of userIds) {
    totalCount += broadcastToUser(userId, eventData)
  }

  return totalCount
}

export function closeUserConnections(userId: string): number {
  const userConnections = Array.from(connections.entries())
    .filter(([_, connection]) => connection.userId === userId)

  let closedCount = 0
  for (const [connectionId, connection] of userConnections) {
    try {
      connection.controller.close()
      connections.delete(connectionId)
      closedCount++
    } catch {}
  }

  return closedCount
}

export function notifyDataChangeFromServer(event: {
  type: string
  data: unknown
}): void {
  try {
    const userIds = new Set<string>()
    for (const connection of connections.values()) {
      userIds.add(connection.userId)
    }

    if (userIds.size === 0) return

    for (const userId of userIds) {
      broadcastToUser(userId, event as Record<string, unknown>)
    }

    logger.info(`[SSE Broadcaster] 服务端广播事件: type=${event.type}, 用户数=${userIds.size}`)
  } catch (error) {
    logger.error('[SSE Broadcaster] 服务端广播失败:', error)
  }
}

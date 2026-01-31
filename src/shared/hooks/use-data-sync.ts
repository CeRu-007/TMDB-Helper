"use client"

import { useEffect, useState, useCallback } from "react"
import { useIsClient } from "@/lib/hooks/use-is-client"
import { StorageManager, TMDBItem } from "@/lib/data/storage"
import { realtimeSyncManager, DataChangeEvent } from "@/lib/data/realtime-sync-manager"

export function useDataSync() {
  const [items, setItems] = useState<TMDBItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const isClient = useIsClient()

  const loadData = useCallback(async () => {
    if (!isClient) return

    setError(null)

    try {
      const data = await StorageManager.getItemsWithRetry()
      setItems(data)
      setInitialized(true)
    } catch (err) {
      setError("加载数据失败，请刷新页面重试")
    }
  }, [isClient])

  // Initialize real-time sync
  useEffect(() => {
    if (!isClient) return

    let mounted = true

    const initializeSync = async () => {
      try {
        const initPromise = realtimeSyncManager.initialize()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )

        await Promise.race([initPromise, timeoutPromise])

        if (!mounted) return
        setIsConnected(realtimeSyncManager.isConnectionActive())

        const checkConnection = setInterval(() => {
          if (!mounted) return
          setIsConnected(realtimeSyncManager.isConnectionActive())
        }, 5000)

        return () => clearInterval(checkConnection)
      } catch (error) {
        if (!mounted) return
        setIsConnected(false)
      }
    }

    loadData()
    initializeSync()
  }, [isClient, loadData])

  // Handle data change events
  useEffect(() => {
    const handleDataChange = (event: DataChangeEvent) => {
      if (!mounted) return

      switch (event.type) {
        case 'item_added':
          setItems(prevItems => [...prevItems, event.data])
          break
        case 'item_updated':
        case 'episode_updated':
          if (event.data && event.data.id) {
            setItems(prevItems =>
              prevItems.map(item =>
                item.id === event.data.id ? event.data : item
              )
            )
          } else {
            loadData()
          }
          break
        case 'item_deleted':
          if (event.data && event.data.id) {
            setItems(prevItems => prevItems.filter(item => item.id !== event.data.id))
          } else {
            loadData()
          }
          break
        case 'task_completed':
          loadData()
          break
      }
    }

    let mounted = true
    realtimeSyncManager.addEventListener('*', handleDataChange)

    return () => {
      mounted = false
      realtimeSyncManager.removeEventListener('*', handleDataChange)
    }
  }, [loadData])

  return {
    items,
    setItems,
    error,
    initialized,
    isConnected,
    refreshData: loadData,
    setError
  }
}
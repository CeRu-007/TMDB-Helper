import { ChatHistory, Message } from '@/types/ai-chat'

// IndexedDB缓存管理器
class ChatHistoryCache {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'ChatHistoryCache'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'chatHistories'

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })
  }

  async cacheChatHistory(chatHistory: ChatHistory): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.put({
        ...chatHistory,
        cachedAt: Date.now()
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getCachedChat(chatId: string): Promise<ChatHistory | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(chatId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // 移除缓存标记
          const { cachedAt, ...chatHistory } = result
          resolve(chatHistory)
        } else {
          resolve(null)
        }
      }
    })
  }

  async getAllCachedChats(): Promise<ChatHistory[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result
        const chats = results
          .map(result => {
            const { cachedAt, ...chatHistory } = result
            return chatHistory
          })
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // 按更新时间倒序排序
        resolve(chats)
      }
    })
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

// 智能同步管理器
class ChatSyncManager {
  private pendingUpdates = new Map<string, { chatHistory: ChatHistory, timestamp: number }>()
  private syncQueue: Promise<void> = Promise.resolve()
  private readonly SYNC_DELAY = 2000 // 2秒防抖
  private cache = new ChatHistoryCache()

  async queueUpdate(chatHistory: ChatHistory): Promise<void> {
    this.pendingUpdates.set(chatHistory.id, {
      chatHistory,
      timestamp: Date.now()
    })

    // 立即更新本地缓存
    await this.cache.cacheChatHistory(chatHistory)

    // 防抖处理，避免频繁同步到服务器
    this.syncQueue = this.syncQueue.then(() => 
      this.flushUpdates()
    ).catch(console.error)
  }

  private async flushUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) return

    const updates = new Map(this.pendingUpdates)
    this.pendingUpdates.clear()

    // 批量更新到服务器
    try {
      const histories = Array.from(updates.values()).map(update => update.chatHistory)
      const response = await fetch('/api/ai/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ histories })
      })

      if (!response.ok) {
        console.warn('服务器同步失败，数据已保存在本地缓存')
      }
    } catch (error) {
      console.error('同步到服务器失败:', error)
      // 数据已经在本地缓存中，下次会重试同步
    }
  }

  async getChatHistory(chatId: string): Promise<ChatHistory | null> {
    // 先尝试从缓存获取
    const cachedChat = await this.cache.getCachedChat(chatId)
    if (cachedChat) {
      return cachedChat
    }

    // 缓存未命中，从服务器获取
    try {
      const response = await fetch(`/api/ai/ai-chat/${chatId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const chatHistory = {
            ...result.data,
            createdAt: new Date(result.data.createdAt),
            updatedAt: new Date(result.data.updatedAt),
            messages: result.data.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }
          // 缓存结果
          await this.cache.cacheChatHistory(chatHistory)
          return chatHistory
        }
      }
    } catch (error) {
      console.error('从服务器获取聊天历史失败:', error)
    }

    return null
  }

  async getAllChatHistories(): Promise<ChatHistory[]> {
    try {
      // 先尝试从缓存获取
      const cachedChats = await this.cache.getAllCachedChats()
      
      // 如果有缓存数据，先返回缓存，然后异步更新
      if (cachedChats.length > 0) {
        // 异步从服务器获取最新数据
        this.fetchFromServerAndUpdateCache().catch(error => {
          console.warn('异步更新缓存失败:', error)
        })
        return cachedChats
      }

      // 缓存为空，直接从服务器获取
      return await this.fetchFromServer()
    } catch (error) {
      console.error('获取聊天历史时发生错误:', error)
      // 尝试直接从服务器获取作为最后的备选方案
      try {
        return await this.fetchFromServer()
      } catch (serverError) {
        console.error('从服务器获取数据也失败:', serverError)
        return []
      }
    }
  }

  private async fetchFromServer(): Promise<ChatHistory[]> {
    try {
      const response = await fetch('/api/ai/ai-chat')
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          const histories = result.data.map((h: ChatHistory) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
            messages: h.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // 按更新时间倒序排序
          
          // 批量缓存
          for (const history of histories) {
            await this.cache.cacheChatHistory(history)
          }
          
          return histories
        } else {
          console.warn('服务器返回的数据格式不正确:', result)
        }
      } else {
        console.warn('服务器响应错误:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('从服务器获取聊天历史失败:', error)
    }

    // API失败时，尝试从缓存返回现有数据
    try {
      return await this.cache.getAllCachedChats()
    } catch (cacheError) {
      console.error('从缓存获取数据也失败:', cacheError)
      return []
    }
  }

  private async fetchFromServerAndUpdateCache(): Promise<void> {
    try {
      const serverHistories = await this.fetchFromServer()
      // 这里可以添加缓存和服务器数据的差异对比逻辑
      // 如果服务器有新数据，可以触发相应的UI更新
    } catch (error) {
      console.error('更新缓存失败:', error)
    }
  }

  async deleteChatHistory(chatId: string): Promise<void> {
    // 从缓存中删除
    await this.cache.init()
    
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.cache.db!.transaction([this.cache.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.cache.STORE_NAME)
        const request = store.delete(chatId)
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('从缓存删除失败:', error)
    }

    // 从服务器删除
    try {
      const response = await fetch(`/api/ai/ai-chat/${chatId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        console.error('从服务器删除失败:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('从服务器删除失败:', error)
    }
  }
}

// 导出单例实例
export const chatSyncManager = new ChatSyncManager()

// 导出类型
export { ChatHistoryCache }
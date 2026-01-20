import { useState, useCallback, useEffect } from 'react'
import { ChatHistory, Message } from '@/types/ai-chat'
import { chatSyncManager } from '@/features/ai/lib/utils/chat-history-cache'
import { storageService } from '@/lib/storage/storage-service'

export const useAiChatHistory = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  const loadChatHistories = useCallback(async () => {
    try {
      const histories = await chatSyncManager.getAllChatHistories()
      setChatHistories(histories)
    } catch (error) {
      console.error('加载对话历史失败:', error)
      try {
        const stored = storageService.get<string>('ai-chat-histories', '')
        if (stored) {
          const histories = JSON.parse(stored).map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
            messages: h.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          setChatHistories(histories)
        }
      } catch (localError) {
        console.error('从本地存储加载失败:', localError)
      }
    }
  }, [])

  const saveChatHistories = useCallback(async (histories: ChatHistory[]) => {
    try {
      for (const history of histories) {
        await chatSyncManager.queueUpdate(history)
      }
    } catch (error) {
      console.error('保存对话历史失败:', error)
      try {
        storageService.set('ai-chat-histories', histories)
      } catch (localError) {
        console.error('本地存储保存也失败:', localError)
      }
    }
  }, [])

  const updateCurrentChat = useCallback(async (newMessages: Message[], chatId?: string) => {
    setChatHistories(prevChatHistories => {
      const currentChatIdValue = chatId || currentChatId;
      
      if (!currentChatIdValue) {
        return prevChatHistories;
      }
      
      const updatedHistories = prevChatHistories.map((chat) => {
        if (chat.id === currentChatIdValue) {
          return {
            ...chat,
            messages: newMessages,
            updatedAt: new Date()
          }
        }
        return chat
      })
      
      const updatedChat = updatedHistories.find(chat => chat.id === currentChatIdValue);
      if (updatedChat) {
        chatSyncManager.queueUpdate(updatedChat);
      }
      
      return updatedHistories;
    });
  }, [currentChatId])

  const createNewChat = useCallback(async () => {
    const newChatId = `chat-${Date.now()}`
    const newChat: ChatHistory = {
      id: newChatId,
      title: '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const updatedHistories = [newChat, ...chatHistories]
    setChatHistories(updatedHistories)
    await saveChatHistories(updatedHistories)
    setCurrentChatId(newChatId)
    setMessages([])
    
    return newChatId
  }, [chatHistories, saveChatHistories, setMessages])

  const switchChat = useCallback(async (chatId: string) => {
    if (currentChatId === chatId) return
    
    if (currentChatId && messages.length > 0) {
      await updateCurrentChat(messages)
    }
    
    const chat = chatHistories.find(h => h.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages(chat.messages)
    }
  }, [currentChatId, messages, chatHistories, updateCurrentChat, setMessages])

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await chatSyncManager.deleteChatHistory(chatId)
    } catch (error) {
      console.error('删除对话失败:', error)
    }
    
    const updatedHistories = chatHistories.filter(h => h.id !== chatId)
    setChatHistories(updatedHistories)
    
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }, [chatHistories, currentChatId, setMessages])

  useEffect(() => {
    const initializeChat = async () => {
      try {
        await chatSyncManager.getAllChatHistories()
        await loadChatHistories()
      } catch (error) {
        console.error('初始化聊天功能失败:', error)
      }
    }
    
    initializeChat()
  }, [])

  return {
    chatHistories,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    switchChat,
    deleteChat,
    updateCurrentChat,
    loadChatHistories
  }
}

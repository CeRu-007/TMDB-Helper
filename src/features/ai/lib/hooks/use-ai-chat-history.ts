import { useState, useCallback, useEffect } from 'react'
import { ChatHistory, Message } from '@/types/ai-chat'
import { chatSyncManager } from '@/features/ai/lib/utils/chat-history-cache'
import { storageService } from '@/lib/storage/storage-service'
import { logger } from '@/lib/utils/logger'

// 标题生成防抖和重试机制
const titleGenerationCache = new Map<string, {
  lastAttempt: number,
  attempts: number,
  isProcessing: boolean
}>()

const TITLE_GENERATION_COOLDOWN = 3000 // 3秒冷却时间
const MAX_RETRY_ATTEMPTS = 3

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
      logger.error('加载对话历史失败:', error)
      try {
        const stored = storageService.get<string>('ai-chat-histories', '')
        if (stored) {
          const histories = JSON.parse(stored).map((h: ChatHistory) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
            messages: h.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          setChatHistories(histories)
        }
      } catch (localError) {
        logger.error('从本地存储加载失败:', localError)
      }
    }
  }, [])

  const saveChatHistories = useCallback(async (histories: ChatHistory[]) => {
    try {
      for (const history of histories) {
        await chatSyncManager.queueUpdate(history)
      }
    } catch (error) {
      logger.error('保存对话历史失败:', error)
      try {
        storageService.set('ai-chat-histories', histories)
      } catch (localError) {
        logger.error('本地存储保存也失败:', localError)
      }
    }
  }, [])

  const updateCurrentChat = useCallback(async (newMessages: Message[], chatId?: string) => {
    setChatHistories(prevChatHistories => {
      const currentChatIdValue = chatId || currentChatId;
      
      if (!currentChatIdValue) {
        return prevChatHistories;
      }
      
      const currentChat = prevChatHistories.find(chat => chat.id === currentChatIdValue);
      
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
        
        // 如果是"新对话"且消息数量大于等于2（用户发送了第一条消息），自动生成标题
        if (currentChat?.title === '新对话' && newMessages.length >= 2) {
          generateChatTitle(currentChatIdValue, newMessages).catch(error => {
            logger.error('生成对话标题失败:', error);
          });
        }
      }
      
      return updatedHistories;
    });
  }, [currentChatId])

  // 生成对话标题
  const generateChatTitle = async (chatId: string, messages: Message[]) => {
    try {
      // 检查冷却时间和重试次数
      const cache = titleGenerationCache.get(chatId);
      const now = Date.now();

      if (cache && cache.isProcessing) {
        logger.info('标题生成已在进行中，跳过', { chatId });
        return;
      }

      if (cache && now - cache.lastAttempt < TITLE_GENERATION_COOLDOWN) {
        logger.info('标题生成冷却中，跳过', { chatId, remainingTime: TITLE_GENERATION_COOLDOWN - (now - cache.lastAttempt) });
        return;
      }

      if (cache && cache.attempts >= MAX_RETRY_ATTEMPTS) {
        logger.warn('标题生成重试次数已达上限，放弃', { chatId, attempts: cache.attempts });
        titleGenerationCache.delete(chatId);
        return;
      }

      // 更新缓存状态
      titleGenerationCache.set(chatId, {
        lastAttempt: now,
        attempts: (cache?.attempts || 0) + 1,
        isProcessing: true
      });

      logger.info('开始生成对话标题', { chatId, messagesCount: messages.length, attempt: titleGenerationCache.get(chatId)?.attempts });

      if (messages.length < 2) {
        logger.info('消息数量不足，跳过标题生成', { chatId, messagesCount: messages.length });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      // 获取用户的第一条消息和AI的第一条回复
      const firstUserMessage = messages.find(m => m.role === 'user');
      const firstAssistantMessage = messages.find(m => m.role === 'assistant');

      if (!firstUserMessage || !firstAssistantMessage) {
        logger.warn('找不到用户消息或AI回复消息', { chatId });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      // 从AI回复消息中获取使用的模型ID
      const usedModelId = firstAssistantMessage.modelId;
      logger.info('使用的模型ID', { chatId, usedModelId });

      // 构建对话上下文用于生成标题
      const contextMessage = `用户: ${firstUserMessage.content}\n\nAI: ${firstAssistantMessage.content}`;

      // 获取模型服务配置
      const modelServiceResponse = await fetch('/api/model-service/scenario?scenario=ai_chat');
      if (!modelServiceResponse.ok) {
        logger.error('获取模型服务配置失败', { chatId, status: modelServiceResponse.status });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      const modelServiceData = await modelServiceResponse.json();
      if (!modelServiceData.success) {
        logger.error('模型服务配置返回失败', { chatId, error: modelServiceData.error });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      // 确定目标模型
      const targetModelId = usedModelId || modelServiceData.scenario?.primaryModelId;
      if (!targetModelId) {
        logger.error('无法确定目标模型ID', { chatId, usedModelId, primaryModelId: modelServiceData.scenario?.primaryModelId });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      // 尝试通过内部 id 或 modelId 查找模型
      const targetModel = modelServiceData.models?.find((m: any) => m.id === targetModelId || m.modelId === targetModelId);
      if (!targetModel) {
        logger.error('找不到目标模型', { chatId, targetModelId, availableModels: modelServiceData.models?.map((m: any) => ({ id: m.id, modelId: m.modelId })) });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      const provider = modelServiceData.providers?.find((p: any) => p.id === targetModel?.providerId);
      if (!provider) {
        logger.error('找不到模型提供商', { chatId, providerId: targetModel?.providerId });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      if (!provider?.apiKey) {
        logger.error('提供商API密钥为空', { chatId, providerId: provider.id });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      if (!provider?.apiBaseUrl) {
        logger.error('提供商API基础URL为空', { chatId, providerId: provider.id });
        titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });
        return;
      }

      logger.info('准备调用标题生成API', {
        chatId,
        model: targetModel?.modelId || targetModel?.id,
        providerId: provider.id,
        apiBaseUrl: provider.apiBaseUrl
      });

      // 调用标题生成API
      const response = await fetch('/api/media/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel?.modelId || targetModel?.id || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: contextMessage }],
          apiKey: provider.apiKey,
          apiBaseUrl: provider.apiBaseUrl
        })
      });

      // 重置处理状态
      titleGenerationCache.set(chatId, { lastAttempt: now, attempts: cache?.attempts || 0, isProcessing: false });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('标题生成API调用频率过高，将在冷却后重试', { chatId, status: response.status });
          // 429 错误不需要重置尝试次数，允许重试
          return;
        }
        logger.error('标题生成API调用失败', { chatId, status: response.status });
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.title) {
        logger.info('标题生成成功', { chatId, title: data.data.title });
        // 清除缓存，因为标题已成功生成
        titleGenerationCache.delete(chatId);
        setChatHistories(prev => prev.map(chat =>
          chat.id === chatId ? { ...chat, title: data.data.title } : chat
        ));
      } else {
        logger.error('标题生成API返回失败', { chatId, data });
      }
    } catch (error) {
      logger.error('生成对话标题异常:', error);
      // 出现异常时重置处理状态
      const cache = titleGenerationCache.get(chatId);
      if (cache) {
        titleGenerationCache.set(chatId, { ...cache, isProcessing: false });
      }
    }
  }

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
      logger.error('删除对话失败:', error)
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
        logger.error('初始化聊天功能失败:', error)
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

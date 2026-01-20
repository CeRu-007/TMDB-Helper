import { useCallback } from 'react'
import { Message } from '@/types/ai-chat'
import { validateSuggestions } from '@/lib/utils/ai-chat-helpers'

interface UseAiChatHandlersProps {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  currentChatId: string | null
  selectedModel: string
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  setIsInterrupting: (interrupting: boolean) => void
  setMainAbortController: (controller: AbortController | null) => void
  createNewChat: () => Promise<string>
  updateCurrentChat: (messages: Message[], chatId?: string) => Promise<void>
  processStream: (response: Response, messageId: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>, scrollToLatestMessage: () => void) => Promise<string>
  scrollToLatestMessage: () => void
  getModelInfo: (modelId: string) => Promise<{ apiKey: string; modelId: string }>
}

export const useAiChatHandlers = ({
  messages,
  setMessages,
  currentChatId,
  selectedModel,
  isLoading,
  setIsLoading,
  setIsInterrupting,
  setMainAbortController,
  createNewChat,
  updateCurrentChat,
  processStream,
  scrollToLatestMessage,
  getModelInfo
}: UseAiChatHandlersProps) => {

  const fetchSuggestions = useCallback(async (lastMessage: string) => {
    const defaultSuggestions = ['深入探讨剧情细节', '了解世界观设定', '探索相关作品']
    
    try {
      const configResponse = await fetch('/api/system/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        return defaultSuggestions
      }

      const recentMessages = messages
        .filter(m => !m.isStreaming)
        .slice(-3)
        .map(m => ({ role: m.role, content: m.content }))

      const finalMessages = recentMessages.length > 0 ? recentMessages : [{ role: 'user', content: '开始对话' }]

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: (await getModelInfo(selectedModel)).modelId,
          messages: finalMessages,
          lastMessage,
          apiKey: (await getModelInfo(selectedModel)).apiKey
        })
      })

      if (!response.ok) return defaultSuggestions

      const data = await response.json()
      if (!data.success || !Array.isArray(data.data.suggestions)) return defaultSuggestions

      const validSuggestions = validateSuggestions(data.data.suggestions)
      return validSuggestions.length > 0 ? validSuggestions : defaultSuggestions
    } catch {
      return defaultSuggestions
    }
  }, [messages, selectedModel, getModelInfo])

  const sendAIRequest = useCallback(async (
    userContent: string,
    uploadedFileContent?: string | null,
    uploadedFileName?: string | null
  ) => {
    let chatId = currentChatId
    if (!chatId) {
      chatId = await createNewChat()
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      type: uploadedFileContent ? 'file' : 'text',
      ...(uploadedFileName && { fileName: uploadedFileName }),
      ...(uploadedFileContent && { fileContent: uploadedFileContent })
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    const updatedMessages = [...messages, userMessage, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false)

    const newAbortController = new AbortController()
    setMainAbortController(newAbortController)

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel)

      const conversationMessages = messages
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))

      if (uploadedFileContent) {
        conversationMessages.push({
          role: 'user',
          content: `字幕文件：${uploadedFileName}\n\n字幕内容：\n${uploadedFileContent}\n\n${userContent}`
        })
      } else {
        conversationMessages.push({ role: 'user', content: userContent })
      }

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ model: modelId, messages: conversationMessages, apiKey }),
        signal: newAbortController.signal
      })

      if (response.status === 429) {
        throw new Error('当前模型已达到调用上限，请切换其他模型或稍后再试')
      }

      if (!response.ok || !response.body) {
        throw new Error('AI回复失败')
      }

      const assistantAccumulated = await processStream(response, assistantMessage.id, setMessages, scrollToLatestMessage)
      const suggestions = await fetchSuggestions(assistantAccumulated)

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: assistantAccumulated, isStreaming: false, suggestions }
            : m
        )
        updateCurrentChat(finalMessages, chatId)
        return finalMessages
      })
      
      scrollToLatestMessage()
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prevMessages => {
          const interruptedMessages = prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: msg.content || '回复已被用户中断', isStreaming: false }
              : msg
          )
          updateCurrentChat(interruptedMessages, chatId)
          return interruptedMessages
        })
      } else {
        console.error('AI回复失败:', error)
        setMessages(prevMessages => {
          const errorMessages = prevMessages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: msg.content || `AI回复时出现错误：${error.message}`, isStreaming: false }
              : msg
          )
          updateCurrentChat(errorMessages, chatId)
          return errorMessages
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }, [currentChatId, messages, selectedModel, setMessages, setIsLoading, setIsInterrupting, setMainAbortController, createNewChat, getModelInfo, processStream, scrollToLatestMessage, updateCurrentChat, fetchSuggestions])

  const handleRegenerateResponse = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const userMessage = messages[messageIndex - 1]
    if (!userMessage || userMessage.role !== 'user') return

    const messagesBeforeRegenerate = messages.slice(0, messageIndex)
    
    const newAssistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: userMessage.type === 'file' ? 'episode-summary' : 'text',
      isStreaming: true
    }

    const updatedMessages = [...messagesBeforeRegenerate, newAssistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    const newAbortController = new AbortController()
    setMainAbortController(newAbortController)

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel)
      const conversationMessages = messagesBeforeRegenerate
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ model: modelId, messages: conversationMessages, apiKey }),
        signal: newAbortController.signal
      })

      if (!response.ok || !response.body) throw new Error('重新生成失败')

      const assistantAccumulated = await processStream(response, newAssistantMessage.id, setMessages, scrollToLatestMessage)
      const suggestions = await fetchSuggestions(assistantAccumulated)

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m =>
          m.id === newAssistantMessage.id
            ? { ...m, content: assistantAccumulated, isStreaming: false, suggestions }
            : m
        )
        updateCurrentChat(finalMessages)
        return finalMessages
      })
      
      scrollToLatestMessage()
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('重新生成失败:', error)
      }
    } finally {
      setIsLoading(false)
      setMainAbortController(null)
    }
  }, [messages, selectedModel, setMessages, setIsLoading, setMainAbortController, getModelInfo, processStream, scrollToLatestMessage, updateCurrentChat, fetchSuggestions])

  const handleContinueGeneration = useCallback(async (messageId: string) => {
    const newAssistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    setMessages([...messages, newAssistantMessage])
    setIsLoading(true)

    const newAbortController = new AbortController()
    setMainAbortController(newAbortController)

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel)
      const conversationMessages = messages
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))

      conversationMessages.push({ role: 'user', content: '继续' })

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ model: modelId, messages: conversationMessages, apiKey }),
        signal: newAbortController.signal
      })

      if (!response.ok || !response.body) throw new Error('继续生成失败')

      const assistantAccumulated = await processStream(response, newAssistantMessage.id, setMessages, scrollToLatestMessage)
      const suggestions = await fetchSuggestions(assistantAccumulated)

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m =>
          m.id === newAssistantMessage.id
            ? { ...m, content: assistantAccumulated, isStreaming: false, suggestions, canContinue: true }
            : m
        )
        updateCurrentChat(finalMessages)
        return finalMessages
      })
      
      scrollToLatestMessage()
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('继续生成失败:', error)
      }
    } finally {
      setIsLoading(false)
      setMainAbortController(null)
    }
  }, [messages, selectedModel, setMessages, setIsLoading, setMainAbortController, getModelInfo, processStream, scrollToLatestMessage, updateCurrentChat, fetchSuggestions])

  return {
    sendAIRequest,
    handleRegenerateResponse,
    handleContinueGeneration
  }
}

import { useCallback, useRef } from 'react'
import { Message } from '@/types/ai-chat'
import { SUBTITLE_TASKS } from '@/features/ai/lib/utils/ai-chat-constants'
import { toast } from 'sonner'

interface UseSubtitleTaskProps {
  currentChatId: string | null
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsLoading: (loading: boolean) => void
  setIsInterrupting: (interrupting: boolean) => void
  setMainAbortController: (controller: AbortController | null) => void
  createNewChat: () => Promise<string>
  getModelInfo: (modelId: string) => Promise<{ apiKey: string; modelId: string }>
  selectedModel: string
  processStream: (response: Response, messageId: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>, scrollToLatestMessage: () => void) => Promise<string>
  scrollToLatestMessage: () => void
  updateCurrentChat: (messages: Message[], chatId?: string) => Promise<void>
  fetchSuggestions: (lastMessage: string) => Promise<string[]>
}

export const useSubtitleTask = ({
  currentChatId,
  messages,
  setMessages,
  setIsLoading,
  setIsInterrupting,
  setMainAbortController,
  createNewChat,
  getModelInfo,
  selectedModel,
  processStream,
  scrollToLatestMessage,
  updateCurrentChat,
  fetchSuggestions
}: UseSubtitleTaskProps) => {
  
  const handleSubtitleTask = useCallback(async (
    taskKey: keyof typeof SUBTITLE_TASKS,
    subtitleContent: string,
    fileName: string
  ) => {
    const config = SUBTITLE_TASKS[taskKey]
    
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const messagesToAdd: Message[] = []
    
    if (config.includeUserMessage) {
      messagesToAdd.push({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `已上传字幕文件：${fileName}`,
        timestamp: new Date(),
        type: 'file',
        fileName: fileName,
        fileContent: subtitleContent
      })
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: config.messageType,
      isStreaming: true
    }
    
    messagesToAdd.push(assistantMessage)

    const updatedMessages = [...messages, ...messagesToAdd]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false)

    const newAbortController = new AbortController();
    setMainAbortController(newAbortController);

    try {
      const prompt = config.promptBuilder(subtitleContent, fileName)
      const modelInfo = await getModelInfo(selectedModel);

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: modelInfo.modelId,
          messages: [{ role: 'user', content: prompt }],
          apiKey: modelInfo.apiKey
        }),
        signal: newAbortController.signal
      })

      if (response.status === 429) {
        throw new Error('当前模型已达到调用上限，请切换其他模型或稍后再试');
      }

      if (!response.ok || !response.body) {
        let errMsg = `${config.errorPrefix}失败`;
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const assistantAccumulated = await processStream(response, assistantMessage.id, setMessages, scrollToLatestMessage);
      const suggestions = await fetchSuggestions(assistantAccumulated);

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m => {
          if (m.id === assistantMessage.id) {
            return {
              ...m,
              content: assistantAccumulated,
              isStreaming: false,
              suggestions
            };
          }
          return m;
        });
        
        updateCurrentChat(finalMessages, chatId);
        return finalMessages;
      });
      
      scrollToLatestMessage();
      toast.success(config.successMessage)

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        const interruptedMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: '回复已被用户中断',
              isStreaming: false
            }
          }
          return msg
        })
        setMessages(interruptedMessages)
        updateCurrentChat(interruptedMessages, chatId)
        toast.info('已中断AI回复')
      } else {
        console.error(`${config.taskName}失败:`, error)
        
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `${config.errorPrefix}时出现错误：${error instanceof Error ? error.message : String(error)}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error(`${config.taskName}失败`, {
          description: error instanceof Error ? error.message : String(error)
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }, [
    currentChatId,
    messages,
    setMessages,
    setIsLoading,
    setIsInterrupting,
    setMainAbortController,
    createNewChat,
    getModelInfo,
    selectedModel,
    processStream,
    scrollToLatestMessage,
    updateCurrentChat,
    fetchSuggestions
  ])

  return {
    handleSubtitleTask
  }
}

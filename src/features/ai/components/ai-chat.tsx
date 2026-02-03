"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { MessageSquare, Plus, PanelRight } from "lucide-react"
import { useUser } from "@/shared/components/user-identity-provider"
import { useScenarioModels } from "@/lib/hooks/useScenarioModels"
import { useModelService } from "@/lib/contexts/ModelServiceContext"
import { Message } from "@/types/ai-chat"
import { logger } from "@/lib/utils/logger"

import { useAiChatHistory } from "@/features/ai/lib/hooks/use-ai-chat-history"
import { useAiStreamResponse } from "@/features/ai/lib/hooks/use-ai-stream-response"
import { useAiMessageActions } from "@/features/ai/lib/hooks/use-ai-message-actions"
import { useSubtitleTask } from "@/features/ai/lib/hooks/use-subtitle-task"
import { useFileUpload } from "@/features/episode-generation/lib/hooks/use-file-upload"
import { useAiChatHandlers } from "@/features/ai/lib/hooks/use-ai-chat-handlers"
import { validateSuggestions } from "@/features/ai/lib/utils/ai-chat-helpers"

import { ChatSidebar } from "./chat-sidebar"
import { ChatMessages } from "./chat-messages"
import { ChatEmptyState } from "./chat-empty-state"
import { ChatInput } from "./chat-input"

export function AiChat() {
  const { userInfo } = useUser()
  const scenarioModels = useScenarioModels('ai_chat')
  const { getScenarioModels } = useModelService()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInterrupting, setIsInterrupting] = useState(false)
  const [mainAbortController, setMainAbortController] = useState<AbortController | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { processStream } = useAiStreamResponse()
  
  const {
    chatHistories,
    currentChatId,
    createNewChat,
    switchChat,
    deleteChat,
    updateCurrentChat
  } = useAiChatHistory(messages, setMessages)

  const {
    startEditMessage,
    cancelEditMessage,
    saveEditedMessage,
    copyMessage,
    deleteMessage,
    rateMessage
  } = useAiMessageActions(messages, setMessages, updateCurrentChat)

  const {
    uploadedFileContent,
    uploadedFileName,
    isUploading,
    uploadProgress,
    isDragOver,
    handleFileUpload: uploadFile,
    handleCancelUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearUpload
  } = useFileUpload()

  const scrollToBottom = useCallback((immediate: boolean = false) => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' })
    }
  }, [])

  const scrollToLatestMessage = useCallback(() => {
    requestAnimationFrame(() => scrollToBottom(true))
  }, [scrollToBottom])

  const getModelInfo = useCallback(async (modelId: string) => {
    const currentModel = scenarioModels.availableModels.find(m => m.id === modelId)
    if (!currentModel) throw new Error('请先选择一个AI模型')

    const aiChatData = getScenarioModels('ai_chat')
    const provider = aiChatData.providers.find(p => p.id === currentModel.providerId)
    if (!provider) throw new Error('找不到模型提供商配置')

    const apiKey = provider.apiKey
    if (!apiKey) throw new Error('请先在模型服务中配置API密钥')

    return {
      apiKey,
      modelId: currentModel.modelId || currentModel.id,
      apiBaseUrl: provider.apiBaseUrl
    }
  }, [scenarioModels, getScenarioModels])

  const fetchSuggestions = useCallback(async (lastMessage: string) => {
    const defaultSuggestions = ['深入探讨剧情细节', '了解世界观设定', '探索相关作品']

    try {
      logger.info('开始获取建议 (ai-chat)', { lastMessageLength: lastMessage?.length, messagesCount: messages.length })

      const recentMessages = messages
        .filter(m => !m.isStreaming)
        .slice(-3)
        .map(m => ({ role: m.role, content: m.content }))

      const finalMessages = recentMessages.length > 0 ? recentMessages : [{ role: 'user', content: '开始对话' }]

      logger.debug('准备调用建议API', { finalMessagesCount: finalMessages.length, selectedModel })

      const modelInfo = await getModelInfo(selectedModel)
      logger.debug('获取模型信息成功', { modelId: modelInfo.modelId, hasApiKey: !!modelInfo.apiKey, hasApiBaseUrl: !!modelInfo.apiBaseUrl })

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelInfo.modelId,
          messages: finalMessages,
          lastMessage,
          apiKey: modelInfo.apiKey,
          apiBaseUrl: modelInfo.apiBaseUrl
        })
      })

      if (!response.ok) {
        logger.warn('获取建议失败', { status: response.status })
        return defaultSuggestions
      }

      const data = await response.json()
      logger.debug('建议API返回', { success: data.success, hasSuggestions: Array.isArray(data.data?.suggestions) })

      if (!data.success || !Array.isArray(data.data.suggestions)) {
        logger.warn('建议返回格式错误', { data })
        return defaultSuggestions
      }

      const validSuggestions = validateSuggestions(data.data.suggestions)
      logger.info('获取建议成功', { count: validSuggestions.length, suggestions: validSuggestions })
      return validSuggestions.length > 0 ? validSuggestions : defaultSuggestions
    } catch (error) {
      logger.error('获取建议异常:', error)
      return defaultSuggestions
    }
  }, [messages, selectedModel, getModelInfo])

  const {
    sendAIRequest,
    handleRegenerateResponse,
    handleContinueGeneration
  } = useAiChatHandlers({
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
    getModelInfo,
    fetchSuggestions
  })

  const { handleSubtitleTask } = useSubtitleTask({
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
  })

  useEffect(() => {
    if (scenarioModels.availableModels.length > 0) {
      if (!selectedModel || !scenarioModels.availableModels.find(m => m.id === selectedModel)) {
        const primaryModel = scenarioModels.getCurrentModel()
        if (primaryModel) setSelectedModel(primaryModel.id)
      }
    }
  }, [scenarioModels.availableModels, scenarioModels.primaryModelId, selectedModel])

  useEffect(() => {
    if (messages.length === 0) return
    const hasStreamingMessage = messages.some(m => m.isStreaming)
    const rafId = requestAnimationFrame(() => {
      hasStreamingMessage ? scrollToLatestMessage() : scrollToBottom(false)
    })
    return () => cancelAnimationFrame(rafId)
  }, [messages, scrollToBottom, scrollToLatestMessage])

  useEffect(() => {
    return () => {
      if (mainAbortController && !mainAbortController.signal.aborted) {
        mainAbortController.abort('Component unmounted')
      }
    }
  }, [mainAbortController])

  const handleFileUploadEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !uploadedFileContent) || isLoading) return
    
    const content = uploadedFileContent && uploadedFileName
      ? (inputValue.trim() || `已上传字幕文件：${uploadedFileName}`)
      : inputValue.trim()
    
    await sendAIRequest(content, uploadedFileContent, uploadedFileName)
    setInputValue('')
    clearUpload()
  }

  const handleQuickReply = async (content: string) => {
    if (!content.trim() || isLoading) return
    await sendAIRequest(content)
  }

  const handleInterrupt = useCallback(() => {
    if (mainAbortController && !mainAbortController.signal.aborted) {
      setIsInterrupting(true)
      mainAbortController.abort('User interrupted')
    }
  }, [mainAbortController])

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const handleSaveEdit = async (messageId: string) => {
    await saveEditedMessage(messageId, async (content, index) => {
      const messagesBeforeEdit = messages.slice(0, index + 1)
      setMessages(messagesBeforeEdit)
      await sendAIRequest(content)
    })
    setEditingMessageId(null)
    setEditingContent('')
  }

  const handleSubtitleTaskWrapper = (taskKey: string, content: string, fileName: string) => {
    handleSubtitleTask(taskKey as any, content, fileName)
    clearUpload()
    setInputValue('')
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-950 overflow-hidden relative">
      {isSidebarCollapsed && (
        <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
          <Button
            onClick={() => setIsSidebarCollapsed(false)}
            className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            variant="ghost"
          >
            <PanelRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            onClick={createNewChat}
            className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative"
            variant="ghost"
          >
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400 absolute bottom-1.5 right-1.5 bg-white dark:bg-gray-950 rounded-full" />
          </Button>
        </div>
      )}

      <ChatSidebar
        chatHistories={chatHistories}
        currentChatId={currentChatId}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onCreateNewChat={createNewChat}
        onSwitchChat={switchChat}
        onDeleteChat={deleteChat}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            <ChatEmptyState onUploadClick={() => fileInputRef.current?.click()} />
          ) : (
            <ChatMessages
              messages={messages}
              editingMessageId={editingMessageId}
              editingContent={editingContent}
              userInfo={userInfo}
              isLoading={isLoading}
              currentChatId={currentChatId}
              selectedModel={selectedModel}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onSetEditingContent={setEditingContent}
              onCopyMessage={copyMessage}
              onDeleteMessage={deleteMessage}
              onRegenerateResponse={handleRegenerateResponse}
              onContinueGeneration={handleContinueGeneration}
              onRateMessage={rateMessage}
              onQuickReply={handleQuickReply}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        <ChatInput
          inputValue={inputValue}
          isLoading={isLoading}
          isInterrupting={isInterrupting}
          isDragOver={isDragOver}
          uploadedFileName={uploadedFileName}
          uploadedFileContent={uploadedFileContent}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          selectedModel={selectedModel}
          scenarioModels={scenarioModels}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onInterrupt={handleInterrupt}
          onFileUpload={handleFileUploadEvent}
          onCancelUpload={handleCancelUpload}
          onModelChange={setSelectedModel}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, fileInputRef)}
          onSubtitleTask={handleSubtitleTaskWrapper}
          fileInputRef={fileInputRef}
          textareaRef={textareaRef}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.ass,.vtt,.ssa,.sub"
        onChange={handleFileUploadEvent}
        className="hidden"
      />
    </div>
  )
}

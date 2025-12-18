import React, { useRef } from 'react'
import { ScrollArea } from "@/components/common/scroll-area"
import { ChatMessageItem } from "./chat-message-item"
import { Message } from "@/types/ai-chat"

interface ChatMessagesProps {
  messages: Message[]
  editingMessageId: string | null
  editingContent: string
  userInfo: any
  isLoading: boolean
  currentChatId: string | null
  selectedModel: string
  onStartEdit: (messageId: string, content: string) => void
  onCancelEdit: () => void
  onSaveEdit: (messageId: string, callback?: (content: string, index: number) => Promise<void>) => void
  onSetEditingContent: (content: string) => void
  onCopyMessage: (content: string) => void
  onDeleteMessage: (messageId: string) => void
  onRegenerateResponse: (messageId: string) => void
  onContinueGeneration: (messageId: string) => void
  onRateMessage: (messageId: string, rating: 'like' | 'dislike' | null, chatId: string | null, model: string) => void
  onQuickReply: (content: string) => void
  scrollAreaRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export function ChatMessages({
  messages,
  editingMessageId,
  editingContent,
  userInfo,
  isLoading,
  currentChatId,
  selectedModel,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetEditingContent,
  onCopyMessage,
  onDeleteMessage,
  onRegenerateResponse,
  onContinueGeneration,
  onRateMessage,
  onQuickReply,
  scrollAreaRef,
  messagesEndRef
}: ChatMessagesProps) {
  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="max-w-4xl mx-auto py-6">
        {messages.map((message, index) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            isLastMessage={index === messages.length - 1}
            isEditing={editingMessageId === message.id}
            editingContent={editingContent}
            userInfo={userInfo}
            isLoading={isLoading}
            currentChatId={currentChatId}
            selectedModel={selectedModel}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onSetEditingContent={onSetEditingContent}
            onCopyMessage={onCopyMessage}
            onDeleteMessage={onDeleteMessage}
            onRegenerateResponse={onRegenerateResponse}
            onContinueGeneration={onContinueGeneration}
            onRateMessage={onRateMessage}
            onQuickReply={onQuickReply}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}

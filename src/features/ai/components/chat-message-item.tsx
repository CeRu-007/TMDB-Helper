import React from 'react'
import { UserAvatarImage } from "@/shared/components/ui/smart-avatar"
import { Bot } from "lucide-react"
import { Message } from "@/types/ai-chat"
import { MessageContent } from "./molecules/message-content"
import { MessageActions } from "./molecules/message-actions"
import { MessageEditor } from "./molecules/message-editor"
import { SuggestionList } from "./molecules/suggestion-list"

interface ChatMessageItemProps {
  message: Message
  isLastMessage: boolean
  isEditing: boolean
  editingContent: string
  userInfo: any
  isLoading: boolean
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
  currentChatId: string | null
  selectedModel: string
}

export function ChatMessageItem({
  message,
  isLastMessage,
  isEditing,
  editingContent,
  userInfo,
  isLoading,
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
  currentChatId,
  selectedModel
}: ChatMessageItemProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div key={message.id} className="flex gap-3 py-4 justify-end group">
        <div className="max-w-[70%] md:max-w-[60%] space-y-2 items-end">
          {isEditing ? (
            <MessageEditor
              content={editingContent}
              role="user"
              onContentChange={onSetEditingContent}
              onSave={() => onSaveEdit(message.id)}
              onCancel={onCancelEdit}
              isSaveDisabled={!editingContent.trim()}
            />
          ) : (
            <>
              <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 ml-auto transition-all hover:shadow-md">
                <MessageContent
                  content={message.content}
                  type={message.type}
                  fileName={message.fileName}
                  isEdited={message.isEdited}
                  role="user"
                />
              </div>
              <MessageActions
                messageId={message.id}
                messageRole="user"
                isLastMessage={false}
                isLoading={isLoading}
                onCopy={() => onCopyMessage(message.content)}
                onEdit={() => onStartEdit(message.id, message.content)}
                onDelete={() => onDeleteMessage(message.id)}
              />
            </>
          )}
        </div>
        <div className="flex-shrink-0">
          <UserAvatarImage
            src={userInfo?.avatarUrl}
            displayName={userInfo?.displayName || "用户"}
            className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
          />
        </div>
      </div>
    )
  }

  return (
    <div key={message.id} className={`group ${!message.isStreaming && message.role === 'assistant' && isLastMessage ? 'pb-3' : 'py-3'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">AI助手</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{message.timestamp.toLocaleTimeString()}</div>
      </div>
      
      <div>
        {isEditing ? (
          <MessageEditor
            content={editingContent}
            role="assistant"
            onContentChange={onSetEditingContent}
            onSave={() => onSaveEdit(message.id)}
            onCancel={onCancelEdit}
            isSaveDisabled={!editingContent.trim()}
          />
        ) : (
          <>
            <MessageContent
              content={message.content}
              type={message.type}
              fileName={message.fileName}
              isStreaming={message.isStreaming}
              isEdited={message.isEdited}
              role="assistant"
            />
            
            {!message.isStreaming && (
              <MessageActions
                messageId={message.id}
                messageRole="assistant"
                messageRating={message.rating}
                isLastMessage={isLastMessage}
                isLoading={isLoading}
                onCopy={() => onCopyMessage(message.content)}
                onEdit={() => onStartEdit(message.id, message.content)}
                onDelete={() => onDeleteMessage(message.id)}
                onRegenerate={() => onRegenerateResponse(message.id)}
                onContinue={() => onContinueGeneration(message.id)}
                onRate={(rating) => onRateMessage(message.id, rating, currentChatId, selectedModel)}
              />
            )}
            
            {!message.isStreaming && message.role === 'assistant' && isLastMessage && (
              <SuggestionList
                suggestions={message.suggestions}
                onSuggestionClick={onQuickReply}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

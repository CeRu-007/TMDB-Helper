import React from 'react'
import { Button } from "@/components/common/button"
import { ScrollArea } from "@/components/common/scroll-area"
import { MessageSquare, PanelLeft, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatHistory } from "@/types/ai-chat"
import { formatChatDate, truncateText } from "@/lib/utils/ai-chat-helpers"

interface ChatSidebarProps {
  chatHistories: ChatHistory[]
  currentChatId: string | null
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onCreateNewChat: () => void
  onSwitchChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

export function ChatSidebar({
  chatHistories,
  currentChatId,
  isSidebarCollapsed,
  onToggleSidebar,
  onCreateNewChat,
  onSwitchChat,
  onDeleteChat
}: ChatSidebarProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300",
      isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100"
    )}>
      <div className="p-3 flex items-center gap-2">
        <Button
          onClick={onToggleSidebar}
          className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
          variant="ghost"
        >
          <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Button>
        <Button
          onClick={onCreateNewChat}
          className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 rounded-lg font-medium"
          variant="outline"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          新对话
        </Button>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {chatHistories.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
                currentChatId === chat.id
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
              onClick={() => onSwitchChat(chat.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" title={chat.title}>
                      {truncateText(chat.title, 11)}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {formatChatDate(chat.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                >
                  <Trash2 className="w-3 h-3 text-gray-500" />
                </Button>
              </div>
            </div>
          ))}
          
          {chatHistories.length === 0 && (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                暂无对话历史
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                开始新对话来生成分集简介
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

import React from 'react'
import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/shared/components/ui/sheet"
import { MessageSquare, PanelLeft, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatHistory } from "@/types/ai-chat"
import { formatChatDate, truncateText } from "@/lib/utils/ai-chat-helpers"
import { useMobile } from "@/shared/hooks/use-mobile"
import { useTranslation } from "react-i18next"

interface ChatSidebarProps {
  chatHistories: ChatHistory[]
  currentChatId: string | null
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onCreateNewChat: () => void
  onSwitchChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}

function SidebarContent({
  chatHistories,
  currentChatId,
  onToggleSidebar,
  onCreateNewChat,
  onSwitchChat,
  onDeleteChat
}: {
  chatHistories: ChatHistory[]
  currentChatId: string | null
  onToggleSidebar: () => void
  onCreateNewChat: () => void
  onSwitchChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
}) {
  const { t } = useTranslation("ai-chat")
  return (
    <>
      <div className="p-3 flex items-center gap-2">
        <Button
          onClick={onToggleSidebar}
          className="h-10 w-10 p-0 hover:bg-accent rounded-lg flex-shrink-0"
          variant="ghost"
        >
          <PanelLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button
          onClick={onCreateNewChat}
          className="flex-1 h-10 bg-muted hover:bg-accent text-foreground border-0 rounded-lg font-medium"
          variant="outline"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("newConversation")}
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
                  ? "bg-muted"
                  : "hover:bg-accent"
              )}
              onClick={() => onSwitchChat(chat.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-medium text-sm text-foreground truncate" title={chat.title}>
                      {truncateText(chat.title, 11)}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatChatDate(chat.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          
          {chatHistories.length === 0 && (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("noConversationHistory")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("startNewConversation")}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  )
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
  const isMobile = useMobile()

  if (isMobile) {
    return (
      <Sheet open={!isSidebarCollapsed} onOpenChange={(open) => { if (!open) onToggleSidebar() }}>
        <SheetContent side="left" className="w-72 p-0 [&>button:last-child]:hidden">
          <div className="flex flex-col h-full">
            <SidebarContent
              chatHistories={chatHistories}
              currentChatId={currentChatId}
              onToggleSidebar={onToggleSidebar}
              onCreateNewChat={onCreateNewChat}
              onSwitchChat={onSwitchChat}
              onDeleteChat={onDeleteChat}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className={cn(
      "bg-background border-r border-border flex flex-col transition-all duration-300",
      isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100"
    )}>
      <SidebarContent
        chatHistories={chatHistories}
        currentChatId={currentChatId}
        onToggleSidebar={onToggleSidebar}
        onCreateNewChat={onCreateNewChat}
        onSwitchChat={onSwitchChat}
        onDeleteChat={onDeleteChat}
      />
    </div>
  )
}

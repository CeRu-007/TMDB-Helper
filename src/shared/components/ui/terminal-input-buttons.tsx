"use client"

import { Button } from "@/components/common/button"
import { CornerDownLeft, Loader2 } from "lucide-react"
import { useState } from "react"

interface TerminalInputButtonsProps {
  processId: number | null
  onSendCommand?: (command: string) => Promise<void>
  disabled?: boolean
}

export function TerminalInputButtons({ 
  processId, 
  onSendCommand, 
  disabled = false 
}: TerminalInputButtonsProps) {
  const [isSending, setIsSending] = useState(false)
  
  // 简化为只发送回车
  const sendEnter = async () => {
    if (isSending) {
      
      return;
    }
    
    setIsSending(true)
    
    try {
      const response = await fetch("/api/commands/send-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          processId,
          input: "\n",
          sendDirectly: true
        }),
      })
      
      if (response.ok) {
        
        if (onSendCommand) {
          await onSendCommand("\n")
        }
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setTimeout(() => {
        setIsSending(false)
      }, 500)
    }
  }
  
  return (
    <div className="mt-2 border-t border-gray-800 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">终端控制:</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={sendEnter}
          disabled={disabled || isSending}
          className="bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          {isSending ? (
            <span className="flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              发送中...
            </span>
          ) : (
            <>
              <CornerDownLeft className="h-3.5 w-3.5 mr-1" />
              发送回车
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 
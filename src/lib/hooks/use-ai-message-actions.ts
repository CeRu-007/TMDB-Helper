import { useState, useCallback, useRef } from 'react'
import { Message } from '@/types/ai-chat'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export const useAiMessageActions = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  updateCurrentChat: (messages: Message[]) => Promise<void>
) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const startEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    
    setTimeout(() => {
      if (editTextareaRef.current) {
        const textarea = editTextareaRef.current
        textarea.focus()
        textarea.setSelectionRange(content.length, content.length)
        textarea.scrollTop = textarea.scrollHeight
      }
    }, 100)
  }, [])

  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent('')
  }, [])

  const saveEditedMessage = useCallback(async (messageId: string, onRegenerate?: (content: string, messageIndex: number) => Promise<void>) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const originalMessage = messages[messageIndex]
    
    const updatedMessages = messages.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          content: editingContent,
          isEdited: true,
          originalContent: originalMessage.content
        }
      }
      return m
    })

    if (originalMessage.role === 'user' && onRegenerate) {
      const messagesBeforeEdit = updatedMessages.slice(0, messageIndex + 1)
      setMessages(messagesBeforeEdit)
      setEditingMessageId(null)
      setEditingContent('')

      await onRegenerate(editingContent, messageIndex)
    } else {
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      setEditingMessageId(null)
      setEditingContent('')
      toast.success('消息已更新')
    }
  }, [messages, editingContent, setMessages, updateCurrentChat])

  const deleteMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const messageToDelete = messages[messageIndex]
    
    if (messageToDelete.role === 'user') {
      const updatedMessages = messages.slice(0, messageIndex)
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      toast.success('消息及后续回复已删除')
    } else {
      const updatedMessages = messages.filter(m => m.id !== messageId)
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      toast.success('消息已删除')
    }
  }, [messages, setMessages, updateCurrentChat])

  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('已复制到剪贴板')
    } catch (error) {
      toast.error('复制失败')
    }
  }, [])

  const rateMessage = useCallback(async (messageId: string, rating: 'like' | 'dislike' | null, currentChatId: string | null, selectedModel: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const updatedMessages = messages.map(m => {
      if (m.id === messageId) {
        const newRating = m.rating === rating ? null : rating
        return {
          ...m,
          rating: newRating
        }
      }
      return m
    })

    setMessages(updatedMessages)
    await updateCurrentChat(updatedMessages)
    
    if (rating && message.rating !== rating) {
      try {
        const feedbackData = {
          messageId,
          rating,
          content: message.content,
          timestamp: new Date().toISOString(),
          chatId: currentChatId,
          model: selectedModel
        }
        
        const existingFeedback = localStorage.getItem('ai-chat-feedback')
        const feedbackList = existingFeedback ? JSON.parse(existingFeedback) : []
        feedbackList.push(feedbackData)
        localStorage.setItem('ai-chat-feedback', JSON.stringify(feedbackList))
      } catch (error) {
        logger.error('保存反馈数据失败:', error)
      }
    }
    
    if (rating === 'like') {
      toast.success('感谢您的反馈！', {
        description: '您的评价帮助我们改进AI回复质量'
      })
    } else if (rating === 'dislike') {
      toast.info('感谢反馈', {
        description: '我们会分析并改进回复质量'
      })
    } else {
      toast.info('已取消评分')
    }
  }, [messages, setMessages, updateCurrentChat])

  return {
    editingMessageId,
    editingContent,
    editTextareaRef,
    setEditingContent,
    startEditMessage,
    cancelEditMessage,
    saveEditedMessage,
    deleteMessage,
    copyMessage,
    rateMessage
  }
}

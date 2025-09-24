"use client"

import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatarImage } from "@/components/ui/smart-avatar"
import { useUser } from "@/components/user-identity-provider"
import { Markdown } from "@/components/ui/markdown"
import { toast } from "sonner"
import {
  Send,
  Paperclip,
  Bot,
  User,
  Loader2,
  Settings,
  Trash2,
  Download,
  Upload,
  MessageSquare,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  PanelLeft,
  PanelRight,
  X,
  Pause
} from "lucide-react"
import { cn } from "@/lib/utils"

// 消息类型定义
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'file' | 'episode-summary'
  fileName?: string
  fileContent?: string
  isStreaming?: boolean
  // 引导Chips - 由模型返回的建议内容
  suggestions?: string[]
}

// 对话历史类型定义
interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// 模型配置 - 根据魔搭社区API支持的模型
const AVAILABLE_MODELS = [
  {
    id: 'deepseek-ai/DeepSeek-V3.1',
    name: 'DeepSeek-V3.1',
    description: '强大的推理和创作能力',
    icon: '🧠',
    isThinking: true // 支持思考模式
  },
  {
    id: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
    name: 'Qwen3-Next-80B',
    description: '优秀的中文理解能力',
    icon: '🎯',
    isThinking: false
  }
]

// 支持的字幕文件格式
const SUPPORTED_SUBTITLE_FORMATS = ['.srt', '.ass', '.vtt', '.ssa', '.sub']

// 单个消息项组件
const MessageItem = React.memo(({
  message,
  userInfo,
  selectedModel,
  isLoading,
  messages,
  currentChatId,
  createNewChat,
  setMessages,
  setIsLoading,
  updateCurrentChat,
  copyMessage,
  regenerateUserMessage,
  regenerateResponse,
  fetchSuggestions,
  scrollToLatestMessage
}: {
  message: Message;
  userInfo: any;
  selectedModel: string;
  isLoading: boolean;
  messages: Message[];
  currentChatId: string | null;
  createNewChat: () => Promise<string>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  updateCurrentChat: (newMessages: Message[], chatId?: string) => Promise<void>;
  copyMessage: (content: string) => void;
  regenerateUserMessage: (messageId: string) => void;
  regenerateResponse: (messageId: string) => void;
  fetchSuggestions: (lastMessage: string) => Promise<string[]>;
  scrollToLatestMessage: () => void;
}) => {
  // 消息容器的引用
  const messageRef = useRef<HTMLDivElement>(null);
  
  return (
    <div ref={messageRef} className="flex flex-col gap-3">
      {/* 消息头 */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {message.role === 'user' ? (
            <UserAvatarImage className="w-5 h-5" userInfo={userInfo} />
          ) : (
            <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {message.role === 'user' ? '你' : 'AI助手'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* 消息内容 */}
      <div className="flex flex-col gap-3 ml-11">
        {message.type === 'file' ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Paperclip className="w-4 h-4" />
              <span className="font-medium">{message.fileName}</span>
            </div>
            <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
              {message.isStreaming ? (
                <div>
                  <Markdown>{message.content}</Markdown>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在生成回复...</span>
                  </div>
                </div>
              ) : (
                <div>
                  <Markdown>{message.content}</Markdown>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
            {message.isStreaming ? (
              <div>
                <Markdown>{message.content}</Markdown>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在生成回复...</span>
                </div>
              </div>
            ) : (
              <div>
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </div>
        )}
        
        {/* 操作按钮 - 用户消息底部右下角，AI消息底部左下角 */}
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-1`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => copyMessage(message.content)}
            title="复制"
          >
            <Copy className="w-4 h-4 text-gray-500" />
          </Button>
          {message.role === 'user' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => regenerateUserMessage(message.id)}
              disabled={isLoading}
              title="重新生成"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
            </Button>
          )}
          {message.role === 'assistant' && !message.isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => regenerateResponse(message.id)}
              disabled={isLoading}
              title="重新生成"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
            </Button>
          )}
        </div>
        
        {/* 动态生成的引导Chips */}
        {!message.isStreaming && message.role === 'assistant' && (
          <div className="space-y-1 mt-6">
            <div className="flex flex-col gap-2">
              {/* 固定的"一句话概括剧情"选项 */}
              <button
                className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                onClick={() => {
                  // 直接发送，不经过输入框 - 完整实现发送逻辑
                  const handleDirectSend = async () => {
                    const content = "一句话概括剧情"
                    
                    // 如果没有当前对话，创建新对话
                    let chatId = currentChatId;
                    if (!chatId) {
                      chatId = await createNewChat();
                    }
                    
                    const userMessage: Message = {
                      id: `msg-${Date.now()}`,
                      role: 'user',
                      content: content,
                      timestamp: new Date(),
                      type: 'text'
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
                    
                    try {
                      // 获取API配置
                      const configResponse = await fetch('/api/config')
                      const configData = await configResponse.json()
                      
                      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                        throw new Error('请先在设置中配置魔搭社区API密钥')
                      }
                      
                      const config = configData.fullConfig
                      
                      // 构建对话历史
                      const conversationMessages = messages
                        .filter(m => !m.isStreaming)
                        .map(m => ({
                          role: m.role,
                          content: m.content
                        }))
                      
                      conversationMessages.push({
                        role: 'user',
                        content: content
                      })
                      
                      // 使用流式API而不是普通API
                      const response = await fetch('/api/ai-chat/stream', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                        body: JSON.stringify({
                          model: selectedModel,
                          messages: conversationMessages,
                          apiKey: config.modelScopeApiKey
                        })
                      })
                      
                      if (!response.ok || !response.body) {
                        let errMsg = 'AI回复失败';
                        try {
                          const e = await response.json();
                          errMsg = e?.error || errMsg;
                        } catch {}
                        throw new Error(errMsg);
                      }
                      
                      const reader = response.body.getReader();
                      const decoder = new TextDecoder();
                      let assistantAccumulated = '';
                      let buffer = ''; // 用于累积token的缓冲区
                      let lastUpdate = Date.now(); // 上次更新时间
                      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                      try {
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          const chunk = decoder.decode(value, { stream: true });

                          // SSE: 按行解析
                          const lines = chunk.split('\n');
                          for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            if (trimmed.startsWith(':')) continue; // 注释行
                            if (!trimmed.startsWith('data:')) continue;

                            const dataStr = trimmed.slice(5).trim();
                            if (dataStr === '[DONE]') {
                              continue;
                            }

                            try {
                              const parsed = JSON.parse(dataStr);
                              const delta = parsed?.choices?.[0]?.delta;
                              if (delta) {
                                const token = delta.content || '';
                                if (token) {
                                  assistantAccumulated += token;
                                  buffer += token;
                                  
                                  // 根据内容长度动态调整更新策略
                                  const contentLength = assistantAccumulated.length;
                                  let updateInterval = BASE_UPDATE_INTERVAL;
                                  let bufferSize = BASE_BUFFER_SIZE;
                                  
                                  // 内容越多，更新间隔越长，缓冲区越大
                                  if (contentLength > 1000) {
                                    updateInterval = 100;
                                    bufferSize = 20;
                                  }
                                  if (contentLength > 3000) {
                                    updateInterval = 150;
                                    bufferSize = 30;
                                  }
                                  if (contentLength > 5000) {
                                    updateInterval = 200;
                                    bufferSize = 40;
                                  }
                                  
                                  // 检查是否需要更新UI
                                  const now = Date.now();
                                  const shouldUpdate = 
                                    buffer.length >= bufferSize || // 缓冲区满
                                    now - lastUpdate >= updateInterval || // 时间间隔到了
                                    contentLength < 100; // 内容较少时保持流畅性
                                  
                                  if (shouldUpdate) {
                                    // 实时更新消息 - 使用 flushSync 确保立即更新
                                    flushSync(() => {
                                      setMessages(prev => prev.map(m => {
                                        if (m.id === assistantMessage.id) {
                                          return { ...m, content: assistantAccumulated, isStreaming: true };
                                        }
                                        return m;
                                      }));
                                    });
                                    // 重置缓冲区和时间
                                    buffer = '';
                                    lastUpdate = now;
                                    
                                    // 立即滚动到最新消息
                                    scrollToLatestMessage();
                                  }
                                }
                              }
                            } catch (e) {
                              console.log('解析JSON失败:', dataStr, e);
                            }
                          }
                        }
                        
                        // 流结束时，确保所有内容都已更新到UI
                        if (buffer.length > 0) {
                          flushSync(() => {
                            setMessages(prev => prev.map(m => {
                              if (m.id === assistantMessage.id) {
                                return { ...m, content: assistantAccumulated, isStreaming: true };
                              }
                              return m;
                            }));
                          });
                        }
                      } finally {
                        try { reader.releaseLock(); } catch {}
                      }

                      // 完成后关闭流式标记并生成建议
                      const suggestions = await fetchSuggestions(assistantAccumulated);

                      // 使用函数式更新确保使用最新的消息状态
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
                        
                        return finalMessages;
                      });
                      
                      // 更新当前对话
                      setTimeout(() => {
                        setMessages(prevMessages => {
                          updateCurrentChat(prevMessages, currentChatId);
                          return prevMessages;
                        });
                      }, 0);

                    } catch (error: any) {
                      console.error('发送消息失败:', error)
                      
                      // 更新错误消息
                      const errorMessages = updatedMessages.map(msg => {
                        if (msg.id === assistantMessage.id) {
                          return {
                            ...msg,
                            content: `回复时出现错误：${error.message}`,
                            isStreaming: false
                          }
                        }
                        return msg
                      })
                      
                      setMessages(errorMessages)
                      updateCurrentChat(errorMessages, currentChatId)
                      
                      toast.error('发送失败', {
                        description: error.message
                      })
                    } finally {
                      setIsLoading(false)
                    }
                  }
                  
                  handleDirectSend()
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">一句话概括剧情</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                </div>
              </button>
              
              {/* 动态生成的建议选项 - 确保始终显示至少两个选项 */}
              {message.suggestions && message.suggestions.length > 0 ? (
                message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                    onClick={() => {
                      const handleDirectSend = async () => {
                        const content = suggestion
                        
                        // 如果没有当前对话，创建新对话
                        let chatId = currentChatId;
                        if (!chatId) {
                          chatId = await createNewChat();
                        }
                        
                        const userMessage: Message = {
                          id: `msg-${Date.now()}`,
                          role: 'user',
                          content: content,
                          timestamp: new Date(),
                          type: 'text'
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
                        
                        try {
                          // 获取API配置
                          const configResponse = await fetch('/api/config')
                          const configData = await configResponse.json()
                          
                          if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                            throw new Error('请先在设置中配置魔搭社区API密钥')
                          }
                          
                          const config = configData.fullConfig
                          
                          // 构建对话历史
                          const conversationMessages = messages
                            .filter(m => !m.isStreaming)
                            .map(m => ({
                              role: m.role,
                              content: m.content
                            }))
                          
                          conversationMessages.push({
                            role: 'user',
                            content: content
                          })
                          
                          // 使用流式API而不是普通API
                          const response = await fetch('/api/ai-chat/stream', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                            body: JSON.stringify({
                              model: selectedModel,
                              messages: conversationMessages,
                              apiKey: config.modelScopeApiKey
                            })
                          })
                          
                          if (!response.ok || !response.body) {
                            let errMsg = 'AI回复失败';
                            try {
                              const e = await response.json();
                              errMsg = e?.error || errMsg;
                            } catch {}
                            throw new Error(errMsg);
                          }
                          
                          const reader = response.body.getReader();
                          const decoder = new TextDecoder();
                          let assistantAccumulated = '';
                          let buffer = ''; // 用于累积token的缓冲区
                          let lastUpdate = Date.now(); // 上次更新时间
                          const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                          const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                          try {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });

                              // SSE: 按行解析
                              const lines = chunk.split('\n');
                              for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;
                                if (trimmed.startsWith(':')) continue; // 注释行
                                if (!trimmed.startsWith('data:')) continue;

                                const dataStr = trimmed.slice(5).trim();
                                if (dataStr === '[DONE]') {
                                  continue;
                                }

                                try {
                                  const parsed = JSON.parse(dataStr);
                                  const delta = parsed?.choices?.[0]?.delta;
                                  if (delta) {
                                    const token = delta.content || '';
                                    if (token) {
                                      assistantAccumulated += token;
                                      buffer += token;
                                      
                                      // 根据内容长度动态调整更新策略
                                      const contentLength = assistantAccumulated.length;
                                      let updateInterval = BASE_UPDATE_INTERVAL;
                                      let bufferSize = BASE_BUFFER_SIZE;
                                      
                                      // 内容越多，更新间隔越长，缓冲区越大
                                      if (contentLength > 1000) {
                                        updateInterval = 100;
                                        bufferSize = 20;
                                      }
                                      if (contentLength > 3000) {
                                        updateInterval = 150;
                                        bufferSize = 30;
                                      }
                                      if (contentLength > 5000) {
                                        updateInterval = 200;
                                        bufferSize = 40;
                                      }
                                      
                                      // 检查是否需要更新UI
                                      const now = Date.now();
                                      const shouldUpdate = 
                                        buffer.length >= bufferSize || // 缓冲区满
                                        now - lastUpdate >= updateInterval || // 时间间隔到了
                                        contentLength < 100; // 内容较少时保持流畅性
                                      
                                      if (shouldUpdate) {
                                        // 实时更新消息 - 使用 flushSync 确保立即更新
                                        flushSync(() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === assistantMessage.id) {
                                              return { ...m, content: assistantAccumulated, isStreaming: true };
                                            }
                                            return m;
                                          }));
                                        });
                                        // 重置缓冲区和时间
                                        buffer = '';
                                        lastUpdate = now;
                                        
                                        // 立即滚动到最新消息，确保流式输出可见
                                        scrollToLatestMessage();
                                      }
                                    }
                                  }
                                } catch (e) {
                                  console.log('解析JSON失败:', dataStr, e);
                                }
                              }
                            }
                            
                            // 流结束时，确保所有内容都已更新到UI
                            if (buffer.length > 0) {
                              flushSync(() => {
                                setMessages(prev => prev.map(m => {
                                  if (m.id === assistantMessage.id) {
                                    return { ...m, content: assistantAccumulated, isStreaming: true };
                                  }
                                  return m;
                                }));
                              });
                              // 流结束时的最终滚动
                              scrollToLatestMessage();
                            }
                          } finally {
                            try { reader.releaseLock(); } catch {}
                          }

                          // 完成后关闭流式标记并生成建议
                          const suggestions = await fetchSuggestions(assistantAccumulated);

                          // 使用函数式更新确保使用最新的消息状态
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
                            
                            return finalMessages;
                          });
                          
                          // 更新当前对话，确保使用正确的chatId
                          setTimeout(() => {
                            setMessages(prevMessages => {
                              updateCurrentChat(prevMessages, chatId);
                              return prevMessages;
                            });
                          }, 0);

                        } catch (error: any) {
                          console.error('发送消息失败:', error)
                          
                          // 更新错误消息
                          const errorMessages = updatedMessages.map(msg => {
                            if (msg.id === assistantMessage.id) {
                              return {
                                ...msg,
                                content: `回复时出现错误：${error.message}`,
                                isStreaming: false
                              }
                            }
                            return msg
                          })
                          
                          setMessages(errorMessages)
                          updateCurrentChat(errorMessages, chatId)
                          
                          toast.error('发送失败', {
                            description: error.message
                          })
                        } finally {
                          setIsLoading(false)
                        }
                      }
                      
                      handleDirectSend()
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{suggestion}</span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                ))
              ) : (
                // 如果没有动态建议，显示默认建议
                <>
                  <button
                    className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                    onClick={() => {
                      const handleDirectSend = async () => {
                        const content = "深入探讨剧情细节"
                        
                        // 如果没有当前对话，创建新对话
                        let chatId = currentChatId;
                        if (!chatId) {
                          chatId = await createNewChat();
                        }
                        
                        const userMessage: Message = {
                          id: `msg-${Date.now()}`,
                          role: 'user',
                          content: content,
                          timestamp: new Date(),
                          type: 'text'
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
                        
                        try {
                          // 获取API配置
                          const configResponse = await fetch('/api/config')
                          const configData = await configResponse.json()
                          
                          if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                            throw new Error('请先在设置中配置魔搭社区API密钥')
                          }
                          
                          const config = configData.fullConfig
                          
                          // 构建对话历史
                          const conversationMessages = messages
                            .filter(m => !m.isStreaming)
                            .map(m => ({
                              role: m.role,
                              content: m.content
                            }))
                          
                          conversationMessages.push({
                            role: 'user',
                            content: content
                          })
                          
                          // 使用流式API而不是普通API
                          const response = await fetch('/api/ai-chat/stream', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                            body: JSON.stringify({
                              model: selectedModel,
                              messages: conversationMessages,
                              apiKey: config.modelScopeApiKey
                            })
                          })
                          
                          if (!response.ok || !response.body) {
                            let errMsg = 'AI回复失败';
                            try {
                              const e = await response.json();
                              errMsg = e?.error || errMsg;
                            } catch {}
                            throw new Error(errMsg);
                          }
                          
                          const reader = response.body.getReader();
                          const decoder = new TextDecoder();
                          let assistantAccumulated = '';
                          let buffer = ''; // 用于累积token的缓冲区
                          let lastUpdate = Date.now(); // 上次更新时间
                          const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                          const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                          try {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });

                              // SSE: 按行解析
                              const lines = chunk.split('\n');
                              for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;
                                if (trimmed.startsWith(':')) continue; // 注释行
                                if (!trimmed.startsWith('data:')) continue;

                                const dataStr = trimmed.slice(5).trim();
                                if (dataStr === '[DONE]') {
                                  continue;
                                }

                                try {
                                  const parsed = JSON.parse(dataStr);
                                  const delta = parsed?.choices?.[0]?.delta;
                                  if (delta) {
                                    const token = delta.content || '';
                                    if (token) {
                                      assistantAccumulated += token;
                                      buffer += token;
                                      
                                      // 根据内容长度动态调整更新策略
                                      const contentLength = assistantAccumulated.length;
                                      let updateInterval = BASE_UPDATE_INTERVAL;
                                      let bufferSize = BASE_BUFFER_SIZE;
                                      
                                      // 内容越多，更新间隔越长，缓冲区越大
                                      if (contentLength > 1000) {
                                        updateInterval = 100;
                                        bufferSize = 20;
                                      }
                                      if (contentLength > 3000) {
                                        updateInterval = 150;
                                        bufferSize = 30;
                                      }
                                      if (contentLength > 5000) {
                                        updateInterval = 200;
                                        bufferSize = 40;
                                      }
                                      
                                      // 检查是否需要更新UI
                                      const now = Date.now();
                                      const shouldUpdate = 
                                        buffer.length >= bufferSize || // 缓冲区满
                                        now - lastUpdate >= updateInterval || // 时间间隔到了
                                        contentLength < 100; // 内容较少时保持流畅性
                                      
                                      if (shouldUpdate) {
                                        // 实时更新消息 - 使用 flushSync 确保立即更新
                                        flushSync(() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === assistantMessage.id) {
                                              return { ...m, content: assistantAccumulated, isStreaming: true };
                                            }
                                            return m;
                                          }));
                                        });
                                        // 重置缓冲区和时间
                                        buffer = '';
                                        lastUpdate = now;
                                      }
                                    }
                                  }
                                } catch (e) {
                                  console.log('解析JSON失败:', dataStr, e);
                                }
                              }
                            }
                            
                            // 流结束时，确保所有内容都已更新到UI
                            if (buffer.length > 0) {
                              flushSync(() => {
                                setMessages(prev => prev.map(m => {
                                  if (m.id === assistantMessage.id) {
                                    return { ...m, content: assistantAccumulated, isStreaming: true };
                                  }
                                  return m;
                                }));
                              });
                            }
                          } finally {
                            try { reader.releaseLock(); } catch {}
                          }

                          // 完成后关闭流式标记并生成建议
                          const suggestions = await fetchSuggestions(assistantAccumulated);

                          // 使用函数式更新确保使用最新的消息状态
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
                            
                            return finalMessages;
                          });
                          
                          // 更新当前对话
                          setTimeout(() => {
                            setMessages(prevMessages => {
                              updateCurrentChat(prevMessages, currentChatId);
                              return prevMessages;
                            });
                          }, 0);

                        } catch (error: any) {
                          console.error('发送消息失败:', error)
                          
                          // 更新错误消息
                          const errorMessages = updatedMessages.map(msg => {
                            if (msg.id === assistantMessage.id) {
                              return {
                                ...msg,
                                content: `回复时出现错误：${error.message}`,
                                isStreaming: false
                              }
                            }
                            return msg
                          })
                          
                          setMessages(errorMessages)
                          updateCurrentChat(errorMessages, chatId)
                          
                          toast.error('发送失败', {
                            description: error.message
                          })
                        } finally {
                          setIsLoading(false)
                        }
                      }
                      
                      handleDirectSend()
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">深入探讨剧情细节</span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                  <button
                    className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                    onClick={() => {
                      const handleDirectSend = async () => {
                        const content = "了解世界观设定"
                        
                        // 如果没有当前对话，创建新对话
                        let chatId = currentChatId;
                        if (!chatId) {
                          chatId = await createNewChat();
                        }
                        
                        const userMessage: Message = {
                          id: `msg-${Date.now()}`,
                          role: 'user',
                          content: content,
                          timestamp: new Date(),
                          type: 'text'
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
                        
                        try {
                          // 获取API配置
                          const configResponse = await fetch('/api/config')
                          const configData = await configResponse.json()
                          
                          if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                            throw new Error('请先在设置中配置魔搭社区API密钥')
                          }
                          
                          const config = configData.fullConfig
                          
                          // 构建对话历史
                          const conversationMessages = messages
                            .filter(m => !m.isStreaming)
                            .map(m => ({
                              role: m.role,
                              content: m.content
                            }))
                          
                          conversationMessages.push({
                            role: 'user',
                            content: content
                          })
                          
                          // 使用流式API而不是普通API
                          const response = await fetch('/api/ai-chat/stream', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                            body: JSON.stringify({
                              model: selectedModel,
                              messages: conversationMessages,
                              apiKey: config.modelScopeApiKey
                            })
                          })
                          
                          if (!response.ok || !response.body) {
                            let errMsg = 'AI回复失败';
                            try {
                              const e = await response.json();
                              errMsg = e?.error || errMsg;
                            } catch {}
                            throw new Error(errMsg);
                          }
                          
                          const reader = response.body.getReader();
                          const decoder = new TextDecoder();
                          let assistantAccumulated = '';
                          let buffer = ''; // 用于累积token的缓冲区
                          let lastUpdate = Date.now(); // 上次更新时间
                          const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                          const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                          try {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });

                              // SSE: 按行解析
                              const lines = chunk.split('\n');
                              for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;
                                if (trimmed.startsWith(':')) continue; // 注释行
                                if (!trimmed.startsWith('data:')) continue;

                                const dataStr = trimmed.slice(5).trim();
                                if (dataStr === '[DONE]') {
                                  continue;
                                }

                                try {
                                  const parsed = JSON.parse(dataStr);
                                  const delta = parsed?.choices?.[0]?.delta;
                                  if (delta) {
                                    const token = delta.content || '';
                                    if (token) {
                                      assistantAccumulated += token;
                                      buffer += token;
                                      
                                      // 根据内容长度动态调整更新策略
                                      const contentLength = assistantAccumulated.length;
                                      let updateInterval = BASE_UPDATE_INTERVAL;
                                      let bufferSize = BASE_BUFFER_SIZE;
                                      
                                      // 内容越多，更新间隔越长，缓冲区越大
                                      if (contentLength > 1000) {
                                        updateInterval = 100;
                                        bufferSize = 20;
                                      }
                                      if (contentLength > 3000) {
                                        updateInterval = 150;
                                        bufferSize = 30;
                                      }
                                      if (contentLength > 5000) {
                                        updateInterval = 200;
                                        bufferSize = 40;
                                      }
                                      
                                      // 检查是否需要更新UI
                                      const now = Date.now();
                                      const shouldUpdate = 
                                        buffer.length >= bufferSize || // 缓冲区满
                                        now - lastUpdate >= updateInterval || // 时间间隔到了
                                        contentLength < 100; // 内容较少时保持流畅性
                                      
                                      if (shouldUpdate) {
                                        // 实时更新消息 - 使用 flushSync 确保立即更新
                                        flushSync(() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === assistantMessage.id) {
                                              return { ...m, content: assistantAccumulated, isStreaming: true };
                                            }
                                            return m;
                                          }));
                                        });
                                        // 重置缓冲区和时间
                                        buffer = '';
                                        lastUpdate = now;
                                      }
                                    }
                                  }
                                } catch (e) {
                                  console.log('解析JSON失败:', dataStr, e);
                                }
                              }
                            }
                            
                            // 流结束时，确保所有内容都已更新到UI
                            if (buffer.length > 0) {
                              flushSync(() => {
                                setMessages(prev => prev.map(m => {
                                  if (m.id === assistantMessage.id) {
                                    return { ...m, content: assistantAccumulated, isStreaming: true };
                                  }
                                  return m;
                                }));
                              });
                            }
                          } finally {
                            try { reader.releaseLock(); } catch {}
                          }

                          // 完成后关闭流式标记并生成建议
                          const suggestions = await fetchSuggestions(assistantAccumulated);

                          // 使用函数式更新确保使用最新的消息状态
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
                            
                            return finalMessages;
                          });
                          
                          // 更新当前对话
                          setTimeout(() => {
                            setMessages(prevMessages => {
                              updateCurrentChat(prevMessages, currentChatId);
                              return prevMessages;
                            });
                          }, 0);

                        } catch (error: any) {
                          console.error('发送消息失败:', error)
                          
                          // 更新错误消息
                          const errorMessages = updatedMessages.map(msg => {
                            if (msg.id === assistantMessage.id) {
                              return {
                                ...msg,
                                content: `回复时出现错误：${error.message}`,
                                isStreaming: false
                              }
                            }
                            return msg
                          })
                          
                          setMessages(errorMessages)
                          updateCurrentChat(errorMessages, chatId)
                          
                          toast.error('发送失败', {
                            description: error.message
                          })
                        } finally {
                          setIsLoading(false)
                        }
                      }
                      
                      handleDirectSend()
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">了解世界观设定</span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// 自适应高度的Textarea组件
const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [height, setHeight] = useState('60px') // 默认高度
  const [isOverflowing, setIsOverflowing] = useState(false)

  // 调整高度的函数
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 临时重置高度以获取真实的scrollHeight
    textarea.style.height = 'auto'
    
    // 计算新高度，限制在最小和最大高度之间
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200) // 最小60px，最大200px
    
    setHeight(`${newHeight}px`)
    textarea.style.height = `${newHeight}px`
    
    // 检查是否超出最大高度，需要显示滚动条
    setIsOverflowing(textarea.scrollHeight > 200)
  }, [])

  // 监听值变化和窗口大小变化
  useEffect(() => {
    adjustHeight()
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', adjustHeight)
    return () => window.removeEventListener('resize', adjustHeight)
  }, [props.value, adjustHeight])

  // 合并ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(textareaRef.current)
    } else if (ref) {
      ref.current = textareaRef.current
    }
  }, [ref])

  // 应用自定义滚动条样式，与ScrollArea组件保持一致
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 创建样式
    const style = document.createElement('style')
    style.textContent = `
      /* 自定义滚动条样式，与ScrollArea组件保持一致 */
      .auto-resize-textarea::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-thumb {
        background: hsl(var(--border));
        border-radius: 3px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground));
      }
      
      /* Firefox滚动条样式 */
      .auto-resize-textarea {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--border)) transparent;
      }
      
      .auto-resize-textarea:hover {
        scrollbar-color: hsl(var(--muted-foreground)) transparent;
      }
    `
    
    document.head.appendChild(style)
    
    // 添加自定义类名
    textarea.classList.add('auto-resize-textarea')
    
    return () => {
      document.head.removeChild(style)
      textarea.classList.remove('auto-resize-textarea')
    }
  }, [])

  // 处理滚动事件，阻止事件冒泡
  const handleWheel = useCallback((e: React.WheelEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    // 只有当文本区域有滚动内容时才阻止冒泡
    if (isOverflowing) {
      // 如果滚动到顶部或底部，允许继续滚动
      const { scrollTop, scrollHeight, clientHeight } = textarea
      const isAtTop = scrollTop === 0
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
      
      // 如果向上滚动且已在顶部，或向下滚动且已在底部，则允许事件冒泡
      if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
        return // 允许事件冒泡
      }
      
      // 否则阻止事件冒泡
      e.stopPropagation()
      e.preventDefault()
    }
  }, [isOverflowing])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={className}
      onWheel={handleWheel}
      style={{ 
        height,
        resize: 'none',
        overflow: isOverflowing ? 'auto' : 'hidden',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--border)) transparent'
      }}
    />
  )
})

AutoResizeTextarea.displayName = 'AutoResizeTextarea'



export function AiChat() {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInterrupting, setIsInterrupting] = useState(false) // 新增：中断状态
  const [abortController, setAbortController] = useState<AbortController | null>(null) // 新增：AbortController实例
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('ai-chat-selected-model');
      if (savedModel && AVAILABLE_MODELS.some(model => model.id === savedModel)) {
        return savedModel;
      }
    }
    return AVAILABLE_MODELS[0].id;
  });
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  // 文件上传状态
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  // 拖放状态
  // 根据时间判定问候语
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '早上好';
    } else if (hour >= 12 && hour < 18) {
      return '中午好';
    } else {
      return '晚上好';
    }
  };
  
  // 获取用户信息
  const { userInfo } = useUser()
  
  const [isDragOver, setIsDragOver] = useState(false)
  // 标题动画状态
  // 标题动画状态
  const [displayTitle, setDisplayTitle] = useState<string>(`${getTimeBasedGreeting()}，${userInfo?.displayName || '用户'}`)
  const [isTitleAnimating, setIsTitleAnimating] = useState(false)
  
  // 更新显示标题的副作用
  useEffect(() => {
    if (!currentChatId && userInfo) {
      setDisplayTitle(`${getTimeBasedGreeting()}，${userInfo.displayName || '用户'}`)
    }
  }, [currentChatId, userInfo, getTimeBasedGreeting])
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<any>(null)

  // 自动滚动到底部 - 针对流式输出优化
  const scrollToBottom = useCallback((immediate: boolean = false) => {
    // 首先尝试使用 ScrollArea 的 viewport 直接控制滚动
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (viewport) {
      // 直接设置 scrollTop 到最底部，这是最可靠的方式
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      // 降级方案：使用 scrollIntoView
      if (immediate) {
        // 流式输出时使用即时滚动，避免闪烁
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      } else {
        // 普通消息使用平滑滚动
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  // 滚动到最新消息
  const scrollToLatestMessage = useCallback(() => {
    if (messages.length > 0) {
      // 使用requestAnimationFrame确保在下一帧执行滚动
      requestAnimationFrame(() => {
        scrollToBottom(true)
      })
      
      // 额外添加一个延迟滚动，确保内容完全渲染
      setTimeout(() => {
        scrollToBottom(true)
      }, 50)
    }
  }, [messages.length, scrollToBottom])

  // 在消息更新时检查是否需要滚动
  useEffect(() => {
    // 检查是否有流式消息
    const hasStreamingMessage = messages.some(m => m.isStreaming)
    
    if (hasStreamingMessage) {
      // 流式消息时使用即时滚动到最新消息
      scrollToLatestMessage()
    } else {
      // 非流式消息时使用平滑滚动
      scrollToBottom(false)
    }
  }, [messages, scrollToBottom, scrollToLatestMessage])

  // 当消息数量变化时，确保滚动到最新消息
  useEffect(() => {
    // 使用requestAnimationFrame确保在下一帧执行滚动
    const rafId = requestAnimationFrame(() => {
      scrollToLatestMessage()
    })
    
    return () => cancelAnimationFrame(rafId)
  }, [messages.length, scrollToLatestMessage])

  // 当有新消息添加时，确保滚动到最新消息
  useEffect(() => {
    if (messages.length > 0) {
      // 检查是否有流式消息
      const hasStreamingMessage = messages.some(m => m.isStreaming)
      
      if (hasStreamingMessage) {
        // 使用requestAnimationFrame确保在下一帧执行滚动
        const rafId = requestAnimationFrame(() => {
          scrollToLatestMessage()
        })
        
        return () => cancelAnimationFrame(rafId)
      }
    }
  }, [messages, scrollToLatestMessage])

  // 当有新消息添加时，确保滚动到最新消息
  useEffect(() => {
    if (messages.length > 0) {
      // 使用requestAnimationFrame确保在下一帧执行滚动
      const rafId = requestAnimationFrame(() => {
        scrollToLatestMessage()
      })
      
      return () => cancelAnimationFrame(rafId)
    }
  }, [messages.length, scrollToLatestMessage])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // 保存选中的模型到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-chat-selected-model', selectedModel);
    }
  }, [selectedModel]);

  // 加载对话历史
  useEffect(() => {
    loadChatHistories()
  }, [])

  // 从服务器加载对话历史
  const loadChatHistories = async () => {
    try {
      // 为聊天历史请求创建AbortController
      const chatHistoriesAbortController = new AbortController();
      
      const response = await fetch('/api/ai-chat', {
        signal: chatHistoriesAbortController.signal
      })
      const result = await response.json()
      
      if (result.success && Array.isArray(result.data)) {
        const histories = result.data.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
          messages: h.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        setChatHistories(histories)
      } else {
        // 如果服务器加载失败，尝试从本地存储加载
        const stored = localStorage.getItem('ai-chat-histories')
        if (stored) {
          const histories = JSON.parse(stored).map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
            messages: h.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }))
          setChatHistories(histories)
          // 同步到服务器
          await saveChatHistories(histories)
        }
      }
    } catch (error) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('加载对话历史请求已被用户中断');
        return;
      }
      
      console.error('加载对话历史失败:', error)
      // 降级到本地存储
      try {
        const stored = localStorage.getItem('ai-chat-histories')
        if (stored) {
          const histories = JSON.parse(stored).map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt),
            updatedAt: new Date(h.updatedAt),
            messages: h.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }))
          setChatHistories(histories)
        }
      } catch (localError) {
        console.error('本地存储加载也失败:', localError)
      }
    }
  }

  // 保存对话历史到服务器和本地存储
  // 保存对话历史到服务器和本地存储
  const saveChatHistories = async (histories: ChatHistory[]) => {
    try {
      // 先保存到本地存储作为备份
      localStorage.setItem('ai-chat-histories', JSON.stringify(histories))
      
      // 然后保存到服务器
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ histories })
      })
      
      if (!response.ok) {
        console.warn('服务器保存失败，已保存到本地存储')
      }
    } catch (error) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('保存对话历史请求已被用户中断');
        return;
      }
      
      console.error('保存对话历史失败:', error)
      // 至少确保本地存储成功
      try {
        localStorage.setItem('ai-chat-histories', JSON.stringify(histories))
      } catch (localError) {
        console.error('本地存储保存也失败:', localError)
      }
    }
  }

  // 创建新对话
  const createNewChat = async () => {
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
    
    // 重置显示标题
    setIsTitleAnimating(true);
    setDisplayTitle('新对话');
    
    // 动画结束后清除动画状态
    setTimeout(() => {
      setIsTitleAnimating(false);
    }, 500);
    
    return newChatId;
  }

  // 切换对话
  const switchChat = async (chatId: string) => {
    // 如果当前有对话且有消息，先保存当前对话
    if (currentChatId && messages.length > 0) {
      await updateCurrentChat(messages);
    }
    
    const chat = chatHistories.find(h => h.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages(chat.messages)
      
      // 更新显示标题
      setIsTitleAnimating(true);
      setDisplayTitle(chat.title);
      
      // 动画结束后清除动画状态
      setTimeout(() => {
        setIsTitleAnimating(false);
      }, 500);
    }
  }

  // 删除对话
  const deleteChat = async (chatId: string) => {
    try {
      // 从服务器删除
      const response = await fetch(`/api/ai-chat?chatId=${chatId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        console.warn('服务器删除失败，仅从本地删除')
      }
    } catch (error) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('删除对话请求已被用户中断');
        return;
      }
      
      console.error('服务器删除失败:', error)
    }
    
    // 从本地状态删除
    const updatedHistories = chatHistories.filter(h => h.id !== chatId)
    setChatHistories(updatedHistories)
    saveChatHistories(updatedHistories)
    
    // 如果删除的是当前对话，返回空状态而不是创建新对话或切换到第一个历史对话
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
      // 重置显示标题
      setIsTitleAnimating(true);
      setDisplayTitle(`${getTimeBasedGreeting()}，${userInfo?.displayName || '用户'}`);
      // 动画结束后清除动画状态
      setTimeout(() => {
        setIsTitleAnimating(false);
      }, 500);
    }
  }

  // 生成对话标题
  const generateChatTitle = async (firstAssistantResponse: string) => {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        // 获取API配置
        const configResponse = await fetch('/api/config')
        const configData = await configResponse.json()
        
        if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
          // 如果没有API密钥，不生成标题
          throw new Error('API密钥未配置');
        }
        
        const config = configData.fullConfig

        // 为标题生成请求创建AbortController
        const titleAbortController = abortController || new AbortController();

        // 使用与流式输出相同的API端点生成标题
        const response = await fetch('/api/generate-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            firstMessage: firstAssistantResponse,
            apiKey: config.modelScopeApiKey
          }),
          signal: titleAbortController.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // 特殊处理429错误（请求过多）
          if (response.status === 429) {
            retries++;
            if (retries <= maxRetries) {
              // 指数退避策略：1秒, 2秒, 4秒
              const delay = Math.pow(2, retries - 1) * 1000;
              console.log(`标题生成API返回429错误，${delay}ms后进行第${retries}次重试`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              throw new Error(`魔搭社区API调用失败: 请求过于频繁，请稍后再试`);
            }
          }
          
          // 其他API错误
          throw new Error(errorData.error || `API调用失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json()
        
        if (!data.success || !data.data.title) {
          // 如果返回数据格式错误，抛出错误
          throw new Error('返回数据格式错误');
        }

        return data.data.title;
      } catch (error: any) {
        // 检查是否是中断错误
        if (error.name === 'AbortError') {
          // 重新抛出中断错误
          throw error;
        }
        
        // 如果是429错误且还有重试次数，继续重试
        if (error.message.includes('429') && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries - 1) * 1000;
          console.log(`标题生成遇到429错误，${delay}ms后进行第${retries}次重试`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 其他错误直接抛出
        throw error;
      }
    }
    
    throw new Error('标题生成失败：重试次数已用完');
  }

  // 添加一个时间戳来跟踪最后一次标题生成的时间
  const lastTitleGenerationTime = useRef<number>(0);
  
  // 更新当前对话
  // 更新当前对话
  const updateCurrentChat = async (newMessages: Message[], chatId?: string) => {
    // 使用函数式更新确保使用最新的chatHistories和currentChatId状态
    setChatHistories(prevChatHistories => {
      // 如果传递了chatId参数，使用它；否则使用currentChatId状态
      const currentChatIdValue = chatId || currentChatId;
      
      // 添加调试日志
      console.log('updateCurrentChat called with:', {
        chatIdParam: chatId,
        currentChatIdState: currentChatId,
        currentChatIdValue,
        newMessagesLength: newMessages.length
      });
      
      // 如果currentChatIdValue为null或undefined，直接返回
      if (!currentChatIdValue) {
        console.log('currentChatIdValue is null or undefined, returning early');
        return prevChatHistories;
      }
      
      const currentChat = prevChatHistories.find(chat => chat.id === currentChatIdValue);
      
      if (currentChat && currentChat.title === '新对话' && newMessages.length > 0) {
        // 查找第一个助手回复，优先选择非流式消息，如果没有则选择最后一个流式消息
        let firstAssistantMessage = newMessages.find(m => m.role === 'assistant' && !m.isStreaming)
        if (!firstAssistantMessage) {
          // 如果没有非流式消息，查找最后一个助手消息（可能是流式的）
          const assistantMessages = newMessages.filter(m => m.role === 'assistant')
          if (assistantMessages.length > 0) {
            firstAssistantMessage = assistantMessages[assistantMessages.length - 1]
          }
        }
        
        if (firstAssistantMessage) {
          // 检查是否在短时间内已经生成过标题（避免频繁请求）
          const now = Date.now();
          const timeSinceLastGeneration = now - lastTitleGenerationTime.current;
          
          // 如果距离上次生成标题不足5秒，跳过本次生成
          if (timeSinceLastGeneration < 5000) {
            console.log('跳过标题生成：距离上次生成不足5秒');
            // 只更新消息，不更新标题
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
            
            saveChatHistories(updatedHistories);
            return updatedHistories;
          }
          
          // 记录本次标题生成时间
          lastTitleGenerationTime.current = now;
          
          // 使用模型动态生成标题
          generateChatTitle(firstAssistantMessage.content).then(generatedTitle => {
            console.log('标题生成成功:', generatedTitle);
            // 立即更新显示标题
            // 触发标题动画
            setIsTitleAnimating(true);
            setDisplayTitle(generatedTitle);
            
            // 动画结束后清除动画状态
            setTimeout(() => {
              setIsTitleAnimating(false);
            }, 500);
            
            // 更新chatHistories状态
            setChatHistories(prevChatHistories => {
              const updatedHistories = prevChatHistories.map((chat) => {
                if (chat.id === currentChatIdValue) {
                  return {
                    ...chat,
                    title: generatedTitle,
                    messages: newMessages,
                    updatedAt: new Date()
                  }
                }
                return chat
              })
              
              saveChatHistories(updatedHistories);
              return updatedHistories;
            });
          }).catch(error => {
            // 如果标题生成失败，只更新消息，不更新标题
            console.error('标题生成失败:', error);
            
            // 更新chatHistories状态（不更新标题）
            setChatHistories(prevChatHistories => {
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
              
              saveChatHistories(updatedHistories);
              return updatedHistories;
            });
          });
        } else {
          console.log('没有找到助手消息，只更新消息，不更新标题');
          // 如果没有找到助手消息，只更新消息，不更新标题
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
          
          saveChatHistories(updatedHistories);
          return updatedHistories;
        }
      } else {
        console.log('不是新对话或没有新消息，只更新消息，不更新标题');
        // 如果不是新对话或没有新消息，只更新消息，不更新标题
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
        
        saveChatHistories(updatedHistories);
        return updatedHistories;
      }
      
      return prevChatHistories;
    });
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!SUPPORTED_SUBTITLE_FORMATS.includes(fileExtension)) {
      toast.error('不支持的文件格式', {
        description: `请上传字幕文件 (${SUPPORTED_SUBTITLE_FORMATS.join(', ')})`
      })
      return
    }

    // 设置上传状态
    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFileName(file.name)
    
    // 模拟上传进度
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10
        if (newProgress >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return newProgress
      })
    }, 100)

    // 设置超时处理
    uploadTimeoutRef.current = setTimeout(() => {
      clearInterval(progressInterval)
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFileName(null)
      toast.error('文件上传超时', {
        description: '请检查网络连接或重新选择文件'
      })
    }, 30000) // 30秒超时

    const reader = new FileReader()
    reader.onload = (e) => {
      // 清除超时定时器
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current)
        uploadTimeoutRef.current = null
      }
      
      // 清除进度定时器
      clearInterval(progressInterval)
      
      const content = e.target?.result as string
      if (!content) {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadedFileName(null)
        return
      }
      
      // 存储文件内容到组件状态，以便后续使用
      setUploadedFileContent(content)
      setIsUploading(false)
      setUploadProgress(100)
    }

    reader.onerror = () => {
      // 清除超时定时器
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current)
        uploadTimeoutRef.current = null
      }
      
      // 清除进度定时器
      clearInterval(progressInterval)
      
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFileName(null)
      
      toast.error('文件读取失败', {
        description: '请检查文件是否损坏或重新选择文件'
      })
    }

    reader.readAsText(file, 'utf-8')
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 取消上传
  const handleCancelUpload = () => {
    // 清除超时定时器
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current)
      uploadTimeoutRef.current = null
    }
    
    // 重置上传状态
    setIsUploading(false)
    setUploadProgress(0)
    setUploadedFileName(null)
    setUploadedFileContent(null)
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    toast.info('已取消上传')
  }

  // 拖放事件处理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!SUPPORTED_SUBTITLE_FORMATS.includes(fileExtension)) {
      toast.error('不支持的文件格式', {
        description: `请上传字幕文件 (${SUPPORTED_SUBTITLE_FORMATS.join(', ')})`
      })
      return
    }

    // 模拟文件输入事件，复用现有的文件上传逻辑
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files
      // 触发change事件
      const event = new Event('change', { bubbles: true })
      fileInputRef.current.dispatchEvent(event)
    }
  }

  // 生成分集简介
  // 生成分集简介
  const handleGenerateEpisodeSummary = async (subtitleContent: string, fileName: string) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `已上传字幕文件：${fileName}`,
      timestamp: new Date(),
      type: 'file',
      fileName: fileName,
      fileContent: subtitleContent
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'episode-summary',
      isStreaming: true
    }

    const updatedMessages = [...messages, userMessage, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建提示词
      const prompt = `请基于以下字幕内容生成分集简介：

字幕文件：${fileName}

字幕内容：
${subtitleContent}`

      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal // 添加中断信号
      })

      if (!response.ok || !response.body) {
        let errMsg = '生成分集简介失败';
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccumulated = '';
      let buffer = ''; // 用于累积token的缓冲区
      let lastUpdate = Date.now(); // 上次更新时间
      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // SSE: 按行解析
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue; // 注释行
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (delta) {
                const token = delta.content || '';
                if (token) {
                  assistantAccumulated += token;
                  buffer += token;
                  
                  // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                  const contentLength = assistantAccumulated.length;
                  let updateInterval = BASE_UPDATE_INTERVAL;
                  let bufferSize = BASE_BUFFER_SIZE;
                  
                  // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                  if (contentLength > 1000) {
                    updateInterval = 70;  // 减少间隔
                    bufferSize = 15;     // 减少缓冲区
                  }
                  if (contentLength > 3000) {
                    updateInterval = 100;
                    bufferSize = 20;
                  }
                  if (contentLength > 5000) {
                    updateInterval = 130; // 减少间隔
                    bufferSize = 25;     // 减少缓冲区
                  }
                  
                  // 检查是否需要更新UI，确保更流畅的体验
                  const now = Date.now();
                  const shouldUpdate = 
                    buffer.length >= bufferSize || // 缓冲区满
                    now - lastUpdate >= updateInterval || // 时间间隔到了
                    contentLength < 100 || // 内容较少时保持流畅性
                    (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                  
                  if (shouldUpdate) {
                    // 实时更新消息 - 使用 flushSync 确保立即更新
                    flushSync(() => {
                      setMessages(prev => prev.map(m => {
                        if (m.id === assistantMessage.id) {
                          return { ...m, content: assistantAccumulated, isStreaming: true };
                        }
                        return m;
                      }));
                    });
                    // 重置缓冲区和时间
                    buffer = '';
                    lastUpdate = now;
                    
                    // 立即滚动到最新消息，确保流式输出可见
                    scrollToLatestMessage();
                  }
                }
              }
            } catch (e) {
              console.log('解析JSON失败:', dataStr, e);
            }
          }
        }
        
        // 流结束时，确保所有内容都已更新到UI
        if (buffer.length > 0) {
          flushSync(() => {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMessage.id) {
                return { ...m, content: assistantAccumulated, isStreaming: true };
              }
              return m;
            }));
          });
          // 流结束时的最终滚动
          scrollToLatestMessage();
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }

      // 完成后关闭流式标记并生成建议
      const suggestions = await fetchSuggestions(assistantAccumulated);

      // 使用函数式更新确保使用最新的消息状态
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
        
        return finalMessages;
      });
      
      // 流式输出结束后滚动到最新消息
      scrollToLatestMessage();
      
      // 更新当前对话以生成标题
      setMessages(prevMessages => {
        updateCurrentChat(prevMessages, chatId);
        return prevMessages;
      });

      toast.success('分集简介生成完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('生成分集简介失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `生成分集简介时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error('生成失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 分析角色对话
  // 分析角色对话
  const handleAnalyzeCharacterDialogues = async (subtitleContent: string, fileName: string) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    const updatedMessages = [...messages, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建提示词
      const prompt = `请基于以下字幕内容分析主要角色的对话特点：

字幕文件：${fileName}

字幕内容：
${subtitleContent}

要求：
1. 分析主要角色的语言风格和表达习惯
2. 总结每个角色的性格特点
3. 指出角色之间的关系和互动模式
4. 提取具有代表性的对话片段
5. 用中文输出，条理清晰

请直接输出分析结果，不需要其他说明。`

      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal // 添加中断信号
      })

      if (!response.ok || !response.body) {
        let errMsg = '分析角色对话失败';
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccumulated = '';
      let buffer = ''; // 用于累积token的缓冲区
      let lastUpdate = Date.now(); // 上次更新时间
      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // SSE: 按行解析
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue; // 注释行
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (delta) {
                const token = delta.content || '';
                if (token) {
                  assistantAccumulated += token;
                  buffer += token;
                  
                  // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                  const contentLength = assistantAccumulated.length;
                  let updateInterval = BASE_UPDATE_INTERVAL;
                  let bufferSize = BASE_BUFFER_SIZE;
                  
                  // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                  if (contentLength > 1000) {
                    updateInterval = 70;  // 减少间隔
                    bufferSize = 15;     // 减少缓冲区
                  }
                  if (contentLength > 3000) {
                    updateInterval = 100;
                    bufferSize = 20;
                  }
                  if (contentLength > 5000) {
                    updateInterval = 130; // 减少间隔
                    bufferSize = 25;     // 减少缓冲区
                  }
                  
                  // 检查是否需要更新UI，确保更流畅的体验
                  const now = Date.now();
                  const shouldUpdate = 
                    buffer.length >= bufferSize || // 缓冲区满
                    now - lastUpdate >= updateInterval || // 时间间隔到了
                    contentLength < 100 || // 内容较少时保持流畅性
                    (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                  
                  if (shouldUpdate) {
                    // 实时更新消息 - 使用 flushSync 确保立即更新
                    flushSync(() => {
                      setMessages(prev => prev.map(m => {
                        if (m.id === assistantMessage.id) {
                          return { ...m, content: assistantAccumulated, isStreaming: true };
                        }
                        return m;
                      }));
                    });
                    // 重置缓冲区和时间
                    buffer = '';
                    lastUpdate = now;
                    
                    // 立即滚动到最新消息，确保流式输出可见
                    scrollToLatestMessage();
                  }
                }
              }
            } catch (e) {
              console.log('解析JSON失败:', dataStr, e);
            }
          }
        }
        
        // 流结束时，确保所有内容都已更新到UI
        if (buffer.length > 0) {
          flushSync(() => {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMessage.id) {
                return { ...m, content: assistantAccumulated, isStreaming: true };
              }
              return m;
            }));
          });
          // 流结束时的最终滚动
          scrollToLatestMessage();
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }

      // 完成后关闭流式标记并生成建议
      const suggestions = await fetchSuggestions(assistantAccumulated);

      // 使用函数式更新确保使用最新的消息状态
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
        
        return finalMessages;
      });
      
      // 流式输出结束后滚动到最新消息
      scrollToLatestMessage();
      
      // 更新当前对话以生成标题
      setMessages(prevMessages => {
        updateCurrentChat(prevMessages, chatId);
        return prevMessages;
      });

      toast.success('角色对话分析完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('分析角色对话失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `分析角色对话时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error('分析失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 提取关键情节
  // 提取关键情节
  const handleExtractKeyPlotPoints = async (subtitleContent: string, fileName: string) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    const updatedMessages = [...messages, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建提示词
      const prompt = `请基于以下字幕内容提取关键情节：

字幕文件：${fileName}

字幕内容：
${subtitleContent}

要求：
1. 按时间顺序列出5-10个关键情节
2. 简要描述每个情节的内容和意义
3. 标注情节中的重要转折点
4. 指出主要冲突和解决方案
5. 用中文输出，条理清晰

请直接输出关键情节列表，不需要其他说明。`

      const response = await fetch('/api/modelscope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal // 添加中断信号
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '提取关键情节失败')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '提取关键情节失败')
      }

      // 获取后续问题建议
      const suggestions = await fetchSuggestions(data.data.content);

      // 更新消息内容 - 包含可能的引导Chips
      const finalMessages = updatedMessages.map(msg => {
        if (msg.id === assistantMessage.id) {
          return {
            ...msg,
            content: data.data.content,
            isStreaming: false,
            // 添加引导建议
            suggestions: suggestions
          }
        }
        return msg
      })

      setMessages(finalMessages)
      updateCurrentChat(finalMessages)

      toast.success('关键情节提取完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('提取关键情节失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `提取关键情节时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error('提取失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 基于字幕内容深度分析并总结剧情
  const handleAnalyzeAndSummarizePlot = async (subtitleContent: string, fileName: string) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    const updatedMessages = [...messages, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建提示词
      const prompt = `请基于以下字幕内容进行深度分析并总结剧情：

字幕文件：${fileName}

字幕内容：
${subtitleContent}

要求：
1. 深入分析剧情的主要线索和发展脉络
2. 总结核心故事情节和关键转折点
3. 分析主要角色的发展变化和内心活动
4. 探讨剧情想要表达的主题思想
5. 识别重要的细节和隐藏的线索
6. 用中文输出，条理清晰，分析深入

请直接输出分析总结结果，不需要其他说明。`

      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal // 添加中断信号
      })

      if (!response.ok || !response.body) {
        let errMsg = '分析并总结剧情失败';
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccumulated = '';
      let buffer = ''; // 用于累积token的缓冲区
      let lastUpdate = Date.now(); // 上次更新时间
      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // SSE: 按行解析
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue; // 注释行
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (delta) {
                const token = delta.content || '';
                if (token) {
                  assistantAccumulated += token;
                  buffer += token;
                  
                  // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                  const contentLength = assistantAccumulated.length;
                  let updateInterval = BASE_UPDATE_INTERVAL;
                  let bufferSize = BASE_BUFFER_SIZE;
                  
                  // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                  if (contentLength > 1000) {
                    updateInterval = 70;  // 减少间隔
                    bufferSize = 15;     // 减少缓冲区
                  }
                  if (contentLength > 3000) {
                    updateInterval = 100;
                    bufferSize = 20;
                  }
                  if (contentLength > 5000) {
                    updateInterval = 130; // 减少间隔
                    bufferSize = 25;     // 减少缓冲区
                  }
                  
                  // 检查是否需要更新UI，确保更流畅的体验
                  const now = Date.now();
                  const shouldUpdate = 
                    buffer.length >= bufferSize || // 缓冲区满
                    now - lastUpdate >= updateInterval || // 时间间隔到了
                    contentLength < 100 || // 内容较少时保持流畅性
                    (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                  
                  if (shouldUpdate) {
                    // 实时更新消息 - 使用 flushSync 确保立即更新
                    flushSync(() => {
                      setMessages(prev => prev.map(m => {
                        if (m.id === assistantMessage.id) {
                          return { ...m, content: assistantAccumulated, isStreaming: true };
                        }
                        return m;
                      }));
                    });
                    // 重置缓冲区和时间
                    buffer = '';
                    lastUpdate = now;
                    
                    // 立即滚动到最新消息，确保流式输出可见
                    scrollToLatestMessage();
                  }
                }
              }
            } catch (e) {
              console.log('解析JSON失败:', dataStr, e);
            }
          }
        }
        
        // 流结束时，确保所有内容都已更新到UI
        if (buffer.length > 0) {
          flushSync(() => {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMessage.id) {
                return { ...m, content: assistantAccumulated, isStreaming: true };
              }
              return m;
            }));
          });
          // 流结束时的最终滚动
          scrollToLatestMessage();
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }

      // 完成后关闭流式标记并生成建议
      const suggestions = await fetchSuggestions(assistantAccumulated);

      // 使用函数式更新确保使用最新的消息状态
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
        
        return finalMessages;
      });
      
      // 流式输出结束后滚动到最新消息
      scrollToLatestMessage();
      
      // 更新当前对话以生成标题
      setMessages(prevMessages => {
        updateCurrentChat(prevMessages, chatId);
        return prevMessages;
      });

      toast.success('剧情分析总结完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('分析并总结剧情失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `分析并总结剧情时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        await updateCurrentChat(errorMessages, chatId)

        toast.error('分析总结失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 写个让观众一眼就想看的简介
  const handleCreateEngagingSummary = async (subtitleContent: string, fileName: string) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      isStreaming: true
    }

    const updatedMessages = [...messages, assistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建提示词
      const prompt = `请基于以下字幕内容写一个让观众一眼就想看的简介：

字幕文件：${fileName}

字幕内容：
${subtitleContent}

要求：
1. 用吸引人的语言激发观众的观看兴趣
2. 突出本集最精彩、最引人入胜的看点
3. 营造悬念，但不要剧透关键情节
4. 语言生动有趣，具有感染力
5. 字数控制在150-250字之间
6. 符合中文表达习惯，流畅自然

请直接输出简介内容，不需要其他说明。`

      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal // 添加中断信号
      })

      if (!response.ok || !response.body) {
        let errMsg = '创建吸引人简介失败';
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccumulated = '';
      let buffer = ''; // 用于累积token的缓冲区
      let lastUpdate = Date.now(); // 上次更新时间
      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // SSE: 按行解析
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue; // 注释行
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (delta) {
                const token = delta.content || '';
                if (token) {
                  assistantAccumulated += token;
                  buffer += token;
                  
                  // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                  const contentLength = assistantAccumulated.length;
                  let updateInterval = BASE_UPDATE_INTERVAL;
                  let bufferSize = BASE_BUFFER_SIZE;
                  
                  // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                  if (contentLength > 1000) {
                    updateInterval = 70;  // 减少间隔
                    bufferSize = 15;     // 减少缓冲区
                  }
                  if (contentLength > 3000) {
                    updateInterval = 100;
                    bufferSize = 20;
                  }
                  if (contentLength > 5000) {
                    updateInterval = 130; // 减少间隔
                    bufferSize = 25;     // 减少缓冲区
                  }
                  
                  // 检查是否需要更新UI，确保更流畅的体验
                  const now = Date.now();
                  const shouldUpdate = 
                    buffer.length >= bufferSize || // 缓冲区满
                    now - lastUpdate >= updateInterval || // 时间间隔到了
                    contentLength < 100 || // 内容较少时保持流畅性
                    (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                  
                  if (shouldUpdate) {
                    // 实时更新消息 - 使用 flushSync 确保立即更新
                    flushSync(() => {
                      setMessages(prev => prev.map(m => {
                        if (m.id === assistantMessage.id) {
                          return { ...m, content: assistantAccumulated, isStreaming: true };
                        }
                        return m;
                      }));
                    });
                    // 重置缓冲区和时间
                    buffer = '';
                    lastUpdate = now;
                    
                    // 立即滚动到最新消息，确保流式输出可见
                    scrollToLatestMessage();
                  }
                }
              }
            } catch (e) {
              console.log('解析JSON失败:', dataStr, e);
            }
          }
        }
        
        // 流结束时，确保所有内容都已更新到UI
        if (buffer.length > 0) {
          flushSync(() => {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMessage.id) {
                return { ...m, content: assistantAccumulated, isStreaming: true };
              }
              return m;
            }));
          });
          // 流结束时的最终滚动
          scrollToLatestMessage();
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }

      // 完成后关闭流式标记并生成建议
      const suggestions = await fetchSuggestions(assistantAccumulated);

      // 使用函数式更新确保使用最新的消息状态
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
        
        return finalMessages;
      });
      
      // 流式输出结束后滚动到最新消息
      scrollToLatestMessage();
      
      // 更新当前对话以生成标题
      setMessages(prevMessages => {
        updateCurrentChat(prevMessages, chatId);
        return prevMessages;
      });

      toast.success('吸引人简介创建完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('创建吸引人简介失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `创建吸引人简介时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error('创建失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 通用流式处理函数
  const handleStreamResponse = async (
    messages: any[], 
    assistantMessageId: string,
    abortController: AbortController
  ) => {
    const response = await fetch('/api/ai-chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        apiKey: config.modelScopeApiKey
      }),
      signal: abortController.signal
    });

    if (!response.ok || !response.body) {
      let errMsg = 'AI回复失败';
      try {
        const e = await response.json();
        errMsg = e?.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantAccumulated = '';
    let buffer = ''; // 用于累积token的缓冲区
    let lastUpdate = Date.now(); // 上次更新时间
    const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
    const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // SSE: 按行解析
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith(':')) continue; // 注释行
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed?.choices?.[0]?.delta;
            if (delta) {
              const token = delta.content || '';
              if (token) {
                assistantAccumulated += token;
                buffer += token;
                
                // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                const contentLength = assistantAccumulated.length;
                let updateInterval = BASE_UPDATE_INTERVAL;
                let bufferSize = BASE_BUFFER_SIZE;
                
                // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                if (contentLength > 1000) {
                  updateInterval = 70;  // 减少间隔
                  bufferSize = 15;     // 减少缓冲区
                }
                if (contentLength > 3000) {
                  updateInterval = 100;
                  bufferSize = 20;
                }
                if (contentLength > 5000) {
                  updateInterval = 130; // 减少间隔
                  bufferSize = 25;     // 减少缓冲区
                }
                
                // 检查是否需要更新UI，确保更流畅的体验
                const now = Date.now();
                const shouldUpdate = 
                  buffer.length >= bufferSize || // 缓冲区满
                  now - lastUpdate >= updateInterval || // 时间间隔到了
                  contentLength < 100 || // 内容较少时保持流畅性
                  (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                
                if (shouldUpdate) {
                  // 实时更新消息
                  setMessages(prev => prev.map(m => {
                    if (m.id === assistantMessageId) {
                      return { ...m, content: assistantAccumulated, isStreaming: true };
                    }
                    return m;
                  }));
                  // 重置缓冲区和时间
                  buffer = '';
                  lastUpdate = now;
                  
                  // 立即滚动到最新消息
                    scrollToLatestMessage();
                }
              }
            }
          } catch {
            // 非JSON行忽略
          }
        }
      }
      
      // 流结束时，确保所有内容都已更新到UI
      if (buffer.length > 0) {
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            return { ...m, content: assistantAccumulated, isStreaming: true };
          }
          return m;
        }));
        
        // 立即滚动到最新消息
        if (listRef.current) {
          // 使用requestAnimationFrame确保在下一帧执行滚动
          requestAnimationFrame(() => {
            if (listRef.current) {
              listRef.current.scrollToItem(messages.length - 1, "end");
            }
          });
        }
      }
    } finally {
      try { reader.releaseLock(); } catch {}
    }

    return assistantAccumulated;
  };

  // 发送消息
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !uploadedFileContent) || isLoading) return

    // 如果没有当前对话，创建新对话
    let chatId = currentChatId;
    const wasEmptyState = !chatId; // 记录是否处于空状态
    if (!chatId) {
      console.log('处于空状态，创建新对话');
      chatId = await createNewChat()
      console.log('新对话创建完成，chatId:', chatId);
    }

    // 检查是否有上传的字幕文件
    let userMessage: Message;
    if (uploadedFileContent && uploadedFileName) {
      // 如果有上传的字幕文件，创建包含文件信息的用户消息
      userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: inputValue.trim() || `已上传字幕文件：${uploadedFileName}`,
        timestamp: new Date(),
        type: 'file',
        fileName: uploadedFileName,
        fileContent: uploadedFileContent
      }
    } else {
      // 如果没有上传的字幕文件，创建普通用户消息
      userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: inputValue.trim(),
        timestamp: new Date(),
        type: 'text'
      }
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
    setInputValue('')
    // 清除上传的文件状态
    setUploadedFileContent(null)
    setUploadedFileName(null)
    setIsLoading(true)
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);
    
    // 添加调试日志
    console.log('handleSendMessage: 准备发送消息', {
      wasEmptyState,
      chatId,
      currentChatId,
      messagesLength: messages.length
    });

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      // 构建对话历史
      const conversationMessages = messages
        .filter(m => !m.isStreaming)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      // 检查用户消息是否包含字幕文件
      if (userMessage.type === 'file' && userMessage.fileContent) {
        // 如果包含字幕文件，将字幕内容添加到用户消息中
        const prompt = `字幕文件：${userMessage.fileName}

字幕内容：
${userMessage.fileContent}

${userMessage.content}`

        conversationMessages.push({
          role: 'user',
          content: prompt
        })
      } else {
        // 如果不包含字幕文件，直接使用用户输入的内容
        conversationMessages.push({
          role: 'user',
          content: userMessage.content
        })
      }

      // 使用流式端点，逐 token 追加
      console.log('发送流式请求到:', '/api/ai-chat/stream');
      console.log('请求参数:', { model: selectedModel, messagesCount: conversationMessages.length });
      
      const response = await fetch('/api/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: selectedModel,
          messages: conversationMessages,
          apiKey: config.modelScopeApiKey
        }),
        signal: newAbortController.signal
      });

      console.log('流式响应状态:', response.status, response.statusText);
      console.log('响应头Content-Type:', response.headers.get('content-type'));

      if (!response.ok || !response.body) {
        let errMsg = 'AI回复失败';
        try {
          const e = await response.json();
          errMsg = e?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccumulated = '';
      let buffer = ''; // 用于累积token的缓冲区
      let lastUpdate = Date.now(); // 上次更新时间
      const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
      const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // SSE: 按行解析
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith(':')) continue; // 注释行
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (delta) {
                const token = delta.content || '';
                // DeepSeek 可能有 reasoning_content，可按需拼接/分离
                // const reasoning = delta.reasoning_content || '';

                if (token) {
                  assistantAccumulated += token;
                  buffer += token;
                  console.log('收到token:', token, '累积内容长度:', assistantAccumulated.length);
                  
                  // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                  const contentLength = assistantAccumulated.length;
                  let updateInterval = BASE_UPDATE_INTERVAL;
                  let bufferSize = BASE_BUFFER_SIZE;
                  
                  // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                  if (contentLength > 1000) {
                    updateInterval = 70;  // 减少间隔
                    bufferSize = 15;     // 减少缓冲区
                  }
                  if (contentLength > 3000) {
                    updateInterval = 100;
                    bufferSize = 20;
                  }
                  if (contentLength > 5000) {
                    updateInterval = 130; // 减少间隔
                    bufferSize = 25;     // 减少缓冲区
                  }
                  
                  // 检查是否需要更新UI，确保更流畅的体验
                  const now = Date.now();
                  const shouldUpdate = 
                    buffer.length >= bufferSize || // 缓冲区满
                    now - lastUpdate >= updateInterval || // 时间间隔到了
                    contentLength < 100 || // 内容较少时保持流畅性
                    (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                  
                  if (shouldUpdate) {
                    // 实时更新消息 - 使用 flushSync 确保立即更新
                    flushSync(() => {
                      setMessages(prev => prev.map(m => {
                        if (m.id === assistantMessage.id) {
                          return { ...m, content: assistantAccumulated, isStreaming: true };
                        }
                        return m;
                      }));
                    });
                    // 重置缓冲区和时间
                    buffer = '';
                    lastUpdate = now;
                    
                    // 立即滚动到最新消息
                    if (listRef.current) {
                      // 使用requestAnimationFrame确保在下一帧执行滚动
                      requestAnimationFrame(() => {
                        if (listRef.current) {
                          // 确保滚动到最新的消息项（当前消息列表长度减1）
                          listRef.current.scrollToItem(messages.length - 1, "end");
                        }
                      });
                    }
                  }
                }
              }
            } catch (e) {
              console.log('解析JSON失败:', dataStr, e);
            }
          }
        }
        
        // 流结束时，确保所有内容都已更新到UI
        if (buffer.length > 0) {
          flushSync(() => {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMessage.id) {
                return { ...m, content: assistantAccumulated, isStreaming: true };
              }
              return m;
            }));
          });
          
          // 立即滚动到最新消息
          scrollToLatestMessage();
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }

      // 完成后关闭流式标记并生成建议
      const suggestions = await fetchSuggestions(assistantAccumulated);

      // 使用函数式更新确保使用最新的消息状态
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
        
        return finalMessages;
      });
      
      // 添加调试日志
      console.log('流式响应处理完成，准备调用updateCurrentChat', {
        chatId,
        currentChatId,
        wasEmptyState,
        assistantAccumulatedLength: assistantAccumulated.length
      });
      
      // 在状态更新完成后，使用setTimeout确保在下一个事件循环中调用updateCurrentChat
      setTimeout(() => {
        // 使用函数式更新获取最新的消息状态，并传递chatId
        setMessages(prevMessages => {
          console.log('在setTimeout中调用updateCurrentChat', {
            chatId,
            currentChatId,
            prevMessagesLength: prevMessages.length
          });
          updateCurrentChat(prevMessages, chatId);
          return prevMessages;
        });
      }, 0);

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
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
        console.error('发送消息失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === assistantMessage.id) {
            return {
              ...msg,
              content: `回复时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        await updateCurrentChat(errorMessages, chatId)

        toast.error('发送失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 复制消息内容
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('已复制到剪贴板')
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  // 获取后续问题建议
  const fetchSuggestions = async (lastMessage: string) => {
    // 确保始终返回默认建议
    const defaultSuggestions = ['深入探讨剧情细节', '了解世界观设定', '探索相关作品']
    
    try {
      // 获取API配置
      // 为配置请求创建AbortController
      const configAbortController = abortController || new AbortController();
      
      const configResponse = await fetch('/api/config', {
        signal: configAbortController.signal
      })
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        console.warn('API密钥未配置，返回默认建议')
        return defaultSuggestions
      }
      
      const config = configData.fullConfig

      // 构建对话历史（只保留最近几条消息以减少token消耗）
      // 确保messages不为空，并且过滤掉流式消息
      const recentMessages = messages && Array.isArray(messages) 
        ? messages
          .filter(m => !m.isStreaming)
          .slice(-3) // 只取最近3条消息
          .map(m => ({
            role: m.role,
            content: m.content
          }))
        : []

      // 如果recentMessages为空数组，添加一个默认的用户消息
      const finalMessages = recentMessages.length > 0 
        ? recentMessages 
        : [{ role: 'user', content: '开始对话' }]

      // 为suggestions请求创建AbortController（如果需要中断的话）
      const suggestionsAbortController = abortController || new AbortController();

      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: finalMessages,
          lastMessage: lastMessage,
          apiKey: config.modelScopeApiKey
        }),
        signal: suggestionsAbortController.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('获取建议失败:', errorData.error || 'API调用失败')
        return defaultSuggestions
      }

      const data = await response.json()
      
      if (!data.success) {
        console.error('获取建议失败:', data.error || '返回数据格式错误')
        return defaultSuggestions
      }

      // 确保返回的建议不为空且格式正确
      const suggestions = data.data.suggestions
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        console.warn('返回的建议为空或格式不正确，使用默认建议')
        return defaultSuggestions
      }

      // 优化建议内容：确保简洁且相关
      const validSuggestions = suggestions
        .map(s => {
          // 如果是字符串且非空
          if (typeof s === 'string') {
            // 清理内容，限制长度
            let cleaned = s.trim()
            // 移除可能的符号前缀（如数字、项目符号等）
            cleaned = cleaned.replace(/^[\d\-•*]\s*/, '')
            // 限制长度
            if (cleaned.length > 25) {
              cleaned = cleaned.substring(0, 22) + '...'
            }
            return cleaned
          }
          return ''
        })
        .filter(s => s.length > 0) // 过滤空字符串
        .slice(0, 3) // 确保最多返回3个建议
      
      if (validSuggestions.length === 0) {
        console.warn('没有有效的建议，使用默认建议')
        return defaultSuggestions
      }

      return validSuggestions
    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('获取建议请求已被用户中断');
        return defaultSuggestions;
      } else {
        console.error('获取建议失败:', error)
        return defaultSuggestions
      }
    }
  }

  // 重新生成回复
  // 中断AI回复
  const handleInterrupt = () => {
    if (abortController) {
      abortController.abort();
      setIsInterrupting(true);
    }
  }

  // 重新生成回复
  const regenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    // 找到对应的用户消息
    const userMessage = messages[messageIndex - 1]
    if (!userMessage || userMessage.role !== 'user') return

    // 移除当前助手消息及之后的所息
    const messagesBeforeRegenerate = messages.slice(0, messageIndex)
    
    // 创建新的助手消息
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
    setIsInterrupting(false) // 重置中断状态

    // 创建新的AbortController实例
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    try {
      // 获取API配置
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        throw new Error('请先在设置中配置魔搭社区API密钥')
      }
      
      const config = configData.fullConfig

      let response
      
      if (userMessage.type === 'file' && userMessage.fileContent) {
        // 重新生成分集简介
        const prompt = `请基于以下字幕内容生成一个精彩的分集简介：

字幕文件：${userMessage.fileName}

字幕内容：
${userMessage.fileContent}

要求：
1. 生成120-200字的分集简介
2. 突出主要情节和关键转折点
3. 保持悬念，不要剧透结局
4. 语言生动有趣，吸引观众
5. 符合中文表达习惯

请直接输出分集简介内容，不需要其他说明。`

        response = await fetch('/api/modelscope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
            apiKey: config.modelScopeApiKey
          }),
          signal: newAbortController.signal // 添加中断信号
        })
      } else {
        // 重新生成普通对话回复
        const conversationMessages = messagesBeforeRegenerate
          .filter(m => !m.isStreaming)
          .map(m => ({
            role: m.role,
            content: m.content
          }))

        response = await fetch('/api/modelscope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: conversationMessages,
            apiKey: config.modelScopeApiKey
          }),
          signal: newAbortController.signal // 添加中断信号
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '重新生成失败')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '重新生成失败')
      }

      // 获取后续问题建议
      const suggestions = await fetchSuggestions(data.data.content)

      // 更新消息内容 - 包含可能的引导Chips
      const finalMessages = updatedMessages.map(msg => {
        if (msg.id === newAssistantMessage.id) {
          return {
            ...msg,
            content: data.data.content,
            isStreaming: false,
            // 添加引导建议
            suggestions: suggestions
          }
        }
        return msg
      })

      setMessages(finalMessages)
      await updateCurrentChat(finalMessages)

      toast.success('重新生成完成')

    } catch (error: any) {
      // 检查是否是中断错误
      if (error.name === 'AbortError') {
        console.log('请求已被用户中断');
        // 更新消息显示中断状态
        const interruptedMessages = updatedMessages.map(msg => {
          if (msg.id === newAssistantMessage.id) {
            return {
              ...msg,
              content: '回复已被用户中断',
              isStreaming: false
            }
          }
          return msg
        })
        setMessages(interruptedMessages)
        updateCurrentChat(interruptedMessages)
        toast.info('已中断AI回复')
      } else {
        console.error('重新生成失败:', error)
        
        // 更新错误消息
        const errorMessages = updatedMessages.map(msg => {
          if (msg.id === newAssistantMessage.id) {
            return {
              ...msg,
              content: `重新生成时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        await updateCurrentChat(errorMessages)

        toast.error('重新生成失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false) // 重置中断状态
      setAbortController(null) // 清除AbortController
    }
  }

  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    
    if (isUser) {
      // 用户消息 - 气泡样式
      return (
        <div key={message.id} className="flex gap-3 py-4 justify-end">
          <div className="max-w-[70%] md:max-w-[60%] space-y-2 items-end">
            <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 ml-auto">
              {message.type === 'file' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span className="font-medium">{message.fileName}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>
            {/* 用户消息操作按钮 - 底部右下角 */}
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => copyMessage(message.content)}
                title="复制"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => regenerateResponse(message.id)}
                disabled={isLoading}
                title="重新生成"
              >
                <RotateCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
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
    } else {
      // AI回复 - 卡片式布局（无气泡）
      return (
        <div key={message.id} className={`${!message.isStreaming && message.role === 'assistant' && messages.indexOf(message) === messages.length - 1 ? 'pb-3' : 'py-3'} border-b border-gray-100 dark:border-gray-800 last:border-b-0`}>
          {/* AI头像和标题区域 - 与输入框对齐 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
          
          {/* AI回复内容 - 与头像左侧对齐 */}
          <div className="space-y-1">
            {message.type === 'file' ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Paperclip className="w-4 h-4" />
                  <span className="font-medium">{message.fileName}</span>
                </div>
                <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                  {message.isStreaming ? (
                    <div>
                      <Markdown>{message.content}</Markdown>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>正在生成回复...</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Markdown>{message.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                {message.isStreaming ? (
                  <div>
                    <Markdown>{message.content}</Markdown>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>正在生成回复...</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Markdown>{message.content}</Markdown>
                  </div>
                )}
              </div>
            )}
            
            {/* 操作按钮 - AI消息底部左下角 */}
            {!message.isStreaming && (
              <div className="flex justify-start gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => copyMessage(message.content)}
                  title="复制"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => regenerateResponse(message.id)}
                  disabled={isLoading}
                  title="重新生成"
                >
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            )}
            
            {/* 动态生成的引导Chips */}
            {!message.isStreaming && message.role === 'assistant' && (
              <div className="space-y-1 mt-6">
                <div className="flex flex-col gap-2">
                  {/* 固定的"一句话概括剧情"选项 */}
                  <button
                    className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                    onClick={() => {
                      // 直接发送，不经过输入框 - 完整实现发送逻辑
                      const handleDirectSend = async () => {
                        const content = "一句话概括剧情"
                        
                        // 如果没有当前对话，创建新对话
                        if (!currentChatId) {
                          createNewChat()
                        }
                        
                        const userMessage: Message = {
                          id: `msg-${Date.now()}`,
                          role: 'user',
                          content: content,
                          timestamp: new Date(),
                          type: 'text'
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
                        
                        try {
                          // 获取API配置
                          const configResponse = await fetch('/api/config')
                          const configData = await configResponse.json()
                          
                          if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                            throw new Error('请先在设置中配置魔搭社区API密钥')
                          }
                          
                          const config = configData.fullConfig
                          
                          // 构建对话历史
                          const conversationMessages = messages
                            .filter(m => !m.isStreaming)
                            .map(m => ({
                              role: m.role,
                              content: m.content
                            }))
                          
                          conversationMessages.push({
                            role: 'user',
                            content: content
                          })
                          
                          // 使用流式API而不是普通API，确保一致性
                          const response = await fetch('/api/ai-chat/stream', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                            body: JSON.stringify({
                              model: selectedModel,
                              messages: conversationMessages,
                              apiKey: config.modelScopeApiKey
                            })
                          })
                          
                          if (!response.ok || !response.body) {
                            let errMsg = 'AI回复失败';
                            try {
                              const e = await response.json();
                              errMsg = e?.error || errMsg;
                            } catch {}
                            throw new Error(errMsg);
                          }
                          
                          const reader = response.body.getReader();
                          const decoder = new TextDecoder();
                          let assistantAccumulated = '';
                          let buffer = ''; // 用于累积token的缓冲区
                          let lastUpdate = Date.now(); // 上次更新时间
                          const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                          const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                          try {
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });

                              // SSE: 按行解析
                              const lines = chunk.split('\n');
                              for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;
                                if (trimmed.startsWith(':')) continue; // 注释行
                                if (!trimmed.startsWith('data:')) continue;

                                const dataStr = trimmed.slice(5).trim();
                                if (dataStr === '[DONE]') {
                                  continue;
                                }

                                try {
                                  const parsed = JSON.parse(dataStr);
                                  const delta = parsed?.choices?.[0]?.delta;
                                  if (delta) {
                                    const token = delta.content || '';
                                    if (token) {
                                      assistantAccumulated += token;
                                      buffer += token;
                                      
                                      // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                                      const contentLength = assistantAccumulated.length;
                                      let updateInterval = BASE_UPDATE_INTERVAL;
                                      let bufferSize = BASE_BUFFER_SIZE;
                                      
                                      // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                                      if (contentLength > 1000) {
                                        updateInterval = 70;  // 减少间隔
                                        bufferSize = 15;     // 减少缓冲区
                                      }
                                      if (contentLength > 3000) {
                                        updateInterval = 100;
                                        bufferSize = 20;
                                      }
                                      if (contentLength > 5000) {
                                        updateInterval = 130; // 减少间隔
                                        bufferSize = 25;     // 减少缓冲区
                                      }
                                      
                                      // 检查是否需要更新UI，确保更流畅的体验
                                      const now = Date.now();
                                      const shouldUpdate = 
                                        buffer.length >= bufferSize || // 缓冲区满
                                        now - lastUpdate >= updateInterval || // 时间间隔到了
                                        contentLength < 100 || // 内容较少时保持流畅性
                                        (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                                      
                                      if (shouldUpdate) {
                                        // 实时更新消息 - 使用 flushSync 确保立即更新
                                        flushSync(() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === assistantMessage.id) {
                                              return { ...m, content: assistantAccumulated, isStreaming: true };
                                            }
                                            return m;
                                          }));
                                        });
                                        // 重置缓冲区和时间
                                        buffer = '';
                                        lastUpdate = now;
                                        
                                        // 立即滚动到最新消息，确保流式输出可见
                                        scrollToLatestMessage();
                                      }
                                    }
                                  }
                                } catch (e) {
                                  console.log('解析JSON失败:', dataStr, e);
                                }
                              }
                            }
                            
                            // 流结束时，确保所有内容都已更新到UI
                            if (buffer.length > 0) {
                              flushSync(() => {
                                setMessages(prev => prev.map(m => {
                                  if (m.id === assistantMessage.id) {
                                    return { ...m, content: assistantAccumulated, isStreaming: true };
                                  }
                                  return m;
                                }));
                              });
                              // 流结束时的最终滚动
                              scrollToLatestMessage();
                            }
                          } finally {
                            try { reader.releaseLock(); } catch {}
                          }

                          // 完成后关闭流式标记并生成建议
                          const suggestions = await fetchSuggestions(assistantAccumulated);

                          // 使用函数式更新确保使用最新的消息状态
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
                            
                            return finalMessages;
                          });
                          
                          // 流式输出结束后滚动到最新消息
                          scrollToLatestMessage();
                          
                          // 更新当前对话
                          setTimeout(() => {
                            setMessages(prevMessages => {
                              updateCurrentChat(prevMessages, currentChatId);
                              return prevMessages;
                            });
                          }, 0);
                          
                        } catch (error: any) {
                          console.error('发送消息失败:', error)
                          
                          // 更新错误消息
                          const errorMessages = updatedMessages.map(msg => {
                            if (msg.id === assistantMessage.id) {
                              return {
                                ...msg,
                                content: `回复时出现错误：${error.message}`,
                                isStreaming: false
                              }
                            }
                            return msg
                          })
                          
                          setMessages(errorMessages)
                          updateCurrentChat(errorMessages)
                          
                          toast.error('发送失败', {
                            description: error.message
                          })
                        } finally {
                          setIsLoading(false)
                        }
                      }
                      
                      handleDirectSend()
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">一句话概括剧情</span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </button>
                  
                  {/* 动态生成的建议选项 - 确保始终显示至少两个选项 */}
                  {message.suggestions && message.suggestions.length > 0 ? (
                    message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                        onClick={() => {
                          const handleDirectSend = async () => {
                            const content = suggestion
                            
                            // 如果没有当前对话，创建新对话
                            let chatId = currentChatId;
                            if (!chatId) {
                              chatId = await createNewChat();
                            }
                            
                            // 检查是否有上传的字幕文件
                            let userMessage: Message;
                            if (uploadedFileContent && uploadedFileName) {
                              // 如果有上传的字幕文件，创建包含文件信息的用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'file',
                                fileName: uploadedFileName,
                                fileContent: uploadedFileContent
                              }
                            } else {
                              // 如果没有上传的字幕文件，创建普通用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'text'
                              }
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
                            
                            try {
                              // 获取API配置
                              const configResponse = await fetch('/api/config')
                              const configData = await configResponse.json()
                              
                              if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                                throw new Error('请先在设置中配置魔搭社区API密钥')
                              }
                              
                              const config = configData.fullConfig
                              
                              // 构建对话历史
                              const conversationMessages = messages
                                .filter(m => !m.isStreaming)
                                .map(m => ({
                                  role: m.role,
                                  content: m.content
                                }))
                              
                              conversationMessages.push({
                                role: 'user',
                                content: content
                              })
                              
                              // 使用流式API而不是普通API，确保一致性
                              const response = await fetch('/api/ai-chat/stream', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                                body: JSON.stringify({
                                  model: selectedModel,
                                  messages: conversationMessages,
                                  apiKey: config.modelScopeApiKey
                                })
                              })
                              
                              if (!response.ok || !response.body) {
                                let errMsg = 'AI回复失败';
                                try {
                                  const e = await response.json();
                                  errMsg = e?.error || errMsg;
                                } catch {}
                                throw new Error(errMsg);
                              }
                              
                              const reader = response.body.getReader();
                              const decoder = new TextDecoder();
                              let assistantAccumulated = '';
                              let buffer = ''; // 用于累积token的缓冲区
                              let lastUpdate = Date.now(); // 上次更新时间
                              const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                              const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                              try {
                                while (true) {
                                  const { done, value } = await reader.read();
                                  if (done) break;
                                  const chunk = decoder.decode(value, { stream: true });

                                  // SSE: 按行解析
                                  const lines = chunk.split('\n');
                                  for (const line of lines) {
                                    const trimmed = line.trim();
                                    if (!trimmed) continue;
                                    if (trimmed.startsWith(':')) continue; // 注释行
                                    if (!trimmed.startsWith('data:')) continue;

                                    const dataStr = trimmed.slice(5).trim();
                                    if (dataStr === '[DONE]') {
                                      continue;
                                    }

                                    try {
                                      const parsed = JSON.parse(dataStr);
                                      const delta = parsed?.choices?.[0]?.delta;
                                      if (delta) {
                                        const token = delta.content || '';
                                        if (token) {
                                          assistantAccumulated += token;
                                          buffer += token;
                                          
                                          // 根据内容长度动态调整更新策略
                                          const contentLength = assistantAccumulated.length;
                                          let updateInterval = BASE_UPDATE_INTERVAL;
                                          let bufferSize = BASE_BUFFER_SIZE;
                                          
                                          // 内容越多，更新间隔越长，缓冲区越大
                                          if (contentLength > 1000) {
                                            updateInterval = 100;
                                            bufferSize = 20;
                                          }
                                          if (contentLength > 3000) {
                                            updateInterval = 150;
                                            bufferSize = 30;
                                          }
                                          if (contentLength > 5000) {
                                            updateInterval = 200;
                                            bufferSize = 40;
                                          }
                                          
                                          // 检查是否需要更新UI
                                          const now = Date.now();
                                          const shouldUpdate = 
                                            buffer.length >= bufferSize || // 缓冲区满
                                            now - lastUpdate >= updateInterval || // 时间间隔到了
                                            contentLength < 100; // 内容较少时保持流畅性
                                          
                                          if (shouldUpdate) {
                                            // 实时更新消息 - 使用 flushSync 确保立即更新
                                            flushSync(() => {
                                              setMessages(prev => prev.map(m => {
                                                if (m.id === assistantMessage.id) {
                                                  return { ...m, content: assistantAccumulated, isStreaming: true };
                                                }
                                                return m;
                                              }));
                                            });
                                            // 重置缓冲区和时间
                                            buffer = '';
                                            lastUpdate = now;
                                            
                                            // 立即滚动到最新消息，确保流式输出可见
                                            scrollToLatestMessage();
                                          }
                                        }
                                      }
                                    } catch (e) {
                                      console.log('解析JSON失败:', dataStr, e);
                                    }
                                  }
                                }
                                
                                // 流结束时，确保所有内容都已更新到UI
                                if (buffer.length > 0) {
                                  flushSync(() => {
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === assistantMessage.id) {
                                        return { ...m, content: assistantAccumulated, isStreaming: true };
                                      }
                                      return m;
                                    }));
                                  });
                                  // 流结束时的最终滚动
                                  scrollToLatestMessage();
                                }
                              } finally {
                                try { reader.releaseLock(); } catch {}
                              }

                              // 完成后关闭流式标记并生成建议
                              const suggestions = await fetchSuggestions(assistantAccumulated);

                              // 使用函数式更新确保使用最新的消息状态
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
                                
                                return finalMessages;
                              });
                              
                              // 流式输出结束后滚动到最新消息
                              scrollToLatestMessage();
                              
                              // 更新当前对话
                              setTimeout(() => {
                                setMessages(prevMessages => {
                                  updateCurrentChat(prevMessages, currentChatId);
                                  return prevMessages;
                                });
                              }, 0);
                              
                            } catch (error: any) {
                              console.error('发送消息失败:', error)
                              
                              // 更新错误消息
                              const errorMessages = updatedMessages.map(msg => {
                                if (msg.id === assistantMessage.id) {
                                  return {
                                    ...msg,
                                    content: `回复时出现错误：${error.message}`,
                                    isStreaming: false
                                  }
                                }
                                return msg
                              })
                              
                              setMessages(errorMessages)
                              updateCurrentChat(errorMessages)
                              
                              toast.error('发送失败', {
                                description: error.message
                              })
                            } finally {
                              setIsLoading(false)
                            }
                          }
                          
                          handleDirectSend()
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{suggestion}</span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </button>
                    ))
                  ) : (
                    // 如果没有动态建议，显示默认建议
                    <>
                      <button
                        className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                        onClick={() => {
                          const handleDirectSend = async () => {
                            const content = "深入探讨剧情细节"
                            
                            // 如果没有当前对话，创建新对话
                            let chatId = currentChatId;
                            if (!chatId) {
                              chatId = await createNewChat();
                            }
                            
                            // 检查是否有上传的字幕文件
                            let userMessage: Message;
                            if (uploadedFileContent && uploadedFileName) {
                              // 如果有上传的字幕文件，创建包含文件信息的用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'file',
                                fileName: uploadedFileName,
                                fileContent: uploadedFileContent
                              }
                            } else {
                              // 如果没有上传的字幕文件，创建普通用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'text'
                              }
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
                            
                            try {
                              // 获取API配置
                              const configResponse = await fetch('/api/config')
                              const configData = await configResponse.json()
                              
                              if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                                throw new Error('请先在设置中配置魔搭社区API密钥')
                              }
                              
                              const config = configData.fullConfig
                              
                              // 构建对话历史
                              const conversationMessages = messages
                                .filter(m => !m.isStreaming)
                                .map(m => ({
                                  role: m.role,
                                  content: m.content
                                }))
                              
                              conversationMessages.push({
                                role: 'user',
                                content: content
                              })
                              
                              // 使用流式API而不是普通API，确保一致性
                              const response = await fetch('/api/ai-chat/stream', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                                body: JSON.stringify({
                                  model: selectedModel,
                                  messages: conversationMessages,
                                  apiKey: config.modelScopeApiKey
                                })
                              })
                              
                              if (!response.ok || !response.body) {
                                let errMsg = 'AI回复失败';
                                try {
                                  const e = await response.json();
                                  errMsg = e?.error || errMsg;
                                } catch {}
                                throw new Error(errMsg);
                              }
                              
                              const reader = response.body.getReader();
                              const decoder = new TextDecoder();
                              let assistantAccumulated = '';
                              let buffer = ''; // 用于累积token的缓冲区
                              let lastUpdate = Date.now(); // 上次更新时间
                              const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                              const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                              try {
                                while (true) {
                                  const { done, value } = await reader.read();
                                  if (done) break;
                                  const chunk = decoder.decode(value, { stream: true });

                                  // SSE: 按行解析
                                  const lines = chunk.split('\n');
                                  for (const line of lines) {
                                    const trimmed = line.trim();
                                    if (!trimmed) continue;
                                    if (trimmed.startsWith(':')) continue; // 注释行
                                    if (!trimmed.startsWith('data:')) continue;

                                    const dataStr = trimmed.slice(5).trim();
                                    if (dataStr === '[DONE]') {
                                      continue;
                                    }

                                    try {
                                      const parsed = JSON.parse(dataStr);
                                      const delta = parsed?.choices?.[0]?.delta;
                                      if (delta) {
                                        const token = delta.content || '';
                                        if (token) {
                                          assistantAccumulated += token;
                                          buffer += token;
                                          
                                          // 根据内容长度动态调整更新策略
                                          const contentLength = assistantAccumulated.length;
                                          let updateInterval = BASE_UPDATE_INTERVAL;
                                          let bufferSize = BASE_BUFFER_SIZE;
                                          
                                          // 内容越多，更新间隔越长，缓冲区越大
                                          if (contentLength > 1000) {
                                            updateInterval = 100;
                                            bufferSize = 20;
                                          }
                                          if (contentLength > 3000) {
                                            updateInterval = 150;
                                            bufferSize = 30;
                                          }
                                          if (contentLength > 5000) {
                                            updateInterval = 200;
                                            bufferSize = 40;
                                          }
                                          
                                          // 检查是否需要更新UI
                                          const now = Date.now();
                                          const shouldUpdate = 
                                            buffer.length >= bufferSize || // 缓冲区满
                                            now - lastUpdate >= updateInterval || // 时间间隔到了
                                            contentLength < 100; // 内容较少时保持流畅性
                                          
                                          if (shouldUpdate) {
                                            // 实时更新消息 - 使用 flushSync 确保立即更新
                                            flushSync(() => {
                                              setMessages(prev => prev.map(m => {
                                                if (m.id === assistantMessage.id) {
                                                  return { ...m, content: assistantAccumulated, isStreaming: true };
                                                }
                                                return m;
                                              }));
                                            });
                                            // 重置缓冲区和时间
                                            buffer = '';
                                            lastUpdate = now;
                                            
                                            // 立即滚动到最新消息，确保流式输出可见
                                            scrollToLatestMessage();
                                          }
                                        }
                                      }
                                    } catch (e) {
                                      console.log('解析JSON失败:', dataStr, e);
                                    }
                                  }
                                }
                                
                                // 流结束时，确保所有内容都已更新到UI
                                if (buffer.length > 0) {
                                  flushSync(() => {
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === assistantMessage.id) {
                                        return { ...m, content: assistantAccumulated, isStreaming: true };
                                      }
                                      return m;
                                    }));
                                  });
                                  // 流结束时的最终滚动
                                  scrollToLatestMessage();
                                }
                              } finally {
                                try { reader.releaseLock(); } catch {}
                              }

                              // 完成后关闭流式标记并生成建议
                              const suggestions = await fetchSuggestions(assistantAccumulated);

                              // 使用函数式更新确保使用最新的消息状态
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
                                
                                return finalMessages;
                              });
                              
                              // 流式输出结束后滚动到最新消息
                              scrollToLatestMessage();
                              
                              // 更新当前对话
                              setTimeout(() => {
                                setMessages(prevMessages => {
                                  updateCurrentChat(prevMessages, currentChatId);
                                  return prevMessages;
                                });
                              }, 0);
                              
                            } catch (error: any) {
                              console.error('发送消息失败:', error)
                              
                              // 更新错误消息
                              const errorMessages = updatedMessages.map(msg => {
                                if (msg.id === assistantMessage.id) {
                                  return {
                                    ...msg,
                                    content: `回复时出现错误：${error.message}`,
                                    isStreaming: false
                                  }
                                }
                                return msg
                              })
                              
                              setMessages(errorMessages)
                              updateCurrentChat(errorMessages)
                              
                              toast.error('发送失败', {
                                description: error.message
                              })
                            } finally {
                              setIsLoading(false)
                            }
                          }
                          
                          handleDirectSend()
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">深入探讨剧情细节</span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </button>
                      <button
                        className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                        onClick={() => {
                          const handleDirectSend = async () => {
                            const content = "了解世界观设定"
                            
                            // 如果没有当前对话，创建新对话
                            let chatId = currentChatId;
                            if (!chatId) {
                              chatId = await createNewChat();
                            }
                            
                            // 检查是否有上传的字幕文件
                            let userMessage: Message;
                            if (uploadedFileContent && uploadedFileName) {
                              // 如果有上传的字幕文件，创建包含文件信息的用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'file',
                                fileName: uploadedFileName,
                                fileContent: uploadedFileContent
                              }
                            } else {
                              // 如果没有上传的字幕文件，创建普通用户消息
                              userMessage = {
                                id: `msg-${Date.now()}`,
                                role: 'user',
                                content: content,
                                timestamp: new Date(),
                                type: 'text'
                              }
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
                            
                            try {
                              // 获取API配置
                              const configResponse = await fetch('/api/config')
                              const configData = await configResponse.json()
                              
                              if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
                                throw new Error('请先在设置中配置魔搭社区API密钥')
                              }
                              
                              const config = configData.fullConfig
                              
                              // 构建对话历史
                              const conversationMessages = messages
                                .filter(m => !m.isStreaming)
                                .map(m => ({
                                  role: m.role,
                                  content: m.content
                                }))
                              
                              conversationMessages.push({
                                role: 'user',
                                content: content
                              })
                              
                              // 使用流式API而不是普通API，确保一致性
                              const response = await fetch('/api/ai-chat/stream', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                                body: JSON.stringify({
                                  model: selectedModel,
                                  messages: conversationMessages,
                                  apiKey: config.modelScopeApiKey
                                })
                              })
                              
                              if (!response.ok || !response.body) {
                                let errMsg = 'AI回复失败';
                                try {
                                  const e = await response.json();
                                  errMsg = e?.error || errMsg;
                                } catch {}
                                throw new Error(errMsg);
                              }
                              
                              const reader = response.body.getReader();
                              const decoder = new TextDecoder();
                              let assistantAccumulated = '';
                              let buffer = ''; // 用于累积token的缓冲区
                              let lastUpdate = Date.now(); // 上次更新时间
                              const BASE_UPDATE_INTERVAL = 50; // 基础更新间隔（毫秒）
                              const BASE_BUFFER_SIZE = 10; // 基础缓冲区大小

                              try {
                                while (true) {
                                  const { done, value } = await reader.read();
                                  if (done) break;
                                  const chunk = decoder.decode(value, { stream: true });

                                  // SSE: 按行解析
                                  const lines = chunk.split('\n');
                                  for (const line of lines) {
                                    const trimmed = line.trim();
                                    if (!trimmed) continue;
                                    if (trimmed.startsWith(':')) continue; // 注释行
                                    if (!trimmed.startsWith('data:')) continue;

                                    const dataStr = trimmed.slice(5).trim();
                                    if (dataStr === '[DONE]') {
                                      continue;
                                    }

                                    try {
                                      const parsed = JSON.parse(dataStr);
                                      const delta = parsed?.choices?.[0]?.delta;
                                      if (delta) {
                                        const token = delta.content || '';
                                        if (token) {
                                          assistantAccumulated += token;
                                          buffer += token;
                                          
                                          // 根据内容长度动态调整更新策略，但保持更流畅的更新频率
                                          const contentLength = assistantAccumulated.length;
                                          let updateInterval = BASE_UPDATE_INTERVAL;
                                          let bufferSize = BASE_BUFFER_SIZE;
                                          
                                          // 内容越多，适度增加更新间隔和缓冲区大小，但不过度增加
                                          if (contentLength > 1000) {
                                            updateInterval = 70;  // 减少间隔
                                            bufferSize = 15;     // 减少缓冲区
                                          }
                                          if (contentLength > 3000) {
                                            updateInterval = 100;
                                            bufferSize = 20;
                                          }
                                          if (contentLength > 5000) {
                                            updateInterval = 130; // 减少间隔
                                            bufferSize = 25;     // 减少缓冲区
                                          }
                                          
                                          // 检查是否需要更新UI，确保更流畅的体验
                                          const now = Date.now();
                                          const shouldUpdate = 
                                            buffer.length >= bufferSize || // 缓冲区满
                                            now - lastUpdate >= updateInterval || // 时间间隔到了
                                            contentLength < 100 || // 内容较少时保持流畅性
                                            (contentLength > 1000 && buffer.length >= 5); // 长内容时更频繁更新
                                          
                                          if (shouldUpdate) {
                                            // 实时更新消息 - 使用 flushSync 确保立即更新
                                            flushSync(() => {
                                              setMessages(prev => prev.map(m => {
                                                if (m.id === assistantMessage.id) {
                                                  return { ...m, content: assistantAccumulated, isStreaming: true };
                                                }
                                                return m;
                                              }));
                                            });
                                            // 重置缓冲区和时间
                                            buffer = '';
                                            lastUpdate = now;
                                            
                                            // 立即滚动到最新消息，确保流式输出可见
                                            scrollToLatestMessage();
                                          }
                                        }
                                      }
                                    } catch (e) {
                                      console.log('解析JSON失败:', dataStr, e);
                                    }
                                  }
                                }
                                
                                // 流结束时，确保所有内容都已更新到UI
                                if (buffer.length > 0) {
                                  flushSync(() => {
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === assistantMessage.id) {
                                        return { ...m, content: assistantAccumulated, isStreaming: true };
                                      }
                                      return m;
                                    }));
                                  });
                                  // 流结束时的最终滚动
                                  scrollToLatestMessage();
                                }
                              } finally {
                                try { reader.releaseLock(); } catch {}
                              }

                              // 完成后关闭流式标记并生成建议
                              const suggestions = await fetchSuggestions(assistantAccumulated);

                              // 使用函数式更新确保使用最新的消息状态
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
                                
                                return finalMessages;
                              });
                              
                              // 流式输出结束后滚动到最新消息
                              scrollToLatestMessage();
                              
                              // 更新当前对话
                              setTimeout(() => {
                                setMessages(prevMessages => {
                                  updateCurrentChat(prevMessages, currentChatId);
                                  return prevMessages;
                                });
                              }, 0);
                              
                            } catch (error: any) {
                              console.error('发送消息失败:', error)
                              
                              // 更新错误消息
                              const errorMessages = updatedMessages.map(msg => {
                                if (msg.id === assistantMessage.id) {
                                  return {
                                    ...msg,
                                    content: `回复时出现错误：${error.message}`,
                                    isStreaming: false
                                  }
                                }
                                return msg
                              })
                              
                              setMessages(errorMessages)
                              updateCurrentChat(errorMessages)
                              
                              toast.error('发送失败', {
                                description: error.message
                              })
                            } finally {
                              setIsLoading(false)
                            }
                          }
                          
                          handleDirectSend()
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">了解世界观设定</span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-950 overflow-hidden">
      {/* 左侧历史对话列表 */}
      <div className={cn("bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col", isSidebarCollapsed ? "w-0 hidden" : "w-64")}>
        {/* 顶部新对话按钮 */}
        <div className="p-3">
          <Button
            onClick={createNewChat}
            className="w-full h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 rounded-lg font-medium"
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            新对话
          </Button>
        </div>
        
        {/* 对话历史列表 */}
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
                onClick={async () => await switchChat(chat.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" title={chat.title}>
                        {chat.title.length > 11 ? chat.title.substring(0, 11) + '...' : chat.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {chat.updatedAt.toLocaleDateString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-gray-500" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* 空状态提示 */}
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

      {/* 右侧对话区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              variant="ghost"
            >
              {isSidebarCollapsed ? (
                <PanelRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <h1 className={`text-xl font-semibold text-gray-900 dark:text-gray-100 transition-all duration-500 ${isTitleAnimating ? 'scale-110 opacity-80' : 'scale-100 opacity-100'}`}>
                {currentChatId ? displayTitle : `${getTimeBasedGreeting()}，${userInfo?.displayName || '用户'}`}
              </h1>
            </div>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            // 空状态
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center max-w-2xl mx-auto px-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  你希望生成怎样的分集简介？
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-12 text-lg leading-relaxed">
                  上传字幕文件，AI将为您生成精彩的分集简介。也可以直接与AI对话交流。
                </p>
                
                {/* 功能卡片 */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div 
                    className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 cursor-pointer hover:shadow-lg transition-all duration-200 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">上传字幕</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      支持 .srt, .ass, .vtt 等格式
                    </p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30 cursor-pointer hover:shadow-lg transition-all duration-200 group">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">AI对话</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      与AI讨论剧情和创作想法
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 消息列表
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="max-w-4xl mx-auto pb-6">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="bg-white dark:bg-gray-950 p-6 overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div 
                className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-sm min-h-[120px] transition-all duration-200 ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
                    : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="px-6 pt-4">
                  {/* 文件上传显示和引导chips */}
                  {(uploadedFileName || isUploading) && (
                    <div className="mb-3">
                      <div className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl inline-flex items-center self-start max-w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          {isUploading ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                正在上传: {uploadedFileName}
                              </span>
                              <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{uploadProgress}%</span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                              {uploadedFileName}
                            </span>
                          )}
                          {/* X图标按钮用于取消上传 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 ml-2 flex-shrink-0"
                            onClick={handleCancelUpload}
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* 引导Chips */}
                      {!isUploading && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                            onClick={() => {
                              if (uploadedFileContent && uploadedFileName) {
                                handleGenerateEpisodeSummary(uploadedFileContent, uploadedFileName)
                                // 清除上传的文件状态
                                setUploadedFileContent(null)
                                setUploadedFileName(null)
                                setInputValue('')
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">生成分集简介</span>
                              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </button>
                        
                          <button
                            className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                            onClick={() => {
                              if (uploadedFileContent && uploadedFileName) {
                                // 发送基于字幕内容深度分析并总结剧情的请求
                                handleAnalyzeAndSummarizePlot(uploadedFileContent, uploadedFileName)
                                // 清除上传的文件状态
                                setUploadedFileContent(null)
                                setUploadedFileName(null)
                                setInputValue('')
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">基于字幕内容深度分析并总结剧情</span>
                              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </button>
                        
                          <button
                            className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
                            onClick={() => {
                              if (uploadedFileContent && uploadedFileName) {
                                // 发送写个让观众一眼就想看的简介的请求
                                handleCreateEngagingSummary(uploadedFileContent, uploadedFileName)
                                // 清除上传的文件状态
                                setUploadedFileContent(null)
                                setUploadedFileName(null)
                                setInputValue('')
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">写个让观众一眼就想看的简介</span>
                              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </button>
                        

                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 输入框 */}
                  <AutoResizeTextarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isDragOver ? "松开以上传字幕文件..." : "输入消息或上传字幕文件..."}
                    className="w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 text-base leading-6 py-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={isLoading}
                  />
                  
                  {/* 拖放提示 */}
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl pointer-events-none">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                        <p className="text-blue-600 dark:text-blue-400 font-medium">
                          拖放字幕文件到此处
                        </p>
                        <p className="text-blue-500 dark:text-blue-400 text-sm mt-1">
                          支持 {SUPPORTED_SUBTITLE_FORMATS.join(', ')} 格式
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 内部底部按钮区域 */}
                <div className="px-6 pb-3 flex items-center justify-between">
                  {/* 左侧按钮组 */}
                  <div className="flex items-center gap-2">
                    {/* 上传文件按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </Button>

                    {/* 模型选择按钮 */}
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-10 px-3 py-2 border-none bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full data-[placeholder]:text-gray-500 focus:ring-0 focus:ring-offset-0 [&>svg]:w-4 [&>svg]:h-4 flex items-center gap-1 text-sm [&>svg]:text-gray-500">
                        <span className="font-medium truncate max-w-[120px]">
                          {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[200px]">
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="py-1.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-sm">{model.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 右侧发送按钮 */}
                  <Button
                    size="sm"
                    className={cn(
                      "h-10 w-10 p-0 flex-shrink-0 rounded-full transition-all duration-200 relative z-10",
                      (inputValue.trim() || uploadedFileContent) && !isLoading
                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLoading) {
                        handleInterrupt();
                      } else {
                        handleSendMessage();
                      }
                    }}
                    disabled={(!inputValue.trim() && !uploadedFileContent) && !isLoading}
                  >
                    {isLoading ? (
                      isInterrupting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        // 使用正方形暂停图标，图标本身为深灰色，直接显示效果
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          {/* 旋转的圆环动画 */}
                          <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                          {/* 正方形暂停图标，使用深灰色 */}
                          <div className="flex gap-0.5">
                            <div className="w-1.5 h-1.5 bg-gray-700 dark:bg-gray-300"></div>
                            <div className="w-1.5 h-1.5 bg-gray-700 dark:bg-gray-300"></div>
                          </div>
                        </div>
                      )
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_SUBTITLE_FORMATS.join(',')}
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
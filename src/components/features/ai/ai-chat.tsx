"use client"

import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { ScrollArea } from "@/components/common/scroll-area"
import { Badge } from "@/components/common/badge"
import { Separator } from "@/components/common/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/dialog"
import { Textarea } from "@/components/common/textarea"
import { UserAvatarImage } from "@/components/common/smart-avatar"
import { useUser } from "@/components/features/auth/user-identity-provider"
import { Markdown } from "@/components/common/markdown"
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
  Pause,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useScenarioModels } from "@/lib/hooks/useScenarioModels"
import { useModelService } from "@/lib/contexts/ModelServiceContext"
import { chatSyncManager } from "@/lib/utils/chat-history-cache"
import { Message, ChatHistory } from "@/types/ai-chat"

// 字幕任务配置类型
interface SubtitleTaskConfig {
  taskName: string
  messageType: 'text' | 'episode-summary'
  promptBuilder: (content: string, fileName: string) => string
  successMessage: string
  errorPrefix: string
  includeUserMessage?: boolean
}

// 字幕任务配置对象
const SUBTITLE_TASKS: Record<string, SubtitleTaskConfig> = {
  generateSummary: {
    taskName: '生成分集简介',
    messageType: 'episode-summary',
    promptBuilder: (content, fileName) => `请基于以下字幕内容生成分集简介：

字幕文件：${fileName}

字幕内容：
${content}`,
    successMessage: '分集简介生成完成',
    errorPrefix: '生成分集简介',
    includeUserMessage: true
  },
  analyzeDialogues: {
    taskName: '分析角色对话',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容分析主要角色的对话特点：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 分析主要角色的语言风格和表达习惯
2. 总结每个角色的性格特点
3. 指出角色之间的关系和互动模式
4. 提取具有代表性的对话片段
5. 用中文输出，条理清晰

请直接输出分析结果，不需要其他说明。`,
    successMessage: '角色对话分析完成',
    errorPrefix: '分析角色对话',
    includeUserMessage: false
  },
  extractPlots: {
    taskName: '提取关键情节',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容提取关键情节：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 按时间顺序列出5-10个关键情节
2. 简要描述每个情节的内容和意义
3. 标注情节中的重要转折点
4. 指出主要冲突和解决方案
5. 用中文输出，条理清晰

请直接输出关键情节列表，不需要其他说明。`,
    successMessage: '关键情节提取完成',
    errorPrefix: '提取关键情节',
    includeUserMessage: false
  },
  analyzePlot: {
    taskName: '分析并总结剧情',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容进行深度剧情分析：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 分析主要剧情线索和发展脉络
2. 总结核心冲突和矛盾
3. 探讨主题思想和深层含义
4. 分析叙事手法和结构特点
5. 用中文输出，条理清晰

请直接输出分析结果，不需要其他说明。`,
    successMessage: '剧情分析完成',
    errorPrefix: '分析剧情',
    includeUserMessage: false
  },
  createEngaging: {
    taskName: '创建吸引人的简介',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容创建一个吸引人的剧集简介：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 简介长度控制在150-250字
2. 突出最吸引人的情节点
3. 营造悬念感，激发观看兴趣
4. 语言生动，富有感染力
5. 用中文输出

请直接输出简介内容，不需要其他说明。`,
    successMessage: '吸引人的简介创建完成',
    errorPrefix: '创建简介',
    includeUserMessage: false
  }
}

// 支持的字幕文件格式
const SUPPORTED_SUBTITLE_FORMATS = ['.srt', '.ass', '.vtt', '.ssa', '.sub']

// 流式响应处理Hook
const useStreamResponse = () => {
  const processStream = useCallback(async (
    response: Response,
    messageId: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    scrollToLatestMessage: () => void
  ) => {
    if (!response.body) throw new Error('Response body is null');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantAccumulated = '';
    let lineBuffer = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;

        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed?.choices?.[0]?.delta;
            if (delta?.content) {
              assistantAccumulated += delta.content;
              buffer += delta.content;
              
              if (buffer.length >= 2) {
                flushSync(() => {
                  setMessages(prev => prev.map(m =>
                    m.id === messageId
                      ? { ...m, content: assistantAccumulated, isStreaming: true }
                      : m
                  ));
                });
                buffer = '';
                scrollToLatestMessage();
              }
            }
          } catch (e) {
            console.warn('SSE解析失败，跳过此行:', dataStr.substring(0, 100));
          }
        }
      }
      
      if (buffer.length > 0) {
        flushSync(() => {
          setMessages(prev => prev.map(m =>
            m.id === messageId
              ? { ...m, content: assistantAccumulated, isStreaming: true }
              : m
          ));
        });
      }
      
      return assistantAccumulated;
    } finally {
      try { 
        if (reader.locked) {
          reader.releaseLock(); 
        }
      } catch {}
    }
  }, []);

  return { processStream };
};

// AI配置获取Hook
const useAIConfig = () => {
  const getConfig = useCallback(async (abortController?: AbortController) => {
    const configResponse = await fetch('/api/system/config', {
      signal: abortController?.signal
    });
    const configData = await configResponse.json();
    
    if (!configData.success) {
      throw new Error(configData.error || '获取配置失败');
    }
    
    return configData.fullConfig;
  }, []);

  return { getConfig };
};

// 自适应高度的Textarea组件
const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, forwardedRef) => {
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

  // 合并ref - 同时支持内部ref和外部forwardedRef
  useEffect(() => {
    if (typeof forwardedRef === 'function') {
      forwardedRef(textareaRef.current)
    } else if (forwardedRef) {
      forwardedRef.current = textareaRef.current
    }
  }, [forwardedRef])

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
  // 自定义Hooks
  const { processStream } = useStreamResponse();
  const { getConfig } = useAIConfig();
  
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInterrupting, setIsInterrupting] = useState(false)
  const [mainAbortController, setMainAbortController] = useState<AbortController | null>(null)
  const titleAbortControllerRef = useRef<AbortController | null>(null)
  const suggestionsAbortControllerRef = useRef<AbortController | null>(null)

  // 使用场景模型配置
  const scenarioModels = useScenarioModels('ai_chat')
  const [selectedModel, setSelectedModel] = useState<string>('');
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

// 获取当前模型的API密钥和模型ID - 优化版本
  const { getScenarioModels } = useModelService();
  
  const getModelInfo = useCallback(async (modelId: string) => {
    const currentModel = scenarioModels.availableModels.find(m => m.id === modelId);
    if (!currentModel) {
      throw new Error('请先选择一个AI模型');
    }

    // 获取AI聊天场景的提供商信息
    const aiChatData = getScenarioModels('ai_chat');
    const provider = aiChatData.providers.find(p => p.id === currentModel.providerId);
    
    if (!provider) {
      throw new Error('找不到模型提供商配置');
    }

    const apiKey = provider.apiKey;
    if (!apiKey) {
      throw new Error('请先在模型服务中配置API密钥');
    }

    return {
      apiKey,
      modelId: currentModel.modelId || currentModel.id // 使用实际的模型ID
    };
  }, [scenarioModels, getScenarioModels]);

  // 同步模型选择
  useEffect(() => {
    if (scenarioModels.availableModels.length > 0) {
      // 如果没有选择的模型或选择的模型不在可用列表中，使用主模型
      if (!selectedModel || !scenarioModels.availableModels.find(m => m.id === selectedModel)) {
        const primaryModel = scenarioModels.getCurrentModel()
        if (primaryModel) {
          setSelectedModel(primaryModel.id)
        }
      }
    }
  }, [scenarioModels.availableModels, scenarioModels.primaryModelId, selectedModel])

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
    requestAnimationFrame(() => {
      scrollToBottom(true)
    })
  }, [scrollToBottom])

  // 统一的消息滚动处理
  useEffect(() => {
    if (messages.length === 0) return

    const hasStreamingMessage = messages.some(m => m.isStreaming)
    
    const rafId = requestAnimationFrame(() => {
      if (hasStreamingMessage) {
        scrollToLatestMessage()
      } else {
        scrollToBottom(false)
      }
    })
    
    return () => cancelAnimationFrame(rafId)
  }, [messages, scrollToBottom, scrollToLatestMessage])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      try {
        if (mainAbortController && !mainAbortController.signal.aborted) {
          mainAbortController.abort('Component unmounted');
        }
      } catch (e) {
        console.debug('mainAbortController cleanup error:', e);
      }
      
      try {
        if (titleAbortControllerRef.current && !titleAbortControllerRef.current.signal.aborted) {
          titleAbortControllerRef.current.abort('Component unmounted');
        }
      } catch (e) {
        console.debug('titleAbortController cleanup error:', e);
      }
      
      try {
        if (suggestionsAbortControllerRef.current && !suggestionsAbortControllerRef.current.signal.aborted) {
          suggestionsAbortControllerRef.current.abort('Component unmounted');
        }
      } catch (e) {
        console.debug('suggestionsAbortController cleanup error:', e);
      }
    };
  }, [mainAbortController]);



  // 初始化缓存管理器并加载对话历史
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // 确保缓存管理器已初始化
        await chatSyncManager.getAllChatHistories()
        // 加载对话历史
        await loadChatHistories()
      } catch (error) {
        console.error('初始化聊天功能失败:', error)
      }
    }
    
    initializeChat()
  }, [])

  // 从缓存或服务器加载对话历史
  const loadChatHistories = async () => {
    try {
      // 使用缓存管理器智能加载
      const histories = await chatSyncManager.getAllChatHistories()
      setChatHistories(histories)
    } catch (error) {
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
          })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // 按更新时间倒序排序
          setChatHistories(histories)
        }
      } catch (localError) {
        console.error('从本地存储加载失败:', localError)
      }
    }
  }

  // 保存对话历史到缓存和服务器（优化版）
  const saveChatHistories = async (histories: ChatHistory[]) => {
    try {
      // 使用缓存管理器批量更新
      for (const history of histories) {
        await chatSyncManager.queueUpdate(history)
      }
    } catch (error) {
      console.error('保存对话历史失败:', error)
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
    // 如果点击的是当前对话，直接返回，不做任何操作
    if (currentChatId === chatId) {
      return;
    }
    
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

  // 删除对话（优化版，使用缓存管理器）
  const deleteChat = async (chatId: string) => {
    try {
      // 使用缓存管理器删除
      await chatSyncManager.deleteChatHistory(chatId)
    } catch (error) {
      console.error('删除对话失败:', error)
    }
    
    // 从本地状态删除
    const updatedHistories = chatHistories.filter(h => h.id !== chatId)
    setChatHistories(updatedHistories)
    
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
        // 获取模型信息
        const { apiKey, modelId } = await getModelInfo(selectedModel);

        // 为标题生成请求创建独立的AbortController
        if (titleAbortControllerRef.current && !titleAbortControllerRef.current.signal.aborted) {
          titleAbortControllerRef.current.abort('New title generation started');
        }
        titleAbortControllerRef.current = new AbortController();

        // 使用与流式输出相同的API端点生成标题
        const response = await fetch('/api/media/generate-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelId,
            firstMessage: firstAssistantResponse,
            apiKey
          }),
          signal: titleAbortControllerRef.current.signal
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
        if (error?.name === 'AbortError') {
          // 重新抛出中断错误
          throw error;
        }
        
        // 如果是429错误且还有重试次数，继续重试
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('429') && retries < maxRetries) {
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
  // 更新当前对话（优化版，使用缓存管理器）
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
            
            // 使用缓存管理器异步更新，不阻塞UI
            chatSyncManager.queueUpdate(updatedHistories.find(chat => chat.id === currentChatIdValue)!);
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
              
              // 使用缓存管理器异步更新，不阻塞UI
              chatSyncManager.queueUpdate(updatedHistories.find(chat => chat.id === currentChatIdValue)!);
              return updatedHistories;
            });
          }).catch(error => {
            // 忽略组件卸载导致的中断错误
            const errorMessage = error?.message || String(error);
            if (error?.name === 'AbortError' || errorMessage.includes('Component unmounted') || errorMessage.includes('aborted')) {
              console.log('标题生成被中断（组件卸载或新请求）');
              return;
            }
            
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
              
              // 使用缓存管理器异步更新，不阻塞UI
              chatSyncManager.queueUpdate(updatedHistories.find(chat => chat.id === currentChatIdValue)!);
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
          
          // 使用缓存管理器异步更新，不阻塞UI
          chatSyncManager.queueUpdate(updatedHistories.find(chat => chat.id === currentChatIdValue)!);
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
        
        // 使用缓存管理器异步更新，不阻塞UI
        chatSyncManager.queueUpdate(updatedHistories.find(chat => chat.id === currentChatIdValue)!);
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

  // 统一的字幕任务处理函数
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
      const apiConfig = await getConfig(newAbortController);
      
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

    } catch (error: any) {
      if (error.name === 'AbortError') {
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
              content: `${config.errorPrefix}时出现错误：${error.message}`,
              isStreaming: false
            }
          }
          return msg
        })

        setMessages(errorMessages)
        updateCurrentChat(errorMessages, chatId)

        toast.error(`${config.taskName}失败`, {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }, [currentChatId, messages, selectedModel, createNewChat, getConfig, getModelInfo, processStream, scrollToLatestMessage, updateCurrentChat])

  // 字幕处理函数包装器
  const handleGenerateEpisodeSummary = useCallback((subtitleContent: string, fileName: string) => 
    handleSubtitleTask('generateSummary', subtitleContent, fileName), [handleSubtitleTask])

  const handleAnalyzeCharacterDialogues = useCallback((subtitleContent: string, fileName: string) => 
    handleSubtitleTask('analyzeDialogues', subtitleContent, fileName), [handleSubtitleTask])

  const handleExtractKeyPlotPoints = useCallback((subtitleContent: string, fileName: string) => 
    handleSubtitleTask('extractPlots', subtitleContent, fileName), [handleSubtitleTask])

  const handleAnalyzeAndSummarizePlot = useCallback((subtitleContent: string, fileName: string) => 
    handleSubtitleTask('analyzePlot', subtitleContent, fileName), [handleSubtitleTask])

  const handleCreateEngagingSummary = useCallback((subtitleContent: string, fileName: string) => 
    handleSubtitleTask('createEngaging', subtitleContent, fileName), [handleSubtitleTask])

  // 通用流式处理函数
  const handleStreamResponse = async (
    messages: any[], 
    assistantMessageId: string,
    abortController: AbortController
  ) => {
    const response = await fetch('/api/ai/ai-chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        model: (await getModelInfo(selectedModel)).modelId,
        messages,
        apiKey: (await getModelInfo(selectedModel)).apiKey
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

    const assistantAccumulated = await processStream(response, assistantMessageId, setMessages, scrollToLatestMessage);

    return assistantAccumulated;
  };

  // 获取后续问题建议
  const fetchSuggestions = async (lastMessage: string) => {
    const defaultSuggestions = ['深入探讨剧情细节', '了解世界观设定', '探索相关作品']
    
    try {
      if (suggestionsAbortControllerRef.current && !suggestionsAbortControllerRef.current.signal.aborted) {
        suggestionsAbortControllerRef.current.abort('New suggestions request started');
      }
      suggestionsAbortControllerRef.current = new AbortController();
      
      const configResponse = await fetch('/api/system/config', {
        signal: suggestionsAbortControllerRef.current.signal
      })
      const configData = await configResponse.json()
      
      if (!configData.success || !configData.fullConfig.modelScopeApiKey) {
        console.warn('API密钥未配置，返回默认建议')
        return defaultSuggestions
      }
      
      const config = configData.fullConfig

      const recentMessages = messages && Array.isArray(messages) 
        ? messages
          .filter(m => !m.isStreaming)
          .slice(-3)
          .map(m => ({
            role: m.role,
            content: m.content
          }))
        : []

      const finalMessages = recentMessages.length > 0 
        ? recentMessages 
        : [{ role: 'user', content: '开始对话' }]

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: (await getModelInfo(selectedModel)).modelId,
          messages: finalMessages,
          lastMessage: lastMessage,
          apiKey: (await getModelInfo(selectedModel)).apiKey
        }),
        signal: suggestionsAbortControllerRef.current.signal
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

      const suggestions = data.data.suggestions
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        console.warn('返回的建议为空或格式不正确，使用默认建议')
        return defaultSuggestions
      }

      const validSuggestions = suggestions
        .map(s => {
          if (typeof s === 'string') {
            let cleaned = s.trim()
            cleaned = cleaned.replace(/^[\d\-•*]\s*/, '')
            if (cleaned.length > 25) {
              cleaned = cleaned.substring(0, 22) + '...'
            }
            return cleaned
          }
          return ''
        })
        .filter(s => s.length > 0)
        .slice(0, 3)
      
      if (validSuggestions.length === 0) {
        console.warn('没有有效的建议，使用默认建议')
        return defaultSuggestions
      }

      return validSuggestions
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('获取建议请求已被用户中断');
        return defaultSuggestions;
      } else {
        console.error('获取建议失败:', error)
        return defaultSuggestions
      }
    }
  }

  // 统一的AI请求处理函数
  interface AIRequestOptions {
    userContent: string
    userMessageType?: 'text' | 'file'
    fileName?: string
    fileContent?: string
    conversationHistory?: Message[]
    assistantMessageType?: 'text' | 'episode-summary'
    clearInput?: boolean
  }

  const handleAIRequest = useCallback(async (options: AIRequestOptions) => {
    const {
      userContent,
      userMessageType = 'text',
      fileName,
      fileContent,
      conversationHistory = messages,
      assistantMessageType = 'text',
      clearInput = false
    } = options

    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
      type: userMessageType,
      ...(fileName && { fileName }),
      ...(fileContent && { fileContent })
    }

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: assistantMessageType,
      isStreaming: true
    }

    const updatedMessages = [...conversationHistory, userMessage, assistantMessage]
    setMessages(updatedMessages)
    
    if (clearInput) {
      setInputValue('')
      setUploadedFileContent(null)
      setUploadedFileName(null)
    }
    
    setIsLoading(true)
    setIsInterrupting(false)

    const newAbortController = new AbortController();
    setMainAbortController(newAbortController);

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel);

      const conversationMessages = conversationHistory
        .filter(m => !m.isStreaming)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      if (userMessageType === 'file' && fileContent) {
        const prompt = `字幕文件：${fileName}

字幕内容：
${fileContent}

${userContent}`
        conversationMessages.push({
          role: 'user',
          content: prompt
        })
      } else {
        conversationMessages.push({
          role: 'user',
          content: userContent
        })
      }

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: modelId,
          messages: conversationMessages,
          apiKey
        }),
        signal: newAbortController.signal
      })

      if (response.status === 429) {
        throw new Error('当前模型已达到调用上限，请切换其他模型或稍后再试');
      }

      if (!response.ok || !response.body) {
        let errMsg = 'AI回复失败';
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

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prevMessages => {
          const interruptedMessages = prevMessages.map(msg => {
            if (msg.id === assistantMessage.id) {
              const currentContent = msg.content || '';
              return {
                ...msg,
                content: currentContent || '回复已被用户中断',
                isStreaming: false
              }
            }
            return msg
          })
          updateCurrentChat(interruptedMessages, chatId)
          return interruptedMessages
        })
        toast.info('已中断AI回复')
      } else {
        console.error('AI回复失败:', error)
        
        setMessages(prevMessages => {
          const errorMessages = prevMessages.map(msg => {
            if (msg.id === assistantMessage.id) {
              const currentContent = msg.content || '';
              return {
                ...msg,
                content: currentContent || `AI回复时出现错误：${error.message}`,
                isStreaming: false
              }
            }
            return msg
          })
          updateCurrentChat(errorMessages, chatId)
          return errorMessages
        })

        toast.error('发送失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }, [currentChatId, messages, selectedModel, createNewChat, getModelInfo, processStream, scrollToLatestMessage, updateCurrentChat])

  // 中断AI生成
  const handleInterrupt = useCallback(() => {
    if (mainAbortController && !mainAbortController.signal.aborted) {
      setIsInterrupting(true)
      mainAbortController.abort('User interrupted')
      toast.info('正在停止生成...')
    }
  }, [mainAbortController])

  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  // 编辑框ref
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 开始编辑消息
  const startEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    
    // 使用setTimeout确保DOM更新后再操作
    setTimeout(() => {
      if (editTextareaRef.current) {
        const textarea = editTextareaRef.current
        // 将光标移动到文本末尾
        textarea.focus()
        textarea.setSelectionRange(content.length, content.length)
        // 滚动到光标位置
        textarea.scrollTop = textarea.scrollHeight
      }
    }, 100)
  }, [])

  // 取消编辑
  const cancelEditMessage = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent('')
  }, [])

  // 保存编辑后的消息
  const saveEditedMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const originalMessage = messages[messageIndex]
    
    // 更新消息内容
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

    // 如果是用户消息，需要重新生成AI回复
    if (originalMessage.role === 'user') {
      // 删除该消息之后的所有消息
      const messagesBeforeEdit = updatedMessages.slice(0, messageIndex + 1)
      setMessages(messagesBeforeEdit)
      setEditingMessageId(null)
      setEditingContent('')

      // 使用编辑后的内容重新发送请求
      await handleAIRequest({
        userContent: editingContent,
        userMessageType: originalMessage.type,
        fileName: originalMessage.fileName,
        fileContent: originalMessage.fileContent,
        conversationHistory: messagesBeforeEdit.slice(0, -1),
        clearInput: false
      })
    } else {
      // 如果是AI消息，只更新内容
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      setEditingMessageId(null)
      setEditingContent('')
      toast.success('消息已更新')
    }
  }, [messages, editingContent, handleAIRequest, updateCurrentChat])

  // 继续生成
  const continueGeneration = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const lastAssistantMessage = messages[messageIndex]
    if (lastAssistantMessage.role !== 'assistant') return

    // 创建一个新的助手消息来接收继续生成的内容
    const newAssistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: lastAssistantMessage.type,
      isStreaming: true
    }

    const updatedMessages = [...messages, newAssistantMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setIsInterrupting(false)

    const newAbortController = new AbortController()
    setMainAbortController(newAbortController)

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel)

      // 构建对话历史，包含之前的所有消息
      const conversationMessages = messages
        .filter(m => !m.isStreaming)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      // 添加简洁的继续生成提示
      conversationMessages.push({
        role: 'user',
        content: '继续'
      })

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: modelId,
          messages: conversationMessages,
          apiKey
        }),
        signal: newAbortController.signal
      })

      if (response.status === 429) {
        throw new Error('当前模型已达到调用上限，请切换其他模型或稍后再试');
      }

      if (!response.ok || !response.body) {
        let errMsg = '继续生成失败'
        try {
          const e = await response.json()
          errMsg = e?.error || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      const assistantAccumulated = await processStream(response, newAssistantMessage.id, setMessages, scrollToLatestMessage)
      const suggestions = await fetchSuggestions(assistantAccumulated)

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m => {
          if (m.id === newAssistantMessage.id) {
            return {
              ...m,
              content: assistantAccumulated,
              isStreaming: false,
              suggestions,
              canContinue: true
            }
          }
          return m
        })
        
        updateCurrentChat(finalMessages)
        return finalMessages
      })
      
      scrollToLatestMessage()
      toast.success('继续生成完成')

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prevMessages => {
          const interruptedMessages = prevMessages.map(msg => {
            if (msg.id === newAssistantMessage.id) {
              const currentContent = msg.content || '';
              return {
                ...msg,
                content: currentContent || '回复已被用户中断',
                isStreaming: false
              }
            }
            return msg
          })
          updateCurrentChat(interruptedMessages)
          return interruptedMessages
        })
        toast.info('已中断AI回复')
      } else {
        console.error('继续生成失败:', error)
        
        setMessages(prevMessages => {
          const errorMessages = prevMessages.map(msg => {
            if (msg.id === newAssistantMessage.id) {
              const currentContent = msg.content || '';
              return {
                ...msg,
                content: currentContent || `继续生成时出现错误：${error.message}`,
                isStreaming: false
              }
            }
            return msg
          })
          updateCurrentChat(errorMessages)
          return errorMessages
        })

        toast.error('继续生成失败', {
          description: error.message
        })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }, [messages, selectedModel, getModelInfo, processStream, scrollToLatestMessage, fetchSuggestions, updateCurrentChat])

  // 点赞/点踩消息
  const rateMessage = useCallback(async (messageId: string, rating: 'like' | 'dislike' | null) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const updatedMessages = messages.map(m => {
      if (m.id === messageId) {
        // 如果点击相同的评分，则取消评分
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
    
    // 收集反馈数据（用于后续分析改进）
    if (rating && message.rating !== rating) {
      try {
        // 记录反馈信息到本地存储或发送到服务器
        const feedbackData = {
          messageId,
          rating,
          content: message.content,
          timestamp: new Date().toISOString(),
          chatId: currentChatId,
          model: selectedModel
        }
        
        // 保存到本地存储
        const existingFeedback = localStorage.getItem('ai-chat-feedback')
        const feedbackList = existingFeedback ? JSON.parse(existingFeedback) : []
        feedbackList.push(feedbackData)
        localStorage.setItem('ai-chat-feedback', JSON.stringify(feedbackList))
        
        // 可选：发送到服务器进行分析
        // await fetch('/api/ai/feedback', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(feedbackData)
        // })
      } catch (error) {
        console.error('保存反馈数据失败:', error)
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
  }, [messages, currentChatId, selectedModel, updateCurrentChat])

  // 删除消息
  const deleteMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const messageToDelete = messages[messageIndex]
    
    // 如果是用户消息，删除该消息及其后的所有消息
    if (messageToDelete.role === 'user') {
      const updatedMessages = messages.slice(0, messageIndex)
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      toast.success('消息及后续回复已删除')
    } else {
      // 如果是AI消息，只删除该消息
      const updatedMessages = messages.filter(m => m.id !== messageId)
      setMessages(updatedMessages)
      await updateCurrentChat(updatedMessages)
      toast.success('消息已删除')
    }
  }, [messages, updateCurrentChat])

  // 复制消息内容
  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('已复制到剪贴板')
    } catch (error) {
      toast.error('复制失败')
    }
  }, [])

  // 处理快捷回复
  const handleQuickReply = useCallback(async (content: string) => {
    await handleAIRequest({
      userContent: content
    })
  }, [handleAIRequest])

  // 发送消息
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !uploadedFileContent) || isLoading) return

    await handleAIRequest({
      userContent: uploadedFileContent && uploadedFileName
        ? (inputValue.trim() || `已上传字幕文件：${uploadedFileName}`)
        : inputValue.trim(),
      userMessageType: uploadedFileContent ? 'file' : 'text',
      fileName: uploadedFileName || undefined,
      fileContent: uploadedFileContent || undefined,
      clearInput: true
    })
  }

  // 重新生成回复
  const regenerateResponse = async (messageId: string) => {
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
    setIsInterrupting(false)

    const newAbortController = new AbortController()
    setMainAbortController(newAbortController)

    try {
      const { apiKey, modelId } = await getModelInfo(selectedModel)

      // 构建对话历史
      const conversationMessages = messagesBeforeRegenerate
        .filter(m => !m.isStreaming)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      const response = await fetch('/api/ai/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: modelId,
          messages: conversationMessages,
          apiKey
        }),
        signal: newAbortController.signal
      })

      if (response.status === 429) {
        throw new Error('当前模型已达到调用上限，请切换其他模型或稍后再试');
      }

      if (!response.ok || !response.body) {
        let errMsg = '重新生成失败'
        try {
          const e = await response.json()
          errMsg = e?.error || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      const assistantAccumulated = await processStream(response, newAssistantMessage.id, setMessages, scrollToLatestMessage)
      const suggestions = await fetchSuggestions(assistantAccumulated)

      setMessages(prevMessages => {
        const finalMessages = prevMessages.map(m => {
          if (m.id === newAssistantMessage.id) {
            return {
              ...m,
              content: assistantAccumulated,
              isStreaming: false,
              suggestions
            }
          }
          return m
        })
        
        updateCurrentChat(finalMessages)
        return finalMessages
      })
      
      scrollToLatestMessage()
      toast.success('重新生成完成')

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prevMessages => {
          const interruptedMessages = prevMessages.map(msg => {
            if (msg.id === newAssistantMessage.id) {
              const currentContent = msg.content || '';
              return { ...msg, content: currentContent || '回复已被用户中断', isStreaming: false }
            }
            return msg
          })
          updateCurrentChat(interruptedMessages)
          return interruptedMessages
        })
        toast.info('已中断AI回复')
      } else {
        console.error('重新生成失败:', error)
        
        setMessages(prevMessages => {
          const errorMessages = prevMessages.map(msg => {
            if (msg.id === newAssistantMessage.id) {
              const currentContent = msg.content || '';
              return { ...msg, content: currentContent || `重新生成时出现错误：${error.message}`, isStreaming: false }
            }
            return msg
          })
          updateCurrentChat(errorMessages)
          return errorMessages
        })
        toast.error('重新生成失败', { description: error.message })
      }
    } finally {
      setIsLoading(false)
      setIsInterrupting(false)
      setMainAbortController(null)
    }
  }

  // 建议Chip组件
  const SuggestionChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  )

  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    
    if (isUser) {
      // 用户消息 - 气泡样式
      const isEditing = editingMessageId === message.id
      
      return (
        <div key={message.id} className="flex gap-3 py-4 justify-end group">
          <div className="max-w-[70%] md:max-w-[60%] space-y-2 items-end">
            {isEditing ? (
              <div className="w-full space-y-2 animate-in fade-in-50 duration-200">
                {/* 编辑状态 - 保持气泡样式 */}
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <AutoResizeTextarea
                    ref={editTextareaRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEditMessage()
                      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        if (editingContent.trim()) {
                          saveEditedMessage(message.id)
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-gray-900 dark:text-gray-100 resize-none"
                    style={{ minHeight: '80px', maxHeight: '400px' }}
                  />
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditMessage}
                        className="h-7 px-2 text-xs"
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEditedMessage(message.id)}
                        disabled={!editingContent.trim()}
                        className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        保存并重新生成
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 ml-auto transition-all hover:shadow-md">
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
                      {message.isEdited && (
                        <span className="text-xs text-blue-200 ml-2">(已编辑)</span>
                      )}
                    </div>
                  )}
                </div>
                {/* 用户消息操作按钮 - 底部右下角 */}
                <div className="flex justify-end gap-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onClick={() => copyMessage(message.content)}
                    title="复制"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onClick={() => startEditMessage(message.id, message.content)}
                    disabled={isLoading}
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    onClick={() => deleteMessage(message.id)}
                    disabled={isLoading}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
    } else {
      // AI回复 - 卡片式布局（无气泡）
      const isEditing = editingMessageId === message.id
      
      return (
        <div key={message.id} className={`group ${!message.isStreaming && message.role === 'assistant' && messages.indexOf(message) === messages.length - 1 ? 'pb-3' : 'py-3'}`}>
          {/* AI头像和标题区域 - 与输入框对齐 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI助手
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
          
          {/* AI回复内容 - 与头像左侧对齐 */}
          <div>
            {isEditing ? (
              <div className="w-full space-y-2 animate-in fade-in-50 duration-200">
                {/* 编辑状态 - 卡片式 */}
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <AutoResizeTextarea
                    ref={editTextareaRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEditMessage()
                      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        if (editingContent.trim()) {
                          saveEditedMessage(message.id)
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-gray-900 dark:text-gray-100 resize-none leading-relaxed text-base"
                    style={{ minHeight: '120px', maxHeight: 'calc(100vh - 300px)' }}
                  />
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditMessage}
                        className="h-7 px-2 text-xs"
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEditedMessage(message.id)}
                        disabled={!editingContent.trim()}
                        className="h-7 px-3 text-xs"
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 消息内容 */}
                <div>
                  {message.type === 'file' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Paperclip className="w-4 h-4" />
                        <span className="font-medium">{message.fileName}</span>
                      </div>
                      <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                        <Markdown>{message.content}</Markdown>
                        {message.isStreaming && (
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                            <span>正在生成回复...</span>
                          </div>
                        )}
                        {!message.isStreaming && message.isEdited && (
                          <span className="text-xs text-gray-400 ml-2">(已编辑)</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                      <Markdown>{message.content}</Markdown>
                      {message.isStreaming && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>正在生成回复...</span>
                        </div>
                      )}
                      {!message.isStreaming && message.isEdited && (
                        <span className="text-xs text-gray-400 ml-2">(已编辑)</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 操作按钮 - AI消息底部 */}
                {!message.isStreaming && (
                  <div className="flex items-center gap-1 mt-4 -ml-2">
                    {/* 复制 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => copyMessage(message.content)}
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    {/* 编辑 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => startEditMessage(message.id, message.content)}
                      disabled={isLoading}
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    
                    {/* 重新生成 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => regenerateResponse(message.id)}
                      disabled={isLoading}
                      title="重新生成"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>

                    {/* 点赞 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg transition-all",
                        message.rating === 'like' 
                          ? "text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30" 
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      onClick={() => rateMessage(message.id, 'like')}
                      title="点赞"
                    >
                      <ThumbsUp className={cn(
                        "w-4 h-4",
                        message.rating === 'like' ? "fill-current" : ""
                      )} />
                    </Button>
                    
                    {/* 点踩 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg transition-all",
                        message.rating === 'dislike' 
                          ? "text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" 
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      onClick={() => rateMessage(message.id, 'dislike')}
                      title="点踩"
                    >
                      <ThumbsDown className={cn(
                        "w-4 h-4",
                        message.rating === 'dislike' ? "fill-current" : ""
                      )} />
                    </Button>
                    
                    {/* 删除 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      onClick={() => deleteMessage(message.id)}
                      disabled={isLoading}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    {/* 继续生成按钮 - 只在最后一条AI消息时显示 */}
                    {messages.indexOf(message) === messages.length - 1 && (
                      <>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1.5" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5"
                          onClick={() => continueGeneration(message.id)}
                          disabled={isLoading}
                          title="继续生成"
                        >
                          <span className="text-sm font-medium">继续</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {/* 动态生成的引导Chips - 只在最后一条AI消息下方显示 */}
                {!message.isStreaming && message.role === 'assistant' && messages.indexOf(message) === messages.length - 1 && (
                  <div className="mt-6">
                    <div className="flex flex-col gap-2">
                      <SuggestionChip label="一句话概括剧情" onClick={() => handleQuickReply("一句话概括剧情")} />
                      
                      {message.suggestions && message.suggestions.length > 0 ? (
                        message.suggestions.map((suggestion, index) => (
                          <SuggestionChip key={index} label={suggestion} onClick={() => handleQuickReply(suggestion)} />
                        ))
                      ) : (
                        <>
                          <SuggestionChip label="深入探讨剧情细节" onClick={() => handleQuickReply("深入探讨剧情细节")} />
                          <SuggestionChip label="了解世界观设定" onClick={() => handleQuickReply("了解世界观设定")} />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-950 overflow-hidden relative">
      {/* 收起状态下的浮动按钮组 */}
      {isSidebarCollapsed && (
        <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
          <Button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
            variant="ghost"
            title="展开侧边栏"
          >
            <PanelRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            onClick={createNewChat}
            className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0 relative"
            variant="ghost"
            title="新对话"
          >
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400 absolute bottom-1.5 right-1.5 bg-white dark:bg-gray-950 rounded-full" />
          </Button>
        </div>
      )}

      {/* 左侧历史对话列表 */}
      <div className={cn("bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300", isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100")}>
        {/* 顶部新对话按钮和展开/收起按钮 */}
        <div className="p-3 flex items-center gap-2">
          <Button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
            variant="ghost"
          >
            <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            onClick={createNewChat}
            className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 rounded-lg font-medium"
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
        {/* 消息区域 */}
        <div className="flex-1 overflow-hidden">
          {messages.length === 0 ? (
            // 空状态
            <div className="h-full flex flex-col items-center justify-center pt-8">
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
              <div className="max-w-4xl mx-auto py-6">
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
                    {scenarioModels.isLoading ? (
                      <div className="h-10 px-3 py-2 flex items-center text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        加载中...
                      </div>
                    ) : scenarioModels.error ? (
                      <div className="h-10 px-3 py-2 flex items-center text-sm text-red-500">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        加载失败
                      </div>
                    ) : (
                      <Select
                        value={selectedModel}
                        onValueChange={(value) => {
                          setSelectedModel(value)
                        }}
                        disabled={scenarioModels.availableModels.length === 0}
                      >
                        <SelectTrigger className="h-10 px-3 py-2 border-none bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full data-[placeholder]:text-gray-500 focus:ring-0 focus:ring-offset-0 [&>svg]:w-4 [&>svg]:h-4 flex items-center gap-1 text-sm [&>svg]:text-gray-500">
                          <span className="font-medium truncate max-w-[120px]">
                            {scenarioModels.availableModels.find(m => m.id === selectedModel)?.displayName || '选择模型'}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="min-w-[200px]">
                          {scenarioModels.availableModels.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">
                              暂无可用模型
                            </div>
                          ) : (
                            scenarioModels.getSelectedModels().map((model) => (
                              <SelectItem key={model.id} value={model.id} className="py-1.5">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="font-medium text-sm">{model.displayName}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{model.description || model.modelId}</div>
                                  </div>
                                  {model.id === scenarioModels.primaryModelId && (
                                    <Badge variant="secondary" className="text-xs">主模型</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* 右侧发送/停止按钮 */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 p-0 flex-shrink-0 rounded-full transition-all duration-200 relative z-10",
                      isLoading
                        ? "hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        : (inputValue.trim() || uploadedFileContent)
                        ? "hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
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
                        <Pause className="w-5 h-5" />
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
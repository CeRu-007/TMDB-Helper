/**
 * 插件系统核心类型定义
 * 用于分集简介AI生成功能的插件化架构
 */

import { GenerationConfig } from '../../types'

/**
 * 插件类型枚举
 */
export enum PluginType {
  TitleStyle = 'title-style',
  SummaryStyle = 'summary-style',
  EnhanceOperation = 'enhance-operation'
}

/**
 * 增强操作类型
 */
export type EnhanceOperationType = 'polish' | 'shorten' | 'expand' | 'proofread' | 'rewrite'

/**
 * 增强操作输入
 */
export interface EnhanceInput {
  title: string
  summary: string
  selectedText?: string
}

/**
 * 增强操作输出
 */
export interface EnhanceOutput {
  title: string
  summary: string
  confidence: number
}

/**
 * 增强操作配置
 */
export interface EnhanceConfig {
  temperature: number
  maxTokens: number
}

/**
 * 插件基础接口
 * 所有插件必须实现此接口
 */
export interface IPlugin {
  /** 插件唯一标识 */
  id: string
  
  /** 插件类型 */
  type: PluginType
  
  /** 插件名称 */
  name: string
  
  /** 插件描述 */
  description: string
  
  /** 插件图标 */
  icon: string
  
  /** 插件版本 */
  version: string
  
  /** 插件作者 */
  author?: string
  
  /** 插件标签（用于分类和搜索） */
  tags?: string[]
  
  /** 是否为内置插件 */
  isBuiltin: boolean
  
  /** 插件元数据 */
  metadata?: Record<string, any>
  
  /** 初始化插件 */
  initialize?(context: PluginContext): void | Promise<void>
  
  /** 销毁插件 */
  destroy?(): void | Promise<void>
}

/**
 * 集数内容
 */
export interface EpisodeContent {
  /** 文件名 */
  fileName: string
  
  /** 集数编号 */
  episodeNumber: number
  
  /** 原始标题 */
  originalTitle?: string
  
  /** 字幕内容 */
  subtitleContent: string
  
  /** 持续时间（秒） */
  duration?: number
  
  /** 视频URL */
  videoUrl?: string
  
  /** 字数 */
  wordCount: number
  
  /** 最后时间戳 */
  lastTimestamp?: string
  
  /** 其他元数据 */
  metadata?: Record<string, any>
}

/**
 * 解析后的标题
 */
export interface ParsedTitle {
  /** 生成的标题 */
  title: string
  
  /** 置信度（0-1） */
  confidence?: number
  
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 解析后的简介
 */
export interface ParsedSummary {
  /** 生成的简介 */
  summary: string
  
  /** 字数 */
  wordCount: number
  
  /** 置信度（0-1） */
  confidence?: number
  
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 标题风格配置
 */
export interface TitleStyleConfig {
  /** 最大长度 */
  maxLength?: number
  
  /** 最小长度 */
  minLength?: number
  
  /** 关键词（优先使用） */
  keywords?: string[]
  
  /** 排除关键词 */
  excludeKeywords?: string[]
  
  /** 标点符号处理 */
  punctuationHandling?: 'keep' | 'remove' | 'simplify'
}

/**
 * 简介风格配置
 */
export interface SummaryStyleConfig {
  /** 最小字数 */
  minWordCount: number
  
  /** 最大字数 */
  maxWordCount: number
  
  /** 温度参数 */
  temperature?: number
  
  /** 最大token数 */
  maxTokens?: number
  
  /** 输出格式 */
  format?: 'plain' | 'markdown' | 'html'
  
  /** 是否允许疑问句 */
  allowQuestions?: boolean
  
  /** 是否使用陈述句 */
  requireDeclarative?: boolean
}

/**
 * 简介约束
 */
export interface SummaryConstraints {
  /** 最小字数 */
  minWordCount?: number
  
  /** 最大字数 */
  maxWordCount?: number
  
  /** 必须包含的内容 */
  mustInclude?: string[]
  
  /** 必须排除的内容 */
  mustExclude?: string[]
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  
  /** 错误信息 */
  errors?: string[]
  
  /** 警告信息 */
  warnings?: string[]
}

/**
 * 标题风格插件接口
 */
export interface ITitleStylePlugin extends IPlugin {
  type: PluginType.TitleStyle
  
  /** 构建标题生成提示词 */
  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string
  
  /** 解析生成的标题 */
  parseResult(generated: string, options?: Record<string, any>): ParsedTitle
  
  /** 验证生成的标题 */
  validate?(title: string): ValidationResult
  
  /** 默认配置 */
  defaultConfig?: TitleStyleConfig
}

/**
 * 简介风格插件接口
 */
export interface ISummaryStylePlugin extends IPlugin {
  type: PluginType.SummaryStyle
  
  /** 是否为互斥风格（如模仿风格） */
  isExclusive?: boolean
  
  /** 构建简介生成提示词 */
  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string
  
  /** 解析生成的简介 */
  parseResult(generated: string, options?: Record<string, any>): ParsedSummary
  
  /** 验证生成的简介 */
  validate?(summary: string, constraints?: SummaryConstraints): ValidationResult
  
  /** 后处理（如格式化、清理） */
  postProcess?(summary: string): string
  
  /** 默认配置 */
  defaultConfig?: SummaryStyleConfig
}

/**
 * 增强操作插件接口
 */
export interface IEnhanceOperationPlugin extends IPlugin {
  type: PluginType.EnhanceOperation
  
  /** 操作类型 */
  operationType: EnhanceOperationType
  
  /** 构建增强提示词 */
  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string
  
  /** 解析增强结果 */
  parseResult(content: string): EnhanceOutput
  
  /** 默认配置 */
  defaultConfig: EnhanceConfig
}

/**
 * 插件上下文
 * 提供给插件的运行时环境和工具
 */
export interface PluginContext {
  /** 模型服务API */
  modelService: {
    generate: (prompt: string, config: { temperature?: number; maxTokens?: number }) => Promise<string>
  }
  
  /** 配置管理器 */
  configManager: {
    get: (key: string) => any
    set: (key: string, value: any) => void
  }
  
  /** 日志记录器 */
  logger: {
    info: (message: string, ...args: any[]) => void
    warn: (message: string, ...args: any[]) => void
    error: (message: string, ...args: any[]) => void
    debug: (message: string, ...args: any[]) => void
  }
  
  /** 共享数据存储 */
  store: Map<string, any>
  
  /** 插件间通信 */
  eventBus: {
    emit: (event: string, data?: any) => void
    on: (event: string, handler: (data?: any) => void) => void
    off: (event: string, handler: (data?: any) => void) => void
  }
}

/**
 * 插件注册选项
 */
export interface PluginRegistrationOptions {
  /** 是否自动初始化 */
  autoInitialize?: boolean
  
  /** 是否覆盖已存在的插件 */
  overwrite?: boolean
}

/**
 * 插件状态
 */
export enum PluginStatus {
  Unregistered = 'unregistered',
  Registered = 'registered',
  Initialized = 'initialized',
  Error = 'error'
}

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 插件实例 */
  plugin: IPlugin
  
  /** 插件状态 */
  status: PluginStatus
  
  /** 错误信息 */
  error?: string
  
  /** 注册时间 */
  registeredAt: number
  
  /** 初始化时间 */
  initializedAt?: number
}
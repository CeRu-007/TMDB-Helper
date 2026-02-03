/**
 * 插件上下文实现
 * 提供插件运行时所需的工具和服务
 */

import { PluginContext as IPluginContext } from './types'
import { logger } from '@/lib/utils/logger'

/**
 * 事件总线实现
 */
class EventBus {
  private listeners: Map<string, Set<(data?: any) => void>> = new Map()

  public emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          logger.error(`事件处理器执行失败 [${event}]:`, error)
        }
      })
    }
  }

  public on(event: string, handler: (data?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  public off(event: string, handler: (data?: any) => void): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  public clear(): void {
    this.listeners.clear()
  }
}

/**
 * 配置管理器实现
 */
class ConfigManager {
  private config: Map<string, any> = new Map()

  public get(key: string): any {
    return this.config.get(key)
  }

  public set(key: string, value: any): void {
    this.config.set(key, value)
  }

  public has(key: string): boolean {
    return this.config.has(key)
  }

  public delete(key: string): void {
    this.config.delete(key)
  }

  public clear(): void {
    this.config.clear()
  }

  public getAll(): Record<string, any> {
    return Object.fromEntries(this.config)
  }
}

/**
 * 模型服务包装器
 */
class ModelServiceWrapper {
  private generateFn: (prompt: string, config: { temperature?: number; maxTokens?: number }) => Promise<string>

  constructor(generateFn: (prompt: string, config: { temperature?: number; maxTokens?: number }) => Promise<string>) {
    this.generateFn = generateFn
  }

  public async generate(prompt: string, config: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
    return this.generateFn(prompt, config)
  }
}

/**
 * 插件上下文实现
 */
export class PluginContext implements IPluginContext {
  public readonly modelService: IPluginContext['modelService']
  public readonly configManager: IPluginContext['configManager']
  public readonly logger: IPluginContext['logger']
  public readonly store: IPluginContext['store']
  public readonly eventBus: IPluginContext['eventBus']

  private eventBusInstance: EventBus
  private configManagerInstance: ConfigManager

  constructor(
    generateFn: (prompt: string, config: { temperature?: number; maxTokens?: number }) => Promise<string>
  ) {
    this.eventBusInstance = new EventBus()
    this.configManagerInstance = new ConfigManager()
    this.store = new Map()

    this.modelService = new ModelServiceWrapper(generateFn)
    this.configManager = this.configManagerInstance
    this.logger = logger
    this.eventBus = {
      emit: (event: string, data?: any) => this.eventBusInstance.emit(event, data),
      on: (event: string, handler: (data?: any) => void) => this.eventBusInstance.on(event, handler),
      off: (event: string, handler: (data?: any) => void) => this.eventBusInstance.off(event, handler)
    }
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.eventBusInstance.clear()
    this.configManagerInstance.clear()
    this.store.clear()
  }
}
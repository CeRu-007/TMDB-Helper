/**
 * 插件基础抽象类
 * 提供插件的默认实现和通用功能
 */

import { IPlugin, PluginType, PluginContext } from './types'

/**
 * 抽象插件基类
 * 所有插件可以继承此类以获得默认实现
 */
export abstract class BasePlugin implements IPlugin {
  public readonly id: string
  public readonly type: PluginType
  public readonly name: string
  public readonly description: string
  public readonly icon: string
  public readonly version: string
  public readonly author?: string
  public readonly tags?: string[]
  public readonly isBuiltin: boolean
  public readonly metadata?: Record<string, any>

  protected context?: PluginContext

  constructor(config: {
    id: string
    type: PluginType
    name: string
    description: string
    icon: string
    version: string
    author?: string
    tags?: string[]
    isBuiltin?: boolean
    metadata?: Record<string, any>
  }) {
    this.id = config.id
    this.type = config.type
    this.name = config.name
    this.description = config.description
    this.icon = config.icon
    this.version = config.version
    this.author = config.author
    this.tags = config.tags
    this.isBuiltin = config.isBuiltin ?? false
    this.metadata = config.metadata
  }

  /**
   * 初始化插件
   * 子类可以覆盖此方法
   */
  public async initialize(context: PluginContext): Promise<void> {
    this.context = context
    this.context?.logger.info(`[Plugin] 初始化插件: ${this.name} (${this.id})`)
  }

  /**
   * 销毁插件
   * 子类可以覆盖此方法
   */
  public async destroy(): Promise<void> {
    this.context?.logger.info(`[Plugin] 销毁插件: ${this.name} (${this.id})`)
    this.context = undefined
  }

  /**
   * 获取插件信息
   */
  public getInfo(): string {
    return `${this.name} v${this.version} (${this.id})`
  }

  /**
   * 检查插件是否已初始化
   */
  protected ensureInitialized(): void {
    if (!this.context) {
      throw new Error(`插件 ${this.name} 未初始化`)
    }
  }
}
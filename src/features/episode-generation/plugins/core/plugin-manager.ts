/**
 * 插件管理器
 * 负责插件的注册、初始化、销毁和调用
 */

import { IPlugin, PluginType, PluginContext, PluginRegistrationOptions } from './types'
import { PluginRegistry } from './plugin-registry'
import { PluginContext as PluginContextImpl } from './plugin-context'

export class PluginManager {
  private registry: PluginRegistry
  private context: PluginContext
  private initialized: boolean = false

  constructor(
    generateFn: (prompt: string, config: { temperature?: number; maxTokens?: number }) => Promise<string>
  ) {
    this.registry = new PluginRegistry()
    this.context = new PluginContextImpl(generateFn)
  }

  /**
   * 注册插件
   */
  public register(plugin: IPlugin, options?: PluginRegistrationOptions): boolean {
    const result = this.registry.register(plugin, options)
    if (result) {
      console.log(`[PluginManager] 注册插件: ${plugin.name} (${plugin.id})`)
    }
    return result
  }

  /**
   * 批量注册插件
   */
  public registerBatch(plugins: IPlugin[], options?: PluginRegistrationOptions): number {
    const count = this.registry.registerBatch(plugins, options)
    console.log(`[PluginManager] 批量注册插件: ${count} 个`)
    return count
  }

  /**
   * 注销插件
   */
  public unregister(pluginId: string): boolean {
    const result = this.registry.unregister(pluginId)
    if (result) {
      console.log(`[PluginManager] 注销插件: ${pluginId}`)
    }
    return result
  }

  /**
   * 获取插件
   */
  public get(pluginId: string): IPlugin | undefined {
    return this.registry.get(pluginId)
  }

  /**
   * 获取所有插件
   */
  public getAll(): IPlugin[] {
    return this.registry.getAll()
  }

  /**
   * 获取标题风格插件
   */
  public getTitleStylePlugins(): IPlugin[] {
    return this.registry.getTitleStylePlugins()
  }

  /**
   * 获取简介风格插件
   */
  public getSummaryStylePlugins(): IPlugin[] {
    return this.registry.getSummaryStylePlugins()
  }

  /**
   * 按类型获取插件
   */
  public getByType(type: PluginType): IPlugin[] {
    return this.registry.getByType(type)
  }

  /**
   * 按标签获取插件
   */
  public getByTag(tag: string): IPlugin[] {
    return this.registry.getByTag(tag)
  }

  /**
   * 初始化所有插件
   */
  public async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.warn('[PluginManager] 插件已初始化，跳过')
      return
    }

    const plugins = this.registry.getAll()
    console.log(`[PluginManager] 开始初始化 ${plugins.length} 个插件...`)

    for (const plugin of plugins) {
      await this.initializePlugin(plugin)
    }

    this.initialized = true
    console.log('[PluginManager] 所有插件初始化完成')
  }

  /**
   * 初始化单个插件
   */
  public async initializePlugin(plugin: IPlugin): Promise<void> {
    const pluginInfo = this.registry.getInfo(plugin.id)
    if (!pluginInfo) {
      console.error(`[PluginManager] 插件 ${plugin.id} 未注册`)
      return
    }

    if (pluginInfo.status === 'initialized') {
      console.warn(`[PluginManager] 插件 ${plugin.id} 已初始化`)
      return
    }

    try {
      if (plugin.initialize) {
        await plugin.initialize(this.context)
      }
      this.registry.updateStatus(plugin.id, 'initialized')
      console.log(`[PluginManager] 插件 ${plugin.name} 初始化成功`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.registry.updateStatus(plugin.id, 'error', errorMessage)
      console.error(`[PluginManager] 插件 ${plugin.name} 初始化失败:`, errorMessage)
    }
  }

  /**
   * 销毁所有插件
   */
  public async destroyAll(): Promise<void> {
    console.log('[PluginManager] 开始销毁所有插件...')
    this.registry.clear()
    this.context.destroy()
    this.initialized = false
    console.log('[PluginManager] 所有插件已销毁')
  }

  /**
   * 销毁单个插件
   */
  public async destroyPlugin(pluginId: string): Promise<boolean> {
    return this.registry.unregister(pluginId)
  }

  /**
   * 检查插件是否存在
   */
  public has(pluginId: string): boolean {
    return this.registry.has(pluginId)
  }

  /**
   * 获取插件数量
   */
  public getCount(): number {
    return this.registry.getCount()
  }

  /**
   * 获取标题风格插件数量
   */
  public getTitleStyleCount(): number {
    return this.registry.getTitleStyleCount()
  }

  /**
   * 获取简介风格插件数量
   */
  public getSummaryStyleCount(): number {
    return this.registry.getSummaryStyleCount()
  }

  /**
   * 获取插件信息
   */
  public getPluginInfo(pluginId: string) {
    return this.registry.getInfo(pluginId)
  }

  /**
   * 获取上下文
   */
  public getContext(): PluginContext {
    return this.context
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized
  }
}
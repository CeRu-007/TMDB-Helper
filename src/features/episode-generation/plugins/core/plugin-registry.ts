/**
 * 插件注册表
 * 管理所有已注册的插件
 */

import { IPlugin, PluginType, PluginStatus, PluginInfo, PluginRegistrationOptions } from './types'

/**
 * 插件注册表
 */
export class PluginRegistry {
  private plugins: Map<string, PluginInfo> = new Map()
  private titleStylePlugins: Map<string, string> = new Map()
  private summaryStylePlugins: Map<string, string> = new Map()
  private enhanceOperationPlugins: Map<string, string> = new Map()

  /**
   * 注册插件
   */
  public register(plugin: IPlugin, options: PluginRegistrationOptions = {}): boolean {
    const { overwrite = false } = options

    // 检查插件ID是否已存在
    if (this.plugins.has(plugin.id) && !overwrite) {
      console.warn(`插件 ${plugin.id} 已存在，跳过注册`)
      return false
    }

    // 验证插件
    this.validatePlugin(plugin)

    // 创建插件信息
    const pluginInfo: PluginInfo = {
      plugin,
      status: PluginStatus.Registered,
      registeredAt: Date.now()
    }

    // 注册插件
    this.plugins.set(plugin.id, pluginInfo)

    // 按类型索引
    if (plugin.type === PluginType.TitleStyle) {
      this.titleStylePlugins.set(plugin.id, plugin.id)
    } else if (plugin.type === PluginType.SummaryStyle) {
      this.summaryStylePlugins.set(plugin.id, plugin.id)
    } else if (plugin.type === PluginType.EnhanceOperation) {
      this.enhanceOperationPlugins.set(plugin.id, plugin.id)
    }

    return true
  }

  /**
   * 批量注册插件
   */
  public registerBatch(plugins: IPlugin[], options: PluginRegistrationOptions = {}): number {
    let count = 0
    for (const plugin of plugins) {
      if (this.register(plugin, options)) {
        count++
      }
    }
    return count
  }

  /**
   * 注销插件
   */
  public unregister(pluginId: string): boolean {
    const pluginInfo = this.plugins.get(pluginId)
    if (!pluginInfo) {
      return false
    }

    // 如果插件已初始化，先销毁
    if (pluginInfo.status === PluginStatus.Initialized) {
      const plugin = pluginInfo.plugin
      if (plugin.destroy) {
        try {
          plugin.destroy()
        } catch (error) {
          console.error(`销毁插件 ${pluginId} 失败:`, error)
        }
      }
    }

    // 移除插件
    this.plugins.delete(pluginId)
    this.titleStylePlugins.delete(pluginId)
    this.summaryStylePlugins.delete(pluginId)

    return true
  }

  /**
   * 获取插件
   */
  public get(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId)?.plugin
  }

  /**
   * 获取插件信息
   */
  public getInfo(pluginId: string): PluginInfo | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * 检查插件是否存在
   */
  public has(pluginId: string): boolean {
    return this.plugins.has(pluginId)
  }

  /**
   * 获取所有插件
   */
  public getAll(): IPlugin[] {
    return Array.from(this.plugins.values()).map(info => info.plugin)
  }

  /**
   * 按类型获取插件
   */
  public getByType(type: PluginType): IPlugin[] {
    const pluginMap = type === PluginType.TitleStyle ? this.titleStylePlugins : this.summaryStylePlugins
    return Array.from(pluginMap.values())
      .map(id => this.plugins.get(id)?.plugin)
      .filter((plugin): plugin is IPlugin => plugin !== undefined)
  }

  /**
   * 获取所有标题风格插件
   */
  public getTitleStylePlugins(): IPlugin[] {
    return this.getByType(PluginType.TitleStyle)
  }

  /**
   * 获取所有简介风格插件
   */
  public getSummaryStylePlugins(): IPlugin[] {
    return this.getByType(PluginType.SummaryStyle)
  }

  /**
   * 按标签获取插件
   */
  public getByTag(tag: string): IPlugin[] {
    return this.getAll().filter(plugin => 
      plugin.tags?.includes(tag)
    )
  }

  /**
   * 更新插件状态
   */
  public updateStatus(pluginId: string, status: PluginStatus, error?: string): void {
    const pluginInfo = this.plugins.get(pluginId)
    if (pluginInfo) {
      pluginInfo.status = status
      if (error) {
        pluginInfo.error = error
      }
      if (status === PluginStatus.Initialized) {
        pluginInfo.initializedAt = Date.now()
      }
    }
  }

  /**
   * 获取插件数量
   */
  public getCount(): number {
    return this.plugins.size
  }

  /**
   * 获取标题风格插件数量
   */
  public getTitleStyleCount(): number {
    return this.titleStylePlugins.size
  }

  /**
   * 获取简介风格插件数量
   */
    public getSummaryStyleCount(): number {
      return this.summaryStylePlugins.size
    }
  
    /**
     * 获取增强操作插件数量
     */
    public getEnhanceOperationCount(): number {
      return this.enhanceOperationPlugins.size
    }
  
    /**
     * 按类型获取插件
     */
    public getByType(type: PluginType): IPlugin[] {
      const map = type === PluginType.TitleStyle 
        ? this.titleStylePlugins 
        : type === PluginType.SummaryStyle 
          ? this.summaryStylePlugins 
          : type === PluginType.EnhanceOperation
            ? this.enhanceOperationPlugins
            : null
      
      if (!map) return []
      
      return Array.from(map.values())
        .map(id => this.plugins.get(id)?.plugin)
        .filter((plugin): plugin is IPlugin => plugin !== undefined)
    }
  
    /**
     * 清空注册表
     */  public clear(): void {
    // 销毁所有已初始化的插件
    for (const [pluginId, pluginInfo] of this.plugins.entries()) {
      if (pluginInfo.status === PluginStatus.Initialized) {
        const plugin = pluginInfo.plugin
        if (plugin.destroy) {
          try {
            plugin.destroy()
          } catch (error) {
            console.error(`销毁插件 ${pluginId} 失败:`, error)
          }
        }
      }
    }

    this.plugins.clear()
    this.titleStylePlugins.clear()
    this.summaryStylePlugins.clear()
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: IPlugin): void {
    if (!plugin.id || !plugin.name) {
      throw new Error(`插件缺少必需字段: id 和 name`)
    }
    if (!plugin.description) {
      throw new Error(`插件 ${plugin.id} 缺少 description`)
    }
    if (!plugin.icon) {
      throw new Error(`插件 ${plugin.id} 缺少 icon`)
    }
    if (!plugin.version) {
      throw new Error(`插件 ${plugin.id} 缺少 version`)
    }
    if (!Object.values(PluginType).includes(plugin.type)) {
      throw new Error(`插件 ${plugin.id} 的类型 ${plugin.type} 无效`)
    }
  }
}
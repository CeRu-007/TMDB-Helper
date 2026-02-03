/**
 * 插件服务层
 * 提供插件系统的便捷访问接口，适配现有的业务逻辑
 */

import { PluginManager, allBuiltinPlugins, PluginType, ITitleStylePlugin, ISummaryStylePlugin, IEnhanceOperationPlugin, EpisodeContent } from './index'
import { SubtitleEpisode, GenerationConfig, GenerationResult } from '../types'
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { TITLE_STYLES } from '@/features/episode-generation/components/subtitle-episode-generator/constants'
import { logger } from '@/lib/utils/logger'

// 全局插件管理器实例
let pluginManagerInstance: PluginManager | null = null

/**
 * 获取标题风格描述
 */
function getTitleStyleDescription(styleId: string): string {
  const style = TITLE_STYLES.find(s => s.id === styleId)
  return style ? style.name : styleId
}

/**
 * 生成简介预览文本
 */
function generateSummaryPreview(styleId: string): string {
  return `[按照${getTitleStyleDescription(styleId)}风格生成的简介内容]`
}

/**
 * 初始化插件系统
 */
export function initializePluginSystem() {
  if (pluginManagerInstance) {
    return pluginManagerInstance
  }

  // 创建生成函数（将在实际使用时通过参数传入）
  const generateFn = async (prompt: string, config: { temperature?: number; maxTokens?: number }): Promise<string> => {
    // 这个函数将在 useApiCalls 中实现
    throw new Error('generateFn not implemented in plugin service')
  }

  pluginManagerInstance = new PluginManager(generateFn)
  pluginManagerInstance.registerBatch(allBuiltinPlugins)
  
  logger.info('[PluginService] 插件系统初始化完成')
  return pluginManagerInstance
}

/**
 * 获取插件管理器实例
 */
export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    return initializePluginSystem()
  }
  return pluginManagerInstance
}

/**
 * 转换 SubtitleEpisode 为 EpisodeContent
 */
export function convertToEpisodeContent(episode: SubtitleEpisode, fileName?: string): EpisodeContent {
  return {
    fileName: fileName || '',
    episodeNumber: episode.episodeNumber,
    originalTitle: episode.title,
    subtitleContent: episode.content,
    wordCount: episode.wordCount,
    duration: episode.duration ? parseFloat(episode.duration) : undefined,
    lastTimestamp: episode.lastTimestamp
  }
}

/**
 * 使用插件构建提示词
 */
export function buildPromptWithPlugin(episode: SubtitleEpisode, config: GenerationConfig, styleId: string): string {
  const pluginManager = getPluginManager()
  const plugin = pluginManager.get(styleId)

  if (!plugin) {
    logger.warn(`[PluginService] 未找到插件: ${styleId}`)
    // 返回一个默认提示词
    return `请根据以下字幕内容生成分集简介：\n${episode.content}`
  }

  const episodeContent = convertToEpisodeContent(episode)

  if (plugin.type === PluginType.SummaryStyle) {
    const summaryPlugin = plugin as ISummaryStylePlugin
    let prompt = summaryPlugin.buildPrompt(episodeContent, {
      ...summaryPlugin.defaultConfig,
      minWordCount: config.summaryLength[0],
      maxWordCount: config.summaryLength[1],
      temperature: config.temperature,
      customPrompt: config.customPrompt,
      selectedTitleStyle: config.selectedTitleStyle
    })

    // 如果配置了 selectedTitleStyle，修改提示词要求同时生成标题和简介
    if (config.selectedTitleStyle) {
      // 在提示词中添加标题生成要求
      const titleRequirement = `
标题生成要求：
- 请同时为此集生成一个${getTitleStyleDescription(config.selectedTitleStyle)}风格的标题
- 标题应该简洁有力，不超过20个字
- 标题应该能够概括本集的核心内容
- 请将标题放在最前面，格式为"标题：[你的标题]"
- 然后空一行，再生成简介内容

输出格式示例：
标题：XXX

${generateSummaryPreview(config.selectedTitleStyle)}

请严格按照上述格式输出，确保标题和简介都清晰可辨。`

      prompt = prompt + titleRequirement
    }

    return prompt
  } else if (plugin.type === PluginType.TitleStyle) {
    const titlePlugin = plugin as ITitleStylePlugin
    return titlePlugin.buildPrompt(episodeContent, {
      ...titlePlugin.defaultConfig
    })
  }

  throw new Error(`未知的插件类型: ${plugin.type}`)
}

/**
 * 使用插件解析生成结果
 */
export function parseResultWithPlugin(
  content: string,
  episode: SubtitleEpisode,
  config: GenerationConfig,
  styleId: string
): GenerationResult {
  const pluginManager = getPluginManager()
  const plugin = pluginManager.get(styleId)

  if (!plugin) {
    logger.warn(`[PluginService] 未找到插件: ${styleId}`)
    // 返回默认解析结果
    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title,
      generatedTitle: `第${episode.episodeNumber}集`,
      generatedSummary: content,
      confidence: 0.5,
      wordCount: content.length,
      generationTime: Date.now(),
      model: config.model,
      styles: [styleId],
      styleId,
      styleName: styleId
    }
  }

  const episodeContent = convertToEpisodeContent(episode)

  if (plugin.type === PluginType.SummaryStyle) {
    const summaryPlugin = plugin as ISummaryStylePlugin

    // 尝试从生成内容中提取标题
    let extractedTitle = `第${episode.episodeNumber}集`
    let contentForParsing = content

    // 如果配置了 selectedTitleStyle，尝试从内容中提取标题
    if (config.selectedTitleStyle) {
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)

      // 尝试查找标题（第一行或包含"标题"的行）
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // 检查是否是标题行（包含"标题"关键字，且长度合理）
        if (line.match(/^(标题[:：]?\s*)/i)) {
          const titleMatch = line.replace(/^(标题[:：]?\s*)/i, '').trim()
          if (titleMatch.length > 0 && titleMatch.length <= 30) {
            extractedTitle = titleMatch
            // 移除标题行，只保留简介内容
            contentForParsing = lines.slice(i + 1).join('\n').trim()
            break
          }
        } else if (line.length > 2 && line.length <= 30 && !line.includes('简介') && !line.includes('描述')) {
          // 第一行可能是标题（如果没有明确的"标题："前缀）
          extractedTitle = line
          // 移除标题行，只保留简介内容
          contentForParsing = lines.slice(i + 1).join('\n').trim()
          break
        }
      }
    }

    // 使用过滤后的内容进行解析
    const parsed = summaryPlugin.parseResult(contentForParsing, {
      ...summaryPlugin.defaultConfig,
      minWordCount: config.summaryLength[0],
      maxWordCount: config.summaryLength[1]
    })

    // 后处理
    const processedSummary = summaryPlugin.postProcess
      ? summaryPlugin.postProcess(parsed.summary)
      : parsed.summary

    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title,
      generatedTitle: extractedTitle,
      generatedSummary: processedSummary,
      confidence: parsed.confidence || 0.5,
      wordCount: processedSummary.length,
      generationTime: Date.now(),
      model: config.model,
      styles: [styleId],
      styleId,
      styleName: plugin.name,
      metadata: parsed.metadata
    }
  } else if (plugin.type === PluginType.TitleStyle) {
    const titlePlugin = plugin as ITitleStylePlugin
    const parsed = titlePlugin.parseResult(content, {
      ...titlePlugin.defaultConfig
    })

    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title,
      generatedTitle: parsed.title,
      generatedSummary: '', // 标题插件不生成简介
      confidence: parsed.confidence || 0.5,
      wordCount: 0,
      generationTime: Date.now(),
      model: config.model,
      styles: [styleId],
      styleId,
      styleName: plugin.name,
      metadata: parsed.metadata
    }
  }

  throw new Error(`未知的插件类型: ${plugin.type}`)
}

/**
 * 获取所有标题风格
 */
export function getAllTitleStyles() {
  const pluginManager = getPluginManager()
  return pluginManager.getTitleStylePlugins().map(plugin => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    icon: plugin.icon,
    isExclusive: false,
    tags: plugin.tags
  }))
}

/**
 * 获取所有简介风格
 */
export function getAllSummaryStyles() {
  const pluginManager = getPluginManager()
  return pluginManager.getSummaryStylePlugins().map(plugin => {
    const summaryPlugin = plugin as ISummaryStylePlugin
    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      icon: plugin.icon,
      isExclusive: summaryPlugin.isExclusive || false,
      tags: plugin.tags
    }
  })
}

/**
 * 检查插件是否存在
 */
export function hasPlugin(pluginId: string): boolean {
  const pluginManager = getPluginManager()
  return pluginManager.has(pluginId)
}

/**
 * 获取插件信息
 */
export function getPluginInfo(pluginId: string) {
  const pluginManager = getPluginManager()
  return pluginManager.getPluginInfo(pluginId)
}

/**
 * 获取插件统计信息
 */
export function getPluginStats() {
  const pluginManager = getPluginManager()
  return {
    total: pluginManager.getCount(),
    titleStyles: pluginManager.getTitleStyleCount(),
    summaryStyles: pluginManager.getSummaryStyleCount(),
    enhanceOperations: pluginManager.getPluginsByType(PluginType.EnhanceOperation).length,
    initialized: pluginManager.isInitialized()
  }
}

/**
 * 使用增强操作插件构建提示词
 */
export function buildEnhancePromptWithPlugin(
  title: string,
  summary: string,
  operationType: string,
  selectedText?: string
): string {
  const pluginManager = getPluginManager()
  const plugin = pluginManager.get(operationType)

  if (!plugin) {
    logger.warn(`[PluginService] 未找到增强操作插件: ${operationType}`)
    // 返回一个默认提示词
    return `请优化以下内容：\n标题：${title}\n简介：${summary}`
  }

  if (plugin.type !== PluginType.EnhanceOperation) {
    logger.warn(`[PluginService] 插件类型错误: ${plugin.type}`)
    return `请优化以下内容：\n标题：${title}\n简介：${summary}`
  }

  const enhancePlugin = plugin as IEnhanceOperationPlugin
  return enhancePlugin.buildPrompt({
    title,
    summary,
    selectedText
  }, enhancePlugin.defaultConfig)
}

/**
 * 使用增强操作插件解析结果
 */
export function parseEnhanceResultWithPlugin(content: string): { title: string; summary: string } {
  const pluginManager = getPluginManager()
  
  // 尝试从内容中提取标题和简介
  const lines = content.split('\n').filter(line => line.trim())
  let title = ''
  let summary = ''
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 检查标题
    if (trimmedLine.match(/^(标题[:：]?\s*)/i)) {
      title = trimmedLine.replace(/^(标题[:：]?\s*)/i, '').trim()
    }
    // 检查简介
    else if (trimmedLine.match(/^(简介[:：]?\s*)/i)) {
      summary = trimmedLine.replace(/^(简介[:：]?\s*)/i, '').trim()
    }
    // 如果没有明确标识，但内容较长，可能是简介
    else if (trimmedLine.length > 20 && !trimmedLine.includes('标题')) {
      summary = trimmedLine
    }
  }
  
  return { title, summary }
}

/**
 * 获取增强操作的配置
 */
export function getEnhanceOperationConfig(operationType: string): { temperature: number; maxTokens: number } {
  const pluginManager = getPluginManager()
  const plugin = pluginManager.get(operationType)

  if (!plugin || plugin.type !== PluginType.EnhanceOperation) {
    return { temperature: 0.7, maxTokens: 800 }
  }

  const enhancePlugin = plugin as IEnhanceOperationPlugin
  return enhancePlugin.defaultConfig
}

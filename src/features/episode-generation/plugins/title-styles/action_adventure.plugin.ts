/**
 * 动作冒险风格插件
 * 强调动作场面和冒险元素，使用动感十足的词汇，如：激战、追击、突破、征服
 */

import { BasePlugin, PluginType, ITitleStylePlugin, EpisodeContent, ParsedTitle, TitleStyleConfig  } from '../core'

export const action_adventurePlugin: ITitleStylePlugin = new (class extends BasePlugin implements ITitleStylePlugin {
  constructor() {
    super({
      id: 'action_adventure',
      type: PluginType.TitleStyle,
      name: '动作冒险',
      description: '强调动作场面和冒险元素，使用动感十足的词汇，如：激战、追击、突破、征服',
      icon: '⚡',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['action_adventure', 'builtin'],
      metadata: {
        category: 'title',
        difficulty: 'medium'
      }
    })
  }

  

  defaultConfig: TitleStyleConfig = {
    maxLength: 20,
    minLength: 5,
    punctuationHandling: 'simplify'
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位专业的影视内容编辑，擅长撰写动作冒险风格的标题。

任务：为第 ${content.episodeNumber} 集撰写动作冒险风格的标题

风格要求：
强调动作场面和冒险元素，使用动感十足的词汇，如：激战、追击、突破、征服

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成一个 ${config.minLength}-${config.maxLength} 字的标题，要求：
- 符合动作冒险风格特点
- 简洁有力，易于记忆
- 直接输出标题，不要任何解释或附加内容`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedTitle {
    const config = { ...this.defaultConfig, ...options }
    
    // 清理内容
    let title = generated.trim()
    
    // 移除前缀
    title = title.replace(/^(标题[:：]?\s*|Title[:：]?\s*)/i, '')
    
    // 移除引号
    title = title.replace(/^["'«」『]|["'»』」]$/g, '')
    
    // 移除标点
    if (config.punctuationHandling === 'remove' || config.punctuationHandling === 'simplify') {
      title = title.replace(/[，。、；：]/g, '')
    }
    
    // 移除"第X集"
    title = title.replace(/第\s*\d+\s*[集话]/g, '')
    
    // 限制长度
    if (title.length > config.maxLength) {
      title = title.substring(0, config.maxLength)
    }

    let confidence = 100
    if (title.length < config.minLength * 0.5) {
      confidence = 40
    } else if (title.length < config.minLength) {
      confidence = 70
    }

    return {
      title: title.trim(),
      confidence,
      metadata: {
        pluginId: this.id,
        pluginVersion: this.version,
        originalLength: generated.length
      }
    }
  }

  validate(title: string) {
    const errors: string[] = []
    const warnings: string[] = []
    const config = this.defaultConfig!
    
    if (title.length < config.minLength) {
      errors.push(`标题过短：${title.length} 字，要求至少 ${config.minLength} 字`)
    }
    
    if (title.length > config.maxLength) {
      errors.push(`标题过长：${title.length} 字，要求最多 ${config.maxLength} 字`)
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
})()

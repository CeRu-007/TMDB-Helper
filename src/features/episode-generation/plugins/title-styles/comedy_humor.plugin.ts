/**
 * 喜剧幽默风格插件
 * 突出轻松幽默的元素，使用俏皮或反差的表达，如：意外惊喜、搞笑日常、乌龙事件
 */

import { BasePlugin, PluginType, ITitleStylePlugin, EpisodeContent, ParsedTitle, TitleStyleConfig  } from '../core'
import { cleanTitleText } from '../../lib/text-cleaner'

export const comedy_humorPlugin: ITitleStylePlugin = new (class extends BasePlugin implements ITitleStylePlugin {
  constructor() {
    super({
      id: 'comedy_humor',
      type: PluginType.TitleStyle,
      name: '喜剧幽默',
      description: '突出轻松幽默的元素，使用俏皮或反差的表达，如：意外惊喜、搞笑日常、乌龙事件',
      icon: '😄',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['comedy_humor', 'builtin'],
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
    
    return `你是一位专业的影视内容编辑，擅长撰写喜剧幽默风格的标题。

任务：为第 ${content.episodeNumber} 集撰写喜剧幽默风格的标题

风格要求：
突出轻松幽默的元素，使用俏皮或反差的表达，如：意外惊喜、搞笑日常、乌龙事件

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成一个 ${config.minLength}-${config.maxLength} 字的标题，要求：
- 符合喜剧幽默风格特点
- 简洁有力，易于记忆
- 直接输出标题，不要任何解释或附加内容`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedTitle {
    const config = { ...this.defaultConfig, ...options }
    
    // 使用统一的标题清理工具（包括清理前缀、引号、标点、方括号、"第X集"）
    let title = cleanTitleText(generated)
    
    // 限制长度
    if (title.length > config.maxLength) {
      title = title.substring(0, config.maxLength)
    }

    let confidence = 100
    if (title.length < config.minLength * 0.5) {
      confidence = 40
    }

    return {
      title: title.trim(),
      confidence,
      metadata: {
        pluginId: this.id,
        pluginVersion: this.version,
        originalLength: generated.length
      }
    }}

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

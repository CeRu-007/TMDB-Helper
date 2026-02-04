/**
 * 地名招式风格插件
 * 优先使用字幕中出现的具体地名、招式名、技能名作为标题核心
 */

import { BasePlugin, PluginType, ITitleStylePlugin, EpisodeContent, ParsedTitle, TitleStyleConfig  } from '../core'

import { cleanTitleText } from '../../lib/text-cleaner'

export const locationSkillPlugin: ITitleStylePlugin = new (class extends BasePlugin implements ITitleStylePlugin {
  constructor() {
    super({
      id: 'location_skill',
      type: PluginType.TitleStyle,
      name: '地名招式风格',
      description: '优先使用字幕中出现的具体地名、招式名、技能名作为标题核心，采用简洁的组合方式，如：树神之谜、封印之战、古村秘密等，避免使用冒号或复杂格式',
      icon: '⚔️',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['action', 'battle', 'fantasy', '地名', '招式'],
      metadata: {
        category: 'action',
        difficulty: 'medium'
      }
    })
  }

  defaultConfig: TitleStyleConfig = {
    maxLength: 20,
    minLength: 5,
    keywords: ['对决', '激战', '突袭', '决战'],
    excludeKeywords: ['第', '集', '话'],
    punctuationHandling: 'simplify'
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位动漫编辑，擅长提炼标题。

任务：为第 ${content.episodeNumber} 集撰写一个 ${config.minLength}-${config.maxLength} 字的标题

风格要求：
1. 优先使用字幕中出现的具体地名（如"天山"、"龙之谷"、"暗黑城"）
2. 突出招式名、技能名、武器名（如"雷神之锤"、"火焰剑"、"幻影步"）
3. 体现战斗场景和特殊元素（如"对决"、"激战"、"突袭"）
4. 简洁有力，易于记忆
5. 避免使用"第X集"这类表述
6. 采用简洁的组合方式，不使用冒号或复杂格式

内容来源：
${content.subtitleContent.substring(0, 1500)}${content.subtitleContent.length > 1500 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成一个标题，要求：
- 长度在 ${config.minLength} 到 ${config.maxLength} 字之间
- 包含地名、招式名或技能名
- 具有冲击力和画面感
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

    // 计算置信度
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

    // 检查是否包含排除关键词
    for (const excludeKeyword of config.excludeKeywords || []) {
      if (title.includes(excludeKeyword)) {
        warnings.push(`标题包含排除关键词："${excludeKeyword}"`)
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
})()
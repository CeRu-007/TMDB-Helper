/**
 * 角色聚焦风格插件
 * 以主要角色名字和行动为标题重点，突出角色的成长与变化
 */

import { BasePlugin, PluginType, ITitleStylePlugin, EpisodeContent, ParsedTitle, TitleStyleConfig  } from '../core'

import { cleanTitleText } from '../../lib/text-cleaner'

export const characterFocusPlugin: ITitleStylePlugin = new (class extends BasePlugin implements ITitleStylePlugin {
  constructor() {
    super({
      id: 'character_focus',
      type: PluginType.TitleStyle,
      name: '角色聚焦',
      description: '以主要角色名字和行动为标题重点，突出角色的成长与变化',
      icon: '👤',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['character', 'drama', 'growth', '角色'],
      metadata: {
        category: 'character',
        difficulty: 'easy'
      }
    })
  }

  defaultConfig: TitleStyleConfig = {
    maxLength: 20,
    minLength: 5,
    keywords: ['成长', '觉醒', '决心', '选择'],
    excludeKeywords: ['第', '集', '话'],
    punctuationHandling: 'simplify'
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位动漫编辑，擅长提炼标题。

任务：为第 ${content.episodeNumber} 集撰写一个 ${config.minLength}-${config.maxLength} 字的标题

风格要求：
1. 以主要角色的名字作为标题核心
2. 突出角色的关键行动或决策
3. 体现角色的成长、变化或觉醒
4. 使用动宾结构，如"主角的决心"、"角色的觉醒"
5. 简洁有力，易于记忆
6. 避免使用"第X集"这类表述

内容来源：
${content.subtitleContent.substring(0, 1500)}${content.subtitleContent.length > 1500 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成一个标题，要求：
- 长度在 ${config.minLength} 到 ${config.maxLength} 字之间
- 包含角色名字和关键行动
- 体现角色的成长或变化
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
/**
 * 氛围营造风格插件
 * 注重场景和氛围的描述
 */

import { BasePlugin, PluginType, ISummaryStylePlugin, EpisodeContent, ParsedSummary, SummaryStyleConfig , SummaryConstraints } from '../core'
import { cleanSummaryText } from '../../lib/text-cleaner'

export const atmosphericPlugin: ISummaryStylePlugin = new (class extends BasePlugin implements ISummaryStylePlugin {
  constructor() {
    super({
      id: 'atmospheric',
      type: PluginType.SummaryStyle,
      name: '氛围营造',
      description: '注重场景和氛围的描述',
      icon: '🌅',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['atmospheric', 'builtin'],
      metadata: {
        category: 'summary',
        difficulty: 'medium'
      }
    })
  }

  isExclusive = false



  defaultConfig: SummaryStyleConfig = {
    minWordCount: 50,
    maxWordCount: 150,
    temperature: 0.7,
    maxTokens: 300,
    format: 'plain',
    allowQuestions: false,
    requireDeclarative: true
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位专业的影视内容编辑，擅长撰写氛围营造风格的简介。

任务：为第 ${content.episodeNumber} 集撰写氛围营造风格的简介

风格要求：
注重场景和氛围的描述

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成${config.minWordCount}-${config.maxWordCount} 字的简介，要求：
- 符合氛围营造风格特点
- 语言流畅，富有感染力
- 直接输出简介，不要任何解释或附加内容`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedSummary {
    const config = { ...this.defaultConfig, ...options }
    
        const wordCount = generated.trim().length
    let confidence = 100
    if (wordCount < config.minWordCount * 0.8 || wordCount > config.maxWordCount * 1.2) {
      confidence = 60
    } else if (wordCount < config.minWordCount || wordCount > config.maxWordCount) {
      confidence = 80
    }

    
    return {
      summary: generated.trim(),  // postProcess 会进一步清理
      wordCount: generated.trim().length,  // 临时字数，postProcess 后会更新
      confidence,
      metadata: {
        pluginId: this.id,
        pluginVersion: this.version
      }
    }}

  validate(summary: string, constraints?: SummaryConstraints) {
    const errors: string[] = []
    const warnings: string[] = []
    const config = { ...this.defaultConfig, ...constraints }
    
    if (summary.length < config.minWordCount) {
      errors.push(`简介过短：${summary.length} 字，要求至少 ${config.minWordCount} 字`)
    }
    
    if (summary.length > config.maxWordCount) {
      errors.push(`简介过长：${summary.length} 字，要求最多 ${config.maxWordCount} 字`)
    }

    if (config.allowQuestions === false) {
      if (summary.includes('？') || summary.includes('?')) {
        warnings.push('简介包含疑问句，建议使用陈述句')
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  postProcess(summary: string): string {
    return cleanSummaryText(summary)
  }
})()

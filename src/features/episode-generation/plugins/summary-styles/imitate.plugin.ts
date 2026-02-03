/**
 * 模仿风格插件
 * 根据提供的样本内容，模仿其写作风格和表达方式生成简介
 */

import { BasePlugin, PluginType, ISummaryStylePlugin, EpisodeContent, ParsedSummary, SummaryStyleConfig , SummaryConstraints } from '../core'

export const imitatePlugin: ISummaryStylePlugin = new (class extends BasePlugin implements ISummaryStylePlugin {
  constructor() {
    super({
      id: 'imitate',
      type: PluginType.SummaryStyle,
      name: '模仿',
      description: '根据提供的样本内容，模仿其写作风格和表达方式生成简介',
      icon: '🎭',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['imitate', 'builtin', 'exclusive'],
      metadata: {
        category: 'summary',
        difficulty: 'medium'
      }
    })
  }

  isExclusive = true



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
    
    return `你是一位专业的影视内容编辑，擅长撰写模仿风格的简介。

任务：为第 ${content.episodeNumber} 集撰写模仿风格的简介

风格要求：
根据提供的样本内容，模仿其写作风格和表达方式生成简介

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成${config.minWordCount}-${config.maxWordCount} 字的简介，要求：
- 符合模仿风格特点
- 语言流畅，富有感染力
- 直接输出简介，不要任何解释或附加内容`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedSummary {
    const config = { ...this.defaultConfig, ...options }
    
    // 清理多余空白
    let summary = generated.trim()
    
    // 移除可能的前缀
    summary = summary.replace(/^(简介[:：]?\s*|描述[:：]?\s*|Description[:：]?\s*|Summary[:：]?\s*)/i, '')
    
    // 统计字数
    const wordCount = summary.length
    
    // 计算置信度
    let confidence = 100
    if (wordCount < config.minWordCount * 0.8 || wordCount > config.maxWordCount * 1.2) {
      confidence = 60
    } else if (wordCount < config.minWordCount || wordCount > config.maxWordCount) {
      confidence = 80
    }

    return {
      summary,
      wordCount,
      confidence,
      metadata: {
        pluginId: this.id,
        pluginVersion: this.version
      }
    }
  }

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
    // 移除多余的空行
    let processed = summary.replace(/\n{3,}/g, '\n\n')
    
    // 统一中英文标点
    processed = processed
      .replace(/，/g, '，')
      .replace(/。/g, '。')
      .replace(/！/g, '！')
      .replace(/？/g, '？')
    
    return processed.trim()
  }
})()

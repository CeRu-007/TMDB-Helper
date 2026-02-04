/**
 * Crunchyroll平台风格插件
 * 动漫平台专业风格：结构化简洁表达，客观描述核心冲突
 */

import { BasePlugin, PluginType, ISummaryStylePlugin, EpisodeContent, ParsedSummary, SummaryStyleConfig, SummaryConstraints } from '../core'
import { cleanSummaryText } from '../../lib/text-cleaner'

export const crunchyrollPlugin: ISummaryStylePlugin = new (class extends BasePlugin implements ISummaryStylePlugin {
  constructor() {
    super({
      id: 'crunchyroll',
      type: PluginType.SummaryStyle,
      name: 'Crunchyroll平台风格',
      description: '动漫平台专业风格：结构化简洁表达，客观描述核心冲突',
      icon: '🍥',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['platform', 'anime', 'professional', 'crunchyroll'],
      metadata: {
        category: 'platform',
        difficulty: 'medium'
      }
    })
  }

  isExclusive = false

  defaultConfig: SummaryStyleConfig = {
    minWordCount: 50,
    maxWordCount: 150,
    temperature: 0.6,
    maxTokens: 300,
    format: 'plain',
    allowQuestions: false,
    requireDeclarative: true
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位Crunchyroll平台的内容编辑，擅长撰写专业简洁的动漫剧集简介。

任务：为第 ${content.episodeNumber} 集撰写Crunchyroll风格的分集简介

风格要求：
1. **句式结构**（根据字幕内容采用最合适的）：
   - [核心角色] + [核心事件]
   - [核心角色] + [核心行为]
   - [情境] + [核心角色]
   - [情境] + [核心事件]
   - [情境] + [核心行为]
   - [背景] + [核心行为]
   - [背景] + [核心事件]
   - [背景] + [核心角色]

2. **内容规范**：
   - 每段句式长度不超过15字
   - 严禁使用疑问句、反问句或以问号结尾的句子
   - 在描述事件时，不要描述结果
   - 句式结构的第二部分，可以是连续的
   - 基本结构就是 "谁（在什么情况下）做了什么"
   - 优先使用能营造氛围的"情境"作为开头，除非人物的核心动机（背景）是事件最独特、最重要的吸引力
   - 最终生成的结果必须是一个逗号+句号或者两个逗号+句号

3. **综合应用示例**：
   - 采用 [情境] + [核心角色/核心行为]：在纸醉金迷的家族宴会上，恺撒意外发现了针对自己的暗杀阴谋。
   - 采用 [背景] + [核心角色/核心行为]：为了巩固家族联盟，恺撒在一场盛宴上遭遇了突如其来的背叛。
   - 采用 [核心角色] + [核心行为/事件]：恺撒在看似和谐的家族宴会中，揭开了一场暗杀计划的序幕。

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成 ${config.minWordCount}-${config.maxWordCount} 字的简介，要求：
- 结构化简洁表达
- 客观描述核心冲突
- 严格遵循句式结构要求`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedSummary {
    const config = { ...this.defaultConfig, ...options }
    
    let summary = generated.trim()
    summary = summary.replace(/^(简介[:：]?\s*|描述[:：]?\s*|Description[:：]?\s*|Summary[:：]?\s*)/i, '')
    
    const wordCount = summary.length
    
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
    return cleanSummaryText(summary)
  }
})()
/**
 * Netflix平台风格插件
 * 情感驱动叙述，强调角色困境与选择，富有张力的悬念营造
 */

import { BasePlugin, PluginType, ISummaryStylePlugin, EpisodeContent, ParsedSummary, SummaryStyleConfig, SummaryConstraints } from '../core'
import { cleanSummaryText } from '../../lib/text-cleaner'

export const netflixPlugin: ISummaryStylePlugin = new (class extends BasePlugin implements ISummaryStylePlugin {
  constructor() {
    super({
      id: 'netflix',
      type: PluginType.SummaryStyle,
      name: 'Netflix平台风格',
      description: '情感驱动叙述，强调角色困境与选择，富有张力的悬念营造',
      icon: '🎬',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['platform', 'emotional', 'suspense', 'netflix'],
      metadata: {
        category: 'platform',
        difficulty: 'hard'
      }
    })
  }

  isExclusive = false

  defaultConfig: SummaryStyleConfig = {
    minWordCount: 50,
    maxWordCount: 150,
    temperature: 0.8,
    maxTokens: 300,
    format: 'plain',
    allowQuestions: false,
    requireDeclarative: true
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return `你是一位Netflix平台的内容编辑，擅长撰写富有情感张力的剧集简介。

任务：为第 ${content.episodeNumber} 集撰写Netflix风格的分集简介

风格要求：
1. **情感驱动叙述**：
   - 重点描述角色的内心冲突和情感状态
   - 突出人物关系的变化和张力
   - 强调角色面临的道德选择和困境
   - 适度使用情感词汇增强代入感

2. **戏剧性表达**：
   - 使用富有张力的语言营造氛围
   - 突出关键转折点的戏剧效果
   - 强调危机感和紧迫感
   - 避免平铺直叙，增加表达力度

3. **悬念营造**：
   - 结尾必须留下强烈的期待感
   - 暗示即将到来的重大变化
   - 突出未解决的核心问题
   - 使用"当...时"、"然而"等转折词增强悬念

4. **结构要求**：
   - 采用：[角色困境] + [情感冲突] + [悬念钩子] 的三段式结构
   - 每部分衔接自然，层层递进
   - 重视角色名字的使用，增强个人化色彩

5. **语言风格**：
   - 生动有力，富有感染力
   - 适度使用修饰词增强表现力
   - 避免过于客观的描述，注入情感色彩

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成 ${config.minWordCount}-${config.maxWordCount} 字的简介，要求：
- 语言富有感染力和画面感
- 避免剧透关键转折点
- 保持客观叙述的同时传递情感氛围
- 使用简短有力的句子增强节奏感`;
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

    // 检查是否包含疑问句（如果不允许）
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
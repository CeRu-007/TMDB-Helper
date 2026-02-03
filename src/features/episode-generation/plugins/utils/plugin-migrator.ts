/**
 * 插件迁移工具
 * 用于从现有的常量定义生成插件
 * 
 * 这个工具可以帮助快速将现有的风格常量转换为插件格式
 * 实际使用时，建议手动调整每个插件的具体实现
 */

import { StyleOption } from '../../types'
import { PluginType } from '../core/types'

/**
 * 从 StyleOption 生成插件模板
 */
export function generatePluginTemplate(styleOption: StyleOption, pluginType: PluginType): string {
  const isTitleStyle = pluginType === PluginType.TitleStyle
  const interfaceName = isTitleStyle ? 'ITitleStylePlugin' : 'ISummaryStylePlugin'
  const resultType = isTitleStyle ? 'ParsedTitle' : 'ParsedSummary'
  const configType = isTitleStyle ? 'TitleStyleConfig' : 'SummaryStyleConfig'
  
  return `/**
 * ${styleOption.name}风格插件
 * ${styleOption.description}
 */

import { BasePlugin, PluginType, ${interfaceName}, EpisodeContent, ${resultType}, ${configType} ${isTitleStyle ? '' : ', SummaryConstraints'} } from '../core'

export const ${styleOption.id}Plugin: ${interfaceName} = new (class extends BasePlugin implements ${interfaceName} {
  constructor() {
    super({
      id: '${styleOption.id}',
      type: PluginType.${isTitleStyle ? 'TitleStyle' : 'SummaryStyle'},
      name: '${styleOption.name}',
      description: '${styleOption.description}',
      icon: '${styleOption.icon}',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['${styleOption.id}', 'builtin']${styleOption.isExclusive ? ', ' : ''}${styleOption.isExclusive ? "'exclusive'" : ''},
      metadata: {
        category: '${isTitleStyle ? 'title' : 'summary'}',
        difficulty: 'medium'
      }
    })
  }

  ${isTitleStyle ? '' : `isExclusive = ${styleOption.isExclusive || false}\n\n`}

  defaultConfig: ${configType} = {
    ${isTitleStyle ? `maxLength: 20,
    minLength: 5,
    punctuationHandling: 'simplify'` : `minWordCount: 50,
    maxWordCount: 150,
    temperature: 0.7,
    maxTokens: 300,
    format: 'plain',
    allowQuestions: false,
    requireDeclarative: true`}
  }

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options }
    
    return \`你是一位专业的影视内容编辑，擅长撰写${styleOption.name}风格的${isTitleStyle ? '标题' : '简介'}。

任务：为第 \${content.episodeNumber} 集撰写${styleOption.name}风格的${isTitleStyle ? '标题' : '简介'}

风格要求：
${styleOption.description}

内容来源：
\${content.subtitleContent.substring(0, 2000)}\${content.subtitleContent.length > 2000 ? '...' : ''}

\${content.originalTitle ? \`原标题：\${content.originalTitle}\` : ''}

请生成${isTitleStyle ? `一个 \${config.minLength}-\${config.maxLength} 字的标题` : `\${config.minWordCount}-\${config.maxWordCount} 字的简介`}，要求：
- 符合${styleOption.name}风格特点
- ${isTitleStyle ? '简洁有力，易于记忆' : '语言流畅，富有感染力'}
- 直接输出${isTitleStyle ? '标题' : '简介'}，不要任何解释或附加内容\`;
  }

  parseResult(generated: string, options?: Record<string, any>): ${resultType} {
    const config = { ...this.defaultConfig, ...options }
    
    ${isTitleStyle ? `// 清理内容
    let title = generated.trim()
    
    // 移除前缀
    title = title.replace(/^(标题[:：]?\\s*|Title[:：]?\\s*)/i, '')
    
    // 移除引号
    title = title.replace(/^["'«」『]|["'»』」]$/g, '')
    
    // 移除标点
    if (config.punctuationHandling === 'remove' || config.punctuationHandling === 'simplify') {
      title = title.replace(/[，。、；：]/g, '')
    }
    
    // 移除"第X集"
    title = title.replace(/第\\s*\\d+\\s*[集话]/g, '')
    
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
    }` : `// 清理多余空白
    let summary = generated.trim()
    
    // 移除可能的前缀
    summary = summary.replace(/^(简介[:：]?\\s*|描述[:：]?\\s*|Description[:：]?\\s*|Summary[:：]?\\s*)/i, '')
    
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
    }`}
  }

  ${isTitleStyle ? `validate(title: string) {
    const errors: string[] = []
    const warnings: string[] = []
    const config = this.defaultConfig!
    
    if (title.length < config.minLength) {
      errors.push(\`标题过短：\${title.length} 字，要求至少 \${config.minLength} 字\`)
    }
    
    if (title.length > config.maxLength) {
      errors.push(\`标题过长：\${title.length} 字，要求最多 \${config.maxLength} 字\`)
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }` : `validate(summary: string, constraints?: SummaryConstraints) {
    const errors: string[] = []
    const warnings: string[] = []
    const config = { ...this.defaultConfig, ...constraints }
    
    if (summary.length < config.minWordCount) {
      errors.push(\`简介过短：\${summary.length} 字，要求至少 \${config.minWordCount} 字\`)
    }
    
    if (summary.length > config.maxWordCount) {
      errors.push(\`简介过长：\${summary.length} 字，要求最多 \${config.maxWordCount} 字\`)
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
    let processed = summary.replace(/\\n{3,}/g, '\\n\\n')
    
    // 统一中英文标点
    processed = processed
      .replace(/，/g, '，')
      .replace(/。/g, '。')
      .replace(/！/g, '！')
      .replace(/？/g, '？')
    
    return processed.trim()
  }`}
})()
`
}

/**
 * 批量生成插件模板
 */
export function generateAllPluginTemplates(
  titleStyles: StyleOption[],
  summaryStyles: StyleOption[]
): { titleStyles: string[], summaryStyles: string[] } {
  return {
    titleStyles: titleStyles.map(style => ({
      id: style.id,
      content: generatePluginTemplate(style, PluginType.TitleStyle)
    })),
    summaryStyles: summaryStyles.map(style => ({
      id: style.id,
      content: generatePluginTemplate(style, PluginType.SummaryStyle)
    }))
  }
}

/**
 * 改写操作插件
 * 改写文字，使用不同表达
 */

import { BaseEnhanceOperationPlugin } from './base-enhance-operation'
import { EnhanceInput, EnhanceConfig, EnhanceOperationType } from './types'

export class RewritePlugin extends BaseEnhanceOperationPlugin {
  constructor() {
    super({
      id: 'rewrite',
      type: 'enhance-operation' as any,
      name: '改写',
      description: '改写文字，使用不同表达',
      icon: '✍️',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['enhance', 'rewrite']
    })
  }

  operationType: EnhanceOperationType = 'rewrite'

  defaultConfig: EnhanceConfig = {
    temperature: 0.7,
    maxTokens: 1000
  }

  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string {
    // 如果有选中的文字，只改写选中的部分
    if (input.selectedText) {
      return `请对以下文字进行改写，保持原意但使用不同的表达方式：

【需要改写的文字】
${input.selectedText}

【改写要求】
1. 保持原文的核心意思和信息
2. 使用不同的词汇和句式表达
3. 让表达更加生动自然
4. 保持与上下文的连贯性
5. 字数与原文相近

请直接输出改写后的文字，不要包含其他说明：`
    }
    
    // 否则改写整个标题和简介
    return `请对以下影视剧集标题和简介进行改写，使用不同的表达方式重新组织内容：

【原始内容】
标题：${input.title}
简介：${input.summary}

【改写要求】
1. **保持原意**：核心情节和信息点必须完全保留
2. **表达创新**：使用不同的词汇和句式重新组织
3. **语言优化**：让表达更加生动自然
4. **风格统一**：保持原有的语言风格特色
5. **长度控制**：标题15字内，简介120-200字为佳

请严格按照以下格式输出：
标题：[改写后的标题]
简介：[改写后的简介]`
  }
}

export const rewritePlugin = new RewritePlugin()
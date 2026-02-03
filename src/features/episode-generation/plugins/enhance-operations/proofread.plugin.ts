/**
 * 纠错操作插件
 * 语法纠错，优化语句
 */

import { BaseEnhanceOperationPlugin } from './base-enhance-operation'
import { EnhanceInput, EnhanceConfig, EnhanceOperationType } from './types'

export class ProofreadPlugin extends BaseEnhanceOperationPlugin {
  constructor() {
    super({
      id: 'proofread',
      type: 'enhance-operation' as any,
      name: '纠错',
      description: '语法纠错，优化语句',
      icon: '✅',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['enhance', 'proofread']
    })
  }

  operationType: EnhanceOperationType = 'proofread'

  defaultConfig: EnhanceConfig = {
    temperature: 0.3,
    maxTokens: 1000
  }

  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string {
    return `请对以下影视剧集标题和简介进行语法纠错和语句优化，使其更加通顺流畅：

【原始内容】
标题：${input.title}
简介：${input.summary}

【纠错优化要求】
1. **语法纠正**：修正语法错误、标点符号使用不当等问题
2. **语句通顺**：优化句式结构，使表达更加流畅自然
3. **用词准确**：选择更准确、恰当的词汇表达
4. **逻辑清晰**：确保句子间逻辑关系清楚，表达连贯
5. **风格统一**：保持整体语言风格的一致性

【纠错原则】
- 保持原意不变，只优化表达方式
- 修正明显的语法和用词错误
- 提升语言的准确性和流畅度
- 保持内容的完整性和可读性
- 适合正式的影视介绍场合

【注意事项】
- 不改变核心内容和信息量
- 保持原有的语言风格特色
- 确保修改后的内容更加专业和准确

请严格按照以下格式输出：
标题：[纠错后的标题]
简介：[纠错后的简介]`
  }
}

export const proofreadPlugin = new ProofreadPlugin()
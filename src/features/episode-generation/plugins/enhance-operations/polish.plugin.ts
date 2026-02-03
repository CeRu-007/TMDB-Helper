/**
 * 润色操作插件
 * 优化表达，提升内容的吸引力和可读性
 */

import { BaseEnhanceOperationPlugin } from './base-enhance-operation'
import { EnhanceInput, EnhanceConfig, EnhanceOperationType } from './types'

export class PolishPlugin extends BaseEnhanceOperationPlugin {
  constructor() {
    super({
      id: 'polish',
      type: 'enhance-operation' as any,
      name: '润色',
      description: '优化表达，提升内容的吸引力和可读性',
      icon: '✨',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['enhance', 'polish']
    })
  }

  operationType: EnhanceOperationType = 'polish'

  defaultConfig: EnhanceConfig = {
    temperature: 0.6,
    maxTokens: 1000
  }

  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string {
    return `请对以下影视剧集标题和简介进行专业润色，提升内容的吸引力和表达质量：

【原始内容】
标题：${input.title}
简介：${input.summary}

【润色要求】
1. **词汇升级**：将平淡词汇替换为更生动、更有感染力的表达
2. **句式优化**：调整句子结构，增强节奏感和可读性
3. **情感渲染**：适度增强情感色彩，但不夸张造作
4. **保持原意**：核心情节和信息点必须完全保留
5. **长度控制**：标题15字内，简介120-200字为佳

【参考标准】
- 标题要有冲击力，能瞬间抓住观众注意力
- 简介要有画面感，让读者产生观看欲望
- 语言要精练有力，避免冗余表达

请严格按照以下格式输出：
标题：[润色后的标题]
简介：[润色后的简介]`
  }
}

export const polishPlugin = new PolishPlugin()
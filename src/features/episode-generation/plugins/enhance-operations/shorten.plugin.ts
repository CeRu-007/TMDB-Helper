/**
 * 缩写操作插件
 * 精简内容，提炼核心信息
 */

import { BaseEnhanceOperationPlugin } from './base-enhance-operation'
import { EnhanceInput, EnhanceConfig, EnhanceOperationType } from './types'

export class ShortenPlugin extends BaseEnhanceOperationPlugin {
  constructor() {
    super({
      id: 'shorten',
      type: 'enhance-operation' as any,
      name: '缩写',
      description: '精简内容，提炼核心信息',
      icon: '📝',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['enhance', 'shorten']
    })
  }

  operationType: EnhanceOperationType = 'shorten'

  defaultConfig: EnhanceConfig = {
    temperature: 0.4,
    maxTokens: 600
  }

  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string {
    return `请将以下影视剧集标题和简介进行专业精简，提炼出最核心的信息：

【原始内容】
标题：${input.title}
简介：${input.summary}

【精简策略】
1. **核心提取**：识别并保留最关键的情节转折点和冲突
2. **信息优先级**：主要人物关系 > 核心冲突 > 情节发展 > 背景信息
3. **删除冗余**：去除修饰性词汇、重复表达和次要细节
4. **保持吸引力**：即使精简也要保持悬念和观看欲望
5. **严格控制**：标题10字内，简介60-80字

【质量标准】
- 每个字都有存在价值，不能再删减
- 读完后能清楚了解本集的核心看点
- 保持原有的情感基调和类型特色

请严格按照以下格式输出：
标题：[精简后的标题]
简介：[精简后的简介]`
  }
}

export const shortenPlugin = new ShortenPlugin()
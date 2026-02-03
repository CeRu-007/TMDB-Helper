/**
 * 扩写操作插件
 * 丰富内容，增加细节描述
 */

import { BaseEnhanceOperationPlugin } from './base-enhance-operation'
import { EnhanceInput, EnhanceConfig, EnhanceOperationType } from './types'

export class ExpandPlugin extends BaseEnhanceOperationPlugin {
  constructor() {
    super({
      id: 'expand',
      type: 'enhance-operation' as any,
      name: '扩写',
      description: '丰富内容，增加细节描述',
      icon: '📖',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['enhance', 'expand']
    })
  }

  operationType: EnhanceOperationType = 'expand'

  defaultConfig: EnhanceConfig = {
    temperature: 0.8,
    maxTokens: 1200
  }

  buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string {
    return `请将以下影视剧集标题和简介进行专业扩写，丰富内容层次和细节描述：

【原始内容】
标题：${input.title}
简介：${input.summary}

【扩写方向】
1. **情节深化**：补充关键情节的前因后果，增加转折细节
2. **人物刻画**：丰富主要角色的动机、情感状态和关系变化
3. **环境渲染**：适度增加场景描述，营造氛围感
4. **悬念构建**：通过细节暗示增强观众的期待感
5. **情感层次**：深化角色间的情感冲突和内心戏

【扩写原则】
- 所有新增内容必须符合剧情逻辑
- 保持原有的节奏感，不拖沓冗长
- 增强画面感和代入感
- 标题可适度调整以匹配扩写内容
- 简介控制在200-300字

请严格按照以下格式输出：
标题：[扩写后的标题]
简介：[扩写后的简介]`
  }
}

export const expandPlugin = new ExpandPlugin()
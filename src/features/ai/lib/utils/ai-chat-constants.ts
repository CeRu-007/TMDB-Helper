export const SUPPORTED_SUBTITLE_FORMATS = ['.srt', '.ass', '.vtt', '.ssa', '.sub']

export interface SubtitleTaskConfig {
  taskName: string
  messageType: 'text' | 'episode-summary'
  promptBuilder: (content: string, fileName: string) => string
  successMessage: string
  errorPrefix: string
  includeUserMessage?: boolean
}

export const SUBTITLE_TASKS: Record<string, SubtitleTaskConfig> = {
  generateSummary: {
    taskName: '生成分集简介',
    messageType: 'episode-summary',
    promptBuilder: (content, fileName) => `请基于以下字幕内容生成分集简介：

字幕文件：${fileName}

字幕内容：
${content}`,
    successMessage: '分集简介生成完成',
    errorPrefix: '生成分集简介',
    includeUserMessage: true
  },
  analyzeDialogues: {
    taskName: '分析角色对话',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容分析主要角色的对话特点：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 分析主要角色的语言风格和表达习惯
2. 总结每个角色的性格特点
3. 指出角色之间的关系和互动模式
4. 提取具有代表性的对话片段
5. 用中文输出，条理清晰

请直接输出分析结果，不需要其他说明。`,
    successMessage: '角色对话分析完成',
    errorPrefix: '分析角色对话',
    includeUserMessage: false
  },
  extractPlots: {
    taskName: '提取关键情节',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容提取关键情节：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 按时间顺序列出5-10个关键情节
2. 简要描述每个情节的内容和意义
3. 标注情节中的重要转折点
4. 指出主要冲突和解决方案
5. 用中文输出，条理清晰

请直接输出关键情节列表，不需要其他说明。`,
    successMessage: '关键情节提取完成',
    errorPrefix: '提取关键情节',
    includeUserMessage: false
  },
  analyzePlot: {
    taskName: '分析并总结剧情',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容进行深度剧情分析：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 分析主要剧情线索和发展脉络
2. 总结核心冲突和矛盾
3. 探讨主题思想和深层含义
4. 分析叙事手法和结构特点
5. 用中文输出，条理清晰

请直接输出分析结果，不需要其他说明。`,
    successMessage: '剧情分析完成',
    errorPrefix: '分析剧情',
    includeUserMessage: false
  },
  createEngaging: {
    taskName: '创建吸引人的简介',
    messageType: 'text',
    promptBuilder: (content, fileName) => `请基于以下字幕内容创建一个吸引人的剧集简介：

字幕文件：${fileName}

字幕内容：
${content}

要求：
1. 简介长度控制在150-250字
2. 突出最吸引人的情节点
3. 营造悬念感，激发观看兴趣
4. 语言生动，富有感染力
5. 用中文输出

请直接输出简介内容，不需要其他说明。`,
    successMessage: '吸引人的简介创建完成',
    errorPrefix: '创建简介',
    includeUserMessage: false
  }
}

export const DEFAULT_SUGGESTIONS = ['深入探讨剧情细节', '了解世界观设定', '探索相关作品']

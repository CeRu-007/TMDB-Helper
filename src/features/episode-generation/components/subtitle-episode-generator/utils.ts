import { SubtitleEpisode, GenerationResult, GenerationConfig, EnhanceOperation } from './types'
import { GENERATION_STYLES, TITLE_STYLES } from './constants'

// 智能截断文件名函数
export function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) {
    return fileName
  }

  // 提取文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf('.')
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''

  // 如果扩展名太长，直接截断
  if (extension.length > 10) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  // 计算可用于文件名的长度
  const availableLength = maxLength - extension.length - 3 // 3 for '...'

  if (availableLength <= 0) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  // 智能截断：显示开头和结尾，中间用省略号
  const startLength = Math.ceil(availableLength * 0.6)
  const endLength = availableLength - startLength

  if (endLength <= 0) {
    return name.substring(0, startLength) + '...' + extension
  }

  return name.substring(0, startLength) + '...' + name.substring(name.length - endLength) + extension
}

// 将时间戳转换为分钟数（四舍五入）
export function timestampToMinutes(timestamp: string): number {
  if (!timestamp) return 0

  try {
    // 处理SRT格式: 00:45:30,123 或 VTT格式: 00:45:30.123
    const timeStr = timestamp.replace(',', '.').split('.')[0] // 移除毫秒部分
    const parts = timeStr.split(':')

    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0
      const minutes = parseInt(parts[1]) || 0
      const seconds = parseInt(parts[2]) || 0

      const totalMinutes = hours * 60 + minutes + seconds / 60
      return Math.round(totalMinutes)
    }
  } catch (error) {
    console.error('时间戳转换错误:', error)
  }

  return 0
}

// 解析字幕文件
export function parseSubtitleFile(content: string, filename: string): SubtitleEpisode[] {
  const episodes: SubtitleEpisode[] = []

  try {
    // 简单的SRT格式解析
    if (filename.toLowerCase().endsWith('.srt')) {
      const blocks = content.split(/\n\s*\n/).filter(block => block.trim())

      let currentEpisode = 1
      let episodeContent = ""
      let totalContent = ""
      let lastTimestamp = ""

      blocks.forEach(block => {
        const lines = block.trim().split('\n')
        if (lines.length >= 3) {
          // 提取时间戳
          const timestampLine = lines[1]
          if (timestampLine && timestampLine.includes('-->')) {
            const endTime = timestampLine.split('-->')[1].trim()
            if (endTime) {
              lastTimestamp = endTime
            }
          }

          // 提取字幕文本（跳过序号和时间戳）
          const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim()
          if (text) {
            // 保持原始字幕格式，每行字幕独立保存
            episodeContent += `${text}\n`
            totalContent += `${text}\n`

            // 检查是否是新集的开始（简单的启发式规则）
            if (text.match(/第\s*\d+\s*集|Episode\s*\d+|EP\s*\d+/i)) {
              if (episodeContent.trim() && episodeContent.trim().length > 50) {
                episodes.push({
                  episodeNumber: currentEpisode,
                  content: episodeContent.trim(),
                  wordCount: episodeContent.trim().length,
                  lastTimestamp: lastTimestamp
                })
                currentEpisode++
                episodeContent = ""
              }
            }
          }
        }
      })

      // 添加最后一集
      if (episodeContent.trim() && episodeContent.trim().length > 50) {
        episodes.push({
          episodeNumber: currentEpisode,
          content: episodeContent.trim(),
          wordCount: episodeContent.trim().length,
          lastTimestamp: lastTimestamp
        })
      }

      // 如果没有检测到分集，尝试按内容长度分割
      if (episodes.length === 0 && totalContent.trim()) {
        const sentences = totalContent.split(/[。！？.!?]/).filter(s => s.trim().length > 10)
        const chunkSize = Math.max(10, Math.floor(sentences.length / 3)) // 假设分为3集

        for (let i = 0; i < sentences.length; i += chunkSize) {
          const chunk = sentences.slice(i, i + chunkSize).join('。')
          if (chunk.trim()) {
            episodes.push({
              episodeNumber: Math.floor(i / chunkSize) + 1,
              content: chunk.trim(),
              wordCount: chunk.trim().length
            })
          }
        }
      }
    }

    // VTT格式解析
    else if (filename.toLowerCase().endsWith('.vtt')) {
      const lines = content.split('\n')
      let episodeContent = ""
      let lastTimestamp = ""

      lines.forEach(line => {
        const trimmedLine = line.trim()
        // 提取时间戳
        if (trimmedLine.includes('-->')) {
          const endTime = trimmedLine.split('-->')[1].trim()
          if (endTime) {
            lastTimestamp = endTime
          }
        }
        // 跳过时间戳和空行
        else if (trimmedLine && !trimmedLine.startsWith('WEBVTT')) {
          episodeContent += trimmedLine + " "
        }
      })

      if (episodeContent.trim()) {
        episodes.push({
          episodeNumber: 1,
          content: episodeContent.trim(),
          wordCount: episodeContent.trim().length,
          lastTimestamp: lastTimestamp
        })
      }
    }

    // 如果没有检测到分集，将整个内容作为一集
    if (episodes.length === 0) {
      const cleanContent = content
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '') // 移除SRT时间戳
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '') // 移除VTT时间戳
        .replace(/WEBVTT/g, '') // 移除VTT头部
        .replace(/\n+/g, ' ') // 合并多个换行
        .trim()

      if (cleanContent) {
        episodes.push({
          episodeNumber: 1,
          content: cleanContent,
          wordCount: cleanContent.length
        })
      }
    }
  } catch (error) {
    console.error('字幕文件解析失败:', error)
    // 返回一个默认的集数
    episodes.push({
      episodeNumber: 1,
      content: '字幕文件解析失败，请检查文件格式',
      wordCount: 0
    })
  }

  return episodes
}

// 检测是否是余额不足错误
export function isInsufficientBalanceError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('account balance is insufficient') ||
           error.includes('余额已用完') ||
           error.includes('余额不足')
  }

  if (error && typeof error === 'object') {
    const errorStr = JSON.stringify(error).toLowerCase()
    return errorStr.includes('30001') ||
           errorStr.includes('account balance is insufficient') ||
           errorStr.includes('insufficient_balance') ||
           (error as Record<string, unknown>).errorType === 'INSUFFICIENT_BALANCE'
  }

  return false
}

// 检测是否是配额超限错误
export function isQuotaExceededError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('exceeded today\'s quota') ||
           error.includes('quota exceeded') ||
           error.includes('配额已用完') ||
           error.includes('今日配额已用尽')
  }

  if (error && typeof error === 'object') {
    const errorStr = JSON.stringify(error).toLowerCase()
    const basicCheck = errorStr.includes('exceeded today\'s quota') ||
                      errorStr.includes('quota exceeded') ||
                      errorStr.includes('daily quota') ||
                      errorStr.includes('rate limit') ||
                      error.errorType === 'QUOTA_EXCEEDED'
    
    if (basicCheck) {
      return true
    }
    
    // 检查嵌套在details字段中的错误
    if (error.details) {
      if (typeof error.details === 'string') {
        return error.details.toLowerCase().includes('exceeded today\'s quota') ||
               error.details.toLowerCase().includes('quota exceeded')
      }
      
      if (typeof error.details === 'object') {
        const detailsStr = JSON.stringify(error.details).toLowerCase()
        return detailsStr.includes('exceeded today\'s quota') ||
               detailsStr.includes('quota exceeded')
      }
    }
  }

  return false
}

// 解析生成的内容
export function parseGeneratedContent(content: string, episode: SubtitleEpisode, config: GenerationConfig, styleId?: string): GenerationResult {
  const style = styleId ? GENERATION_STYLES.find(s => s.id === styleId) : null
  const styleName = style?.name || ''

  try {
    // 处理可能包含 ```json 前缀的内容
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '')
    }
    
    const parsed = JSON.parse(cleanContent)
    
    const summary = parsed.summary || '暂无简介'

    // 温和的字数检查（仅警告，不截断）
    const minLength = config.summaryLength[0]
    const maxLength = config.summaryLength[1]
    const allowedMaxLength = maxLength + 10 // 允许超出10字
    const currentLength = summary.length

    if (currentLength > allowedMaxLength) {
      console.warn(`简介字数超出过多(${currentLength}字 > ${allowedMaxLength}字)，建议调整提示词或重新生成`)
    } else if (currentLength < minLength - 5) {
      console.warn(`简介字数偏少(${currentLength}字 < ${minLength}字)，建议调整提示词`)
    }

    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title,
      generatedTitle: parsed.title || `第${episode.episodeNumber}集`,
      generatedSummary: summary,
      confidence: parsed.confidence || 0.8,
      wordCount: summary.length,
      generationTime: Date.now(),
      model: config.model,
      styles: styleId ? [styleId] : config.selectedStyles,
      styleId: styleId,
      styleName: styleName
    }
  } catch (error) {
    console.error('解析生成内容失败:', error)

    // 如果不是JSON格式，尝试从文本中提取
    const lines = content.split('\n').filter(line => line.trim())
    let title = `第${episode.episodeNumber}集`
    let summary = '暂无简介'

    // 尝试多种解析方式
    for (const line of lines) {
      const trimmedLine = line.trim()

      // 检查标题
      if (trimmedLine.includes('标题') || trimmedLine.includes('title') || trimmedLine.includes('Title')) {
        title = trimmedLine.replace(/.*[:：]\s*/, '').replace(/[""]/g, '').trim()
      }
      // 检查简介
      else if (trimmedLine.includes('简介') || trimmedLine.includes('summary') || trimmedLine.includes('Summary')) {
        summary = trimmedLine.replace(/.*[:：]\s*/, '').replace(/[""]/g, '').trim()
      }
      // 如果没有明确标识，但内容较长，可能是简介
      else if (trimmedLine.length > 20 && !trimmedLine.includes('第') && !trimmedLine.includes('集')) {
        summary = trimmedLine
      }
    }

    // 如果还是没有找到合适的简介，尝试更智能的提取
    if (summary === '暂无简介' && content.trim().length > 0) {
      const trimmedContent = content.trim()

      // 尝试提取引号内的长文本
      const quotedMatch = trimmedContent.match(/"([^"]{20,})"/);
      if (quotedMatch) {
        summary = quotedMatch[1]
      }
      // 如果没有引号，但内容较短且看起来像简介，直接使用
      else if (trimmedContent.length < 200 && !trimmedContent.includes('\n\n')) {
        summary = trimmedContent
      }
      // 如果内容很长，尝试提取第一段有意义的文本
      else {
        const sentences = trimmedContent.split(/[。！？.!?]/).filter(s => s.trim().length > 10)
        if (sentences.length > 0) {
          summary = sentences[0].trim() + '。'
        } else {
          summary = trimmedContent.substring(0, 100) + '...'
        }
      }
    }

    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title,
      generatedTitle: title,
      generatedSummary: summary,
      confidence: 0.6,
      wordCount: summary.length,
      generationTime: Date.now(),
      model: config.model,
      styles: styleId ? [styleId] : config.selectedStyles,
      styleId: styleId,
      styleName: styleName
    }
  }
}

// 构建提示词（为单个风格）
export function buildPromptForStyle(episode: SubtitleEpisode, config: GenerationConfig, styleId: string): string {
  const style = GENERATION_STYLES.find(s => s.id === styleId)

  // 构建标题风格要求 - 只使用描述内容，不包含风格名称
  const titleStyleRequirements = config.selectedTitleStyle
    ? (() => {
        const titleStyle = TITLE_STYLES.find(s => s.id === config.selectedTitleStyle)
        return titleStyle ? titleStyle.description : config.selectedTitleStyle
      })()
    : "简洁有力，8-15个字符，体现本集核心看点"

  // 所有风格都使用统一的字数设置
  const summaryRequirement = `字数控制在${config.summaryLength[0]}-${config.summaryLength[1]}字范围内，最多不超过${config.summaryLength[1] + 10}字`

  // 处理模仿风格的特殊情况
  if (styleId === 'imitate' && config.imitateConfig?.sampleContent) {
    return `请根据以下字幕内容，为第${episode.episodeNumber}集生成标题和剧情简介：

## 字幕内容
${episode.content.substring(0, 2000)}${episode.content.length > 2000 ? '...' : ''}

## 模仿风格样本
以下是您需要模仿的简介风格样本：
${config.imitateConfig.sampleContent}

## 生成要求
1. **标题要求**：${titleStyleRequirements}
2. **简介要求**：${summaryRequirement}
3. **模仿要求**：
   - 【风格分析】：深入分析样本的写作风格、语调特点、句式结构和表达习惯
   - 【结构模仿】：学习样本的叙述结构、段落组织和信息呈现方式
   - 【思路借鉴】：参考样本的描述思路、重点突出方式和情感表达方法
   - 【词汇创新】：严禁直接使用样本中的具体词汇、短语或句子，必须用全新的词汇表达
   - 【风格一致】：确保生成的简介在写作风格上与样本保持一致，但用词完全不同
   - 【内容原创】：完全基于当前分集内容创作，只模仿风格不复制内容
## ⚠️ 重要要求
- **严禁使用疑问句、反问句或以问号结尾的句子**
- **所有简介必须使用陈述句，确定性地描述剧情内容**
- **重点：必须严格模仿样本的写作风格，包括用词、句式、表达习惯等**

## 输出格式
{
  "title": "分集标题",
  "summary": "分集剧情简介",
  "confidence": 0.85
}

${config.customPrompt ? `
## 额外要求
${config.customPrompt}` : ''}`
  }

  // Netflix风格的特殊要求
  const netflixSpecialRequirements = styleId === 'netflix' ? `
   - **情感驱动叙述**：
     * 重点描述角色的内心冲突和情感状态
     * 突出人物关系的变化和张力
     * 强调角色面临的道德选择和困境
     * 适度使用情感词汇增强代入感
   - **戏剧性表达**：
     * 使用富有张力的语言营造氛围
     * 突出关键转折点的戏剧效果
     * 强调危机感和紧迫感
     * 避免平铺直叙，增加表达力度
   - **悬念营造**：
     * 结尾必须留下强烈的期待感
     * 暗示即将到来的重大变化
     * 突出未解决的核心问题
     * 使用"当...时"、"然而"等转折词增强悬念
   - **结构要求**：
     * 采用：[角色困境] + [情感冲突] + [悬念钩子] 的三段式结构
     * 每部分衔接自然，层层递进
     * 重视角色名字的使用，增强个人化色彩
   - **语言风格**：
     * 生动有力，富有感染力
     * 适度使用修饰词增强表现力
     * 避免过于客观的描述，注入情感色彩` : ''

  // Crunchyroll风格的特殊要求
  const crunchyrollSpecialRequirements = styleId === 'crunchyroll' ? `
   - **句式结构**（根据字幕内容采用最合适的）：
     * [核心角色] + [核心事件]
     * [核心角色] + [核心行为]
     * [情境] + [核心角色]
     * [情境] + [核心事件]
     * [情境] + [核心行为]
     * [背景] + [核心行为]
     * [背景] + [核心事件]
     * [背景] + [核心角色]
   - **内容规范**：
     * 每段句式长度不超过15字
     * 严禁使用疑问句、反问句或以问号结尾的句子
     * 在描述事件时，不要描述结果
     * 句式结构的第二部分，可以是连续的
     * 基本结构就是 "谁（在什么情况下）做了什么"。
     * 优先使用能营造氛围的'情境'作为开头，除非人物的核心动机（背景）是事件最独特、最重要的吸引力。
     * 最终生成的结果必须是一个逗号+句号或者两个逗号+句号
   **综合应用示例**：
     * 采用 [情境] + [核心角色/核心行为]：在纸醉金迷的家族宴会上，恺撒意外发现了针对自己的暗杀阴谋。
     * 采用 [背景] + [核心角色/核心行为]：为了巩固家族联盟，恺撒在一场盛宴上遭遇了突如其来的背叛。
     * 采用 [核心角色] + [核心行为/事件]：恺撒在看似和谐的家族宴会中，揭开了一场暗杀计划的序幕。` : ''

  // AI自由发挥风格的特殊要求
  const aiFreeSpecialRequirements = styleId === 'ai_free' ? `
   - 根据这段字幕文本生成一集分集剧情简介` : ''

  return `请根据以下字幕内容，为第${episode.episodeNumber}集生成标题和剧情简介：

## 字幕内容
${episode.content.substring(0, 2000)}${episode.content.length > 2000 ? '...' : ''}

## 生成要求
1. **标题要求**：${titleStyleRequirements}
2. **简介要求**：${summaryRequirement}，包含主要情节和看点
3. **简介风格要求**：${netflixSpecialRequirements}${crunchyrollSpecialRequirements}${aiFreeSpecialRequirements}

## ⚠️ 重要要求
- **严禁使用疑问句、反问句或以问号结尾的句子**
- **所有简介必须使用陈述句，确定性地描述剧情内容**

## 输出格式
{
  "title": "分集标题",
  "summary": "分集剧情简介",
  "confidence": 0.85
}

${config.customPrompt ? `\n## 额外要求\n${config.customPrompt}` : ''}`
}

// 构建增强提示词
export function buildEnhancePrompt(result: GenerationResult, operation: EnhanceOperation): string {
  const currentTitle = result.generatedTitle
  const currentSummary = result.generatedSummary

  switch (operation) {
    case 'polish':
      return `请对以下影视剧集标题和简介进行专业润色，提升内容的吸引力和表达质量：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

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

    case 'shorten':
      return `请将以下影视剧集标题和简介进行专业精简，提炼出最核心的信息：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

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

    case 'expand':
      return `请将以下影视剧集标题和简介进行专业扩写，丰富内容层次和细节描述：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

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

    case 'proofread':
      return `请对以下影视剧集标题和简介进行语法纠错和语句优化，使其更加通顺流畅：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

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

    default:
      return currentSummary
  }
}

// 获取操作名称
export function getOperationName(operation: EnhanceOperation): string {
  switch (operation) {
    case 'polish': return '润色'
    case 'shorten': return '缩写'
    case 'expand': return '扩写'
    case 'rewrite': return '改写'
    case 'proofread': return '纠错'
    default: return '处理'
  }
}

// 获取操作配置
export function getOperationConfig(operation: EnhanceOperation) {
  switch (operation) {
    case 'polish':
      return { temperature: 0.6, maxTokens: 1000 } // 需要更精确的控制
    case 'shorten':
      return { temperature: 0.4, maxTokens: 600 } // 需要更简洁的输出
    case 'expand':
      return { temperature: 0.8, maxTokens: 1200 } // 需要更多创造性
    case 'rewrite':
      return { temperature: 0.7, maxTokens: 1000 } // 平衡创造性和准确性
    case 'proofread':
      return { temperature: 0.3, maxTokens: 1000 } // 需要精确的语法纠正
    default:
      return { temperature: 0.7, maxTokens: 800 }
  }
}
import { SubtitleEpisode, EnhanceOperation } from './types'
import { logger } from '@/lib/utils/logger'

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
    logger.error('时间戳转换错误:', error)
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
    logger.error('字幕文件解析失败:', error)
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

// 构建增强提示词
export function buildEnhancePrompt(result: any, operation: EnhanceOperation): string {
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
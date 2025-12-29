/**
 * SRT字幕生成器
 * 将OCR识别结果转换为标准SRT格式
 */

export interface OCRResultItem {
  text: string
  confidence: number
  timestamp: number
  region?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface SRTEntry {
  index: number
  startTime: string  // 格式: HH:MM:SS,mmm
  endTime: string    // 格式: HH:MM:SS,mmm
  text: string
  confidence?: number
}

export interface SRTGeneratorConfig {
  /** 默认字幕持续时间 (秒) */
  defaultDuration: number
  /** 最小字幕持续时间 (秒) */
  minDuration: number
  /** 最大字幕持续时间 (秒) */
  maxDuration: number
  /** 相邻字幕合并阈值 (秒) */
  mergeThreshold: number
  /** 文本后处理选项 */
  postProcess: {
    /** 移除多余空格 */
    trimSpaces: boolean
    /** 统一标点符号 */
    normalizePunctuation: boolean
    /** 移除OCR噪音字符 */
    removeNoise: boolean
  }
}

/**
 * SRT字幕生成器
 */
export class SRTGenerator {
  private config: SRTGeneratorConfig

  constructor(config?: Partial<SRTGeneratorConfig>) {
    this.config = {
      defaultDuration: config?.defaultDuration ?? 3.0,
      minDuration: config?.minDuration ?? 1.0,
      maxDuration: config?.maxDuration ?? 8.0,
      mergeThreshold: config?.mergeThreshold ?? 2.0,
      postProcess: {
        trimSpaces: config?.postProcess?.trimSpaces ?? true,
        normalizePunctuation: config?.postProcess?.normalizePunctuation ?? true,
        removeNoise: config?.postProcess?.removeNoise ?? true
      }
    }
  }

  /**
   * 从OCR结果生成SRT条目
   */
  generate(ocrResults: OCRResultItem[]): SRTEntry[] {
    if (ocrResults.length === 0) return []

    // 按时间排序
    const sorted = [...ocrResults].sort((a, b) => a.timestamp - b.timestamp)

    // 合并相邻结果
    const merged = this.mergeAdjacentResults(sorted)

    // 生成SRT条目
    const entries: SRTEntry[] = merged.map((result, index) => {
      const startTime = this.formatTime(result.timestamp)
      const endTime = this.formatTime(result.timestamp + this.estimateDuration(result.text))

      return {
        index: index + 1,
        startTime,
        endTime,
        text: this.postProcessText(result.text),
        confidence: result.confidence
      }
    })

    return entries
  }

  /**
   * 生成完整的SRT文件内容
   */
  generateSRTFile(ocrResults: OCRResultItem[]): string {
    const entries = this.generate(ocrResults)

    return entries
      .map(entry => this.formatSRTEntry(entry))
      .join('\n')
  }

  /**
   * 合并相邻的OCR结果
   */
  private mergeAdjacentResults(results: OCRResultItem[]): OCRResultItem[] {
    if (results.length === 0) return []

    const merged: OCRResultItem[] = []
    let current: OCRResultItem | null = null

    for (const result of results) {
      // 跳过空结果或低置信度结果
      if (!result.text || result.text.includes('[无法识别]')) {
        continue
      }

      // 清理文本
      const cleanedText = this.postProcessText(result.text)
      if (!cleanedText) {
        continue
      }

      if (current) {
        // 检查是否应该合并
        const timeDiff = result.timestamp - (current.timestamp + this.estimateDuration(current.text))

        if (timeDiff < this.config.mergeThreshold) {
          // 合并文本
          current.text = `${current.text} ${cleanedText}`
          current.confidence = (current.confidence + result.confidence) / 2
        } else {
          merged.push(current)
          current = { ...result, text: cleanedText }
        }
      } else {
        current = { ...result, text: cleanedText }
      }
    }

    if (current) {
      merged.push(current)
    }

    return merged
  }

  /**
   * 估算字幕持续时间
   */
  private estimateDuration(text: string): number {
    // 中文字符约每秒3-4个，英文约每秒5-6个字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars

    const duration = chineseChars / 3.5 + otherChars / 6
    return Math.max(
      this.config.minDuration,
      Math.min(this.config.maxDuration, duration)
    )
  }

  /**
   * 格式化时间为SRT格式 (HH:MM:SS,mmm)
   */
  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  /**
   * 格式化单个SRT条目
   */
  private formatSRTEntry(entry: SRTEntry): string {
    return `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
  }

  /**
   * 后处理文本
   */
  private postProcessText(text: string): string {
    let processed = text

    if (this.config.postProcess.trimSpaces) {
      processed = processed
        .replace(/[ \t]+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n/g, ' ')
    }

    if (this.config.postProcess.normalizePunctuation) {
      // 统一标点符号
      processed = processed
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/[。，]/g, '.')
        .replace(/[；]/g, ';')
        .replace(/[：]/g, ':')
    }

    if (this.config.postProcess.removeNoise) {
      // 移除常见OCR噪音
      processed = processed
        .replace(/[oO0]{4,}/g, '') // 移除连续的 o/O/0
        .replace(/[iIl1]{6,}/g, '') // 移除连续的 i/I/l/1
        .replace(/\.{3,}/g, '...') // 规范化省略号
        .replace(/^\.{3,}|(?<!\.)\.{3,}(?!\.)/g, '') // 移除孤立的省略号
    }

    return processed.trim()
  }
}

/**
 * 从VAD检测结果生成采样时间点
 */
export function generateSamplePoints(
  speechRegions: { start: number; end: number }[],
  sampleCount: number = 3,
  bufferBefore: number = 0.5,
  bufferAfter: number = 0.5
): number[] {
  const points: number[] = []

  for (const region of speechRegions) {
    const duration = region.end - region.start
    const adjustedStart = Math.max(0, region.start - bufferBefore)
    const adjustedEnd = region.end + bufferAfter

    // 在每个语音段内均匀采样
    for (let i = 0; i < sampleCount; i++) {
      const t = adjustedStart + (adjustedEnd - adjustedStart) * i / (sampleCount - 1)
      points.push(t)
    }
  }

  return points
}

/**
 * 解析SRT文件内容
 */
export function parseSRTFile(content: string): SRTEntry[] {
  const entries: SRTEntry[] = []
  const blocks = content.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const index = parseInt(lines[0], 10)
    if (isNaN(index)) continue

    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timeMatch) continue

    const text = lines.slice(2).join('\n')

    entries.push({
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text
    })
  }

  return entries
}

/**
 * 合并重叠的SRT条目
 */
export function mergeOverlappingEntries(entries: SRTEntry[]): SRTEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const timeA = parseSRTTimeToSeconds(a.startTime)
    const timeB = parseSRTTimeToSeconds(b.startTime)
    return timeA - timeB
  })

  const merged: SRTEntry[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    const currentEnd = parseSRTTimeToSeconds(current.endTime)
    const nextStart = parseSRTTimeToSeconds(next.startTime)

    if (nextStart < currentEnd) {
      // 重叠，合并文本
      current.text = `${current.text} ${next.text}`
      current.endTime = maxTime(current.endTime, next.endTime)
    } else {
      merged.push(current)
      current = next
    }
  }

  if (current) {
    merged.push(current)
  }

  return merged
}

/**
 * 解析SRT时间字符串为秒数
 */
export function parseSRTTimeToSeconds(time: string): number {
  const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!match) return 0

  const [, h, m, s, ms] = match
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000
}

/**
 * 比较两个SRT时间，返回较大的时间
 */
function maxTime(time1: string, time2: string): string {
  const seconds1 = parseSRTTimeToSeconds(time1)
  const seconds2 = parseSRTTimeToSeconds(time2)
  return seconds1 >= seconds2 ? time1 : time2
}

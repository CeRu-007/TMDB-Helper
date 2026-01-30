/**
 * 音频处理模块
 * 使用 Web Audio API 进行音频分析和 VAD 检测
 */

import { logger } from '@/lib/utils/logger';

export interface AudioAnalysisResult {
  /** 采样时间点 (秒) */
  timestamp: number
  /** 平均音量 (0-1) */
  volume: number
  /** 是否检测到语音 */
  isSpeech: boolean
  /** 语音概率 (0-1) */
  speechProbability: number
}

export interface VADConfig {
  /** 语音检测阈值 (0-1)，默认 0.15（降低以提高灵敏度） */
  speechThreshold?: number
  /** 安静阈值 (0-1)，默认 0.05 */
  quietThreshold?: number
  /** 最小语音持续时间 (秒)，默认 0.1（降低以识别短字幕） */
  minSpeechDuration?: number
  /** 最大静音持续时间 (秒)，默认 1.5（增加以合并相近语音段） */
  maxSilenceDuration?: number
  /** 平滑窗口大小，默认 3 */
  smoothWindow?: number
}

export interface SpeechSegment {
  /** 开始时间 (秒) */
  start: number
  /** 结束时间 (秒) */
  end: number
  /** 平均置信度 */
  confidence: number
}

/**
 * 基于能量的 VAD 检测器
 * 使用 Web Audio API 分析音频能量来判断是否有语音
 */
export class EnergyVAD {
  private config: Required<VADConfig>
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private volumeHistory: number[] = []

  constructor(config: VADConfig = {}) {
    this.config = {
      speechThreshold: config.speechThreshold ?? 0.15,
      quietThreshold: config.quietThreshold ?? 0.05,
      minSpeechDuration: config.minSpeechDuration ?? 0.1,
      maxSilenceDuration: config.maxSilenceDuration ?? 1.5,
      smoothWindow: config.smoothWindow ?? 3
    }
  }

  /**
   * 初始化音频上下文
   */
  async init(): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8

    const bufferLength = this.analyser.frequencyBinCount
    this.dataArray = new Uint8Array(bufferLength)

    logger.info('[EnergyVAD] 音频上下文初始化完成')
  }

  /**
   * 从 AudioBuffer 分析音量
   */
  analyzeAudioBuffer(audioBuffer: AudioBuffer): AudioAnalysisResult[] {
    if (!this.audioContext) {
      throw new Error('请先调用 init()')
    }

    const channelData = audioBuffer.getChannelData(0) // 使用第一个声道
    const sampleRate = audioBuffer.sampleRate
    const duration = audioBuffer.duration
    const results: AudioAnalysisResult[] = []

    // 分帧分析，每帧约 100ms
    const frameSize = Math.floor(sampleRate * 0.1)
    let frameStart = 0

    while (frameStart < channelData.length) {
      const frameEnd = Math.min(frameStart + frameSize, channelData.length)
      const frameLength = frameEnd - frameStart

      // 计算帧能量
      let energy = 0
      for (let i = frameStart; i < frameEnd; i++) {
        energy += channelData[i] * channelData[i]
      }
      const rms = Math.sqrt(energy / frameLength)

      // 归一化到 0-1
      const volume = Math.min(1, rms * 2)

      // 计算语音概率
      const speechProbability = this.calculateSpeechProbability(volume)

      // 平滑处理
      this.volumeHistory.push(volume)
      if (this.volumeHistory.length > this.config.smoothWindow) {
        this.volumeHistory.shift()
      }
      const smoothedVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length
      const smoothedSpeechProbability = this.calculateSpeechProbability(smoothedVolume)

      const timestamp = frameStart / sampleRate

      results.push({
        timestamp,
        volume,
        isSpeech: smoothedSpeechProbability > this.config.speechThreshold,
        speechProbability: smoothedSpeechProbability
      })

      frameStart = frameEnd
    }

    return results
  }

  /**
   * 计算语音概率 (基于能量)
   */
  private calculateSpeechProbability(volume: number): number {
    if (volume < this.config.quietThreshold) {
      return 0
    }
    if (volume > this.config.speechThreshold) {
      return Math.min(1, (volume - this.config.quietThreshold) / (1 - this.config.quietThreshold))
    }
    // 在 quiet 和 speech threshold 之间使用线性插值
    return (volume - this.config.quietThreshold) / (this.config.speechThreshold - this.config.quietThreshold)
  }

  /**
   * 从分析结果中提取语音片段
   */
  extractSpeechSegments(results: AudioAnalysisResult[]): SpeechSegment[] {
    const segments: SpeechSegment[] = []
    let speechStart: number | null = null
    let silenceStart: number | null = null
    let segmentConfidence = 0
    let frameCount = 0

    for (const result of results) {
      if (result.isSpeech) {
        if (speechStart === null) {
          speechStart = result.timestamp
          silenceStart = null
          segmentConfidence = 0
          frameCount = 0
        }
        segmentConfidence += result.speechProbability
        frameCount++
      } else {
        if (speechStart !== null) {
          // 检测到静音，检查是否应该结束当前语音片段
          if (silenceStart === null) {
            silenceStart = result.timestamp
          }

          const silenceDuration = result.timestamp - silenceStart
          if (silenceDuration > this.config.maxSilenceDuration) {
            // 结束当前语音片段
            const segmentDuration = result.timestamp - silenceStart - this.config.maxSilenceDuration

            if (segmentDuration >= this.config.minSpeechDuration) {
              segments.push({
                start: speechStart,
                end: silenceStart - (this.config.maxSilenceDuration * 0.5),
                confidence: segmentConfidence / frameCount
              })
            }

            speechStart = null
            silenceStart = null
          }
        }
      }
    }

    // 处理最后一个片段
    if (speechStart !== null) {
      const lastResult = results[results.length - 1]
      const segmentDuration = lastResult.timestamp - speechStart

      if (segmentDuration >= this.config.minSpeechDuration) {
        segments.push({
          start: speechStart,
          end: lastResult.timestamp,
          confidence: segmentConfidence / frameCount
        })
      }
    }

    return segments
  }

  /**
   * 从 Float32Array 直接分析
   */
  analyzeFloat32Array(data: Float32Array, sampleRate: number): AudioAnalysisResult[] {
    const frameSize = Math.floor(sampleRate * 0.1)
    const results: AudioAnalysisResult[] = []

    for (let frameStart = 0; frameStart < data.length; frameStart += frameSize) {
      const frameEnd = Math.min(frameStart + frameSize, data.length)
      const frameLength = frameEnd - frameStart

      let energy = 0
      for (let i = frameStart; i < frameEnd; i++) {
        energy += data[i] * data[i]
      }
      const rms = Math.sqrt(energy / frameLength)
      const volume = Math.min(1, rms * 2)
      const speechProbability = this.calculateSpeechProbability(volume)

      // 平滑处理
      this.volumeHistory.push(volume)
      if (this.volumeHistory.length > this.config.smoothWindow) {
        this.volumeHistory.shift()
      }
      const smoothedVolume = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length
      const smoothedSpeechProbability = this.calculateSpeechProbability(smoothedVolume)

      results.push({
        timestamp: frameStart / sampleRate,
        volume,
        isSpeech: smoothedSpeechProbability > this.config.speechThreshold,
        speechProbability: smoothedSpeechProbability
      })
    }

    return results
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyser = null
    this.dataArray = null
    this.volumeHistory = []
  }
}

export default EnergyVAD

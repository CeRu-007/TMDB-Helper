/**
 * VAD (Voice Activity Detection) 模块
 * 使用 Silero VAD 模型检测音频中的语音片段
 */

import type { NonRealTimeVAD } from '@ricky0123/vad'
import { logger } from '@/lib/utils/logger';

// Silero VAD 配置参数
export interface VADConfig {
  // 语音概率阈值 (0-1)，高于此值认为是语音
  positiveSpeechThreshold?: number
  // 非语音概率阈值 (0-1)，低于此值认为是非语音
  negativeSpeechThreshold?: number
  //  redemption 帧数，用于平滑处理
  redemptionFrames?: number
  // 最小语音帧数
  minSpeechFrames?: number
  // 语音前导帧数
  preSpeechPadFrames?: number
  // 语音后导帧数
  postSpeechPadFrames?: number
  // 帧长 (毫秒)
  frameDurationMs?: number
  // 采样率
  sampleRate?: number
}

export interface SpeechSegment {
  start: number  // 开始时间 (秒)
  end: number    // 结束时间 (秒)
  confidence: number
}

export interface VADResult {
  segments: SpeechSegment[]
  audioDuration: number
}

/**
 * VAD 检测器类
 */
export class VADetector {
  private config: Required<VADConfig>
  private vad: NonRealTimeVAD | null = null
  private loaded: boolean = false

  constructor(config: VADConfig = {}) {
    this.config = {
      positiveSpeechThreshold: config.positiveSpeechThreshold ?? 0.5,
      negativeSpeechThreshold: config.negativeSpeechThreshold ?? 0.35,
      redemptionFrames: config.redemptionFrames ?? 8,
      minSpeechFrames: config.minSpeechFrames ?? 5,
      preSpeechPadFrames: config.preSpeechPadFrames ?? 3,
      postSpeechPadFrames: config.postSpeechPadFrames ?? 3,
      frameDurationMs: config.frameDurationMs ?? 100,
      sampleRate: config.sampleRate ?? 16000
    }
  }

  /**
   * 加载 VAD 模型
   */
  async load(): Promise<void> {
    if (this.loaded) return

    try {
      // 动态导入以避免 SSR 问题
      const vadModule = await import('@ricky0123/vad')
      
      this.vad = await vadModule.NonRealTimeVAD.new({
        positiveSpeechThreshold: this.config.positiveSpeechThreshold,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold,
        redemptionFrames: this.config.redemptionFrames,
        minSpeechFrames: this.config.minSpeechFrames,
        preSpeechPadFrames: this.config.preSpeechPadFrames,
        postSpeechPadFrames: this.config.postSpeechPadFrames,
        frameDurationMs: this.config.frameDurationMs,
      })

      this.loaded = true
      logger.debug('VAD', '模型加载完成')
    } catch (error) {
      logger.error('VAD', '模型加载失败', error)
      throw new Error('VAD 模型加载失败')
    }
  }

  /**
   * 检测音频中的语音片段
   * @param audioFloat32Array - 音频数据 (Float32Array，采样率 16000)
   * @returns 语音片段数组
   */
  async detect(audioFloat32Array: Float32Array): Promise<VADResult> {
    if (!this.loaded || !this.vad) {
      throw new Error('VAD 尚未加载，请先调用 load()')
    }

    const startTime = performance.now()

    try {
      // 运行 VAD 检测
      const speechChunks = await this.vad.run(audioFloat32Array)

      const segments: SpeechSegment[] = speechChunks.map((chunk, index) => {
        return {
          start: chunk.start / this.config.sampleRate,
          end: chunk.end / this.config.sampleRate,
          confidence: chunk.confidence ?? 1.0
        }
      })

      const audioDuration = audioFloat32Array.length / this.config.sampleRate

      const duration = (performance.now() - startTime) / 1000
      logger.info('VAD', '检测完成', {
        segmentCount: segments.length,
        duration: duration.toFixed(2) + 's'
      })

      return {
        segments,
        audioDuration
      }
    } catch (error) {
      logger.error('VAD', '检测失败', error)
      throw error
    }
  }

  /**
   * 从音频上下文中创建 AudioBuffer
   */
  static async createAudioBufferFromBlob(
    audioBlob: Blob,
    audioContext: AudioContext
  ): Promise<AudioBuffer> {
    const arrayBuffer = await audioBlob.arrayBuffer()
    return audioContext.decodeAudioData(arrayBuffer)
  }

  /**
   * 从 AudioBuffer 提取 Float32Array
   */
  static extractFloat32Array(audioBuffer: AudioBuffer): Float32Array {
    const channels: Float32Array[] = []
    
    // 如果有多声道，混合为单声道
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }
    
    // 混合为单声道
    const mono: Float32Array = new Float32Array(audioBuffer.length)
    for (let i = 0; i < audioBuffer.length; i++) {
      let sum = 0
      for (let c = 0; c < channels.length; c++) {
        sum += channels[c][i]
      }
      mono[i] = sum / channels.length
    }
    
    return mono
  }

  /**
   * 重采样到指定采样率
   */
  static resample(
    audio: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array {
    if (fromSampleRate === toSampleRate) return audio

    const ratio = fromSampleRate / toSampleRate
    const newLength = Math.round(audio.length / ratio)
    const result: Float32Array = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audio.length - 1)
      const t = srcIndex - srcIndexFloor
      
      // 线性插值
      result[i] = audio[srcIndexFloor] * (1 - t) + audio[srcIndexCeil] * t
    }

    return result
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.vad) {
      this.vad.destroy()
      this.vad = null
    }
    this.loaded = false
  }
}

export default VADetector
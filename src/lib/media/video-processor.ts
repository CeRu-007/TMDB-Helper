/**
 * 视频处理模块
 * 用于从视频中提取帧和音频，进行硬字幕提取
 */

import { EnergyVAD, type AudioAnalysisResult, type SpeechSegment } from './audio-vad'
import { SubtitleOCR, type OCRResult } from './subtitle-ocr'
import { logger } from '@/lib/utils/logger';

export interface VideoProcessConfig {
  /** VAD 语音阈值 (0-1)，默认 0.15 */
  vadThreshold?: number
  /** 最小语音持续时间 (秒)，默认 0.1 */
  minSpeechDuration?: number
  /** 最大静音持续时间 (秒)，默认 1.5 */
  maxSilenceDuration?: number
  /** 采样间隔 (秒) */
  sampleInterval?: number
  /** 是否启用 VAD */
  useVAD?: boolean
  /** OCR 模型 ID */
  ocrModelId?: string
  /** 字幕区域 (百分比) */
  subtitleRegions?: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
}

export interface ProcessResult {
  /** 字幕条目 */
  subtitles: Array<{
    id: string
    index: number
    startTime: string
    endTime: string
    text: string
    confidence: number
  }>
  /** 提取的帧 */
  frames: Array<{
    timestamp: number
    imageUrl: string
    recognizedText: string
    confidence: number
  }>
  /** SRT 内容 */
  srtContent: string
  /** 语音片段 */
  speechSegments: SpeechSegment[]
}

export interface ProcessProgress {
  /** 当前进度 (0-100) */
  progress: number
  /** 状态消息 */
  message: string
  /** 当前步骤 */
  step: 'init' | 'extracting_audio' | 'vad_detection' | 'sampling_frames' | 'ocr_recognition' | 'generating_subtitles' | 'complete' | 'error'
  /** 错误信息 */
  error?: string
  /** 单帧识别结果 (用于流式输出) */
  frameResult?: {
    timestamp: number
    text: string
    confidence: number
    index: number
    total: number
    /** 语音段时间范围（用于生成正确的时间戳） */
    segmentStart?: number
    segmentEnd?: number
  }
}

type ProgressCallback = (progress: ProcessProgress) => void

/**
 * 视频处理器类
 */
export class VideoProcessor {
  private config: VideoProcessConfig
  private vad: EnergyVAD
  private ocr: SubtitleOCR
  private abortController: AbortController | null = null

  constructor(config: VideoProcessConfig = {}) {
    this.config = {
      vadThreshold: config.vadThreshold ?? 0.15,
      minSpeechDuration: config.minSpeechDuration ?? 0.1,
      maxSilenceDuration: config.maxSilenceDuration ?? 1.5,
      sampleInterval: config.sampleInterval ?? 2.0,
      useVAD: config.useVAD ?? true,
      ocrModelId: config.ocrModelId ?? '',
      subtitleRegions: config.subtitleRegions ?? []
    }

    this.vad = new EnergyVAD({
      speechThreshold: this.config.vadThreshold,
      minSpeechDuration: this.config.minSpeechDuration,
      maxSilenceDuration: this.config.maxSilenceDuration
    })

    this.ocr = new SubtitleOCR({
      scenarioType: 'subtitle_ocr'
    })
  }

  /**
   * 处理视频
   */
  async process(
    videoElement: HTMLVideoElement,
    videoFile?: File | null,
    onProgress?: ProgressCallback
  ): Promise<ProcessResult> {
    this.abortController = new AbortController()

    try {
      // 步骤 1: 初始化
      onProgress?.({
        progress: 0,
        message: '初始化...',
        step: 'init'
      })

      await this.vad.init()

      // 步骤 2: 提取音频并进行 VAD 检测
      onProgress?.({
        progress: 5,
        message: '正在提取音频并进行语音检测...',
        step: 'extracting_audio'
      })

      const audioBuffer = await this.extractAudio(videoElement, videoFile)
      const audioResults = this.vad.analyzeAudioBuffer(audioBuffer)
      const speechSegments = this.vad.extractSpeechSegments(audioResults)

      logger.debug('VideoProcessor', '检测到语音片段', { count: speechSegments.length })

      // 步骤 3: 如果不使用 VAD 或没有检测到语音，进行均匀采样
      let sampleTimestamps: number[] = []
      // 记录每个采样点对应的语音段（用于流式输出时传递正确的时间范围）
      const sampleToSegmentMap: Map<number, SpeechSegment> = new Map()

      if (this.config.useVAD && speechSegments.length > 0) {
        onProgress?.({
          progress: 20,
          message: `检测到 ${speechSegments.length} 个语音片段，正在采样...`,
          step: 'vad_detection'
        })

        // 每个语音段只采样一帧（取中间位置），同一语音段字幕内容相同
        for (const segment of speechSegments) {
          // 取语音段中间位置作为采样点
          const midpoint = segment.start + (segment.end - segment.start) / 2
          sampleTimestamps.push(midpoint)
          sampleToSegmentMap.set(midpoint, segment)
        }
      } else {
        onProgress?.({
          progress: 20,
          message: '正在进行均匀采样...',
          step: 'sampling_frames'
        })

        // 均匀采样整个视频
        const duration = videoElement.duration
        for (let timestamp = 0; timestamp < duration; timestamp += this.config.sampleInterval) {
          sampleTimestamps.push(timestamp)
        }
      }

      // 步骤 4-5: 流式提取帧并批量 OCR 识别
      onProgress?.({
        progress: 40,
        message: `正在提取并识别 ${sampleTimestamps.length} 个视频帧...`,
        step: 'ocr_recognition'
      })

      const frames: Array<{
        timestamp: number
        imageUrl: string
        recognizedText: string
        confidence: number
      }> = []

      // 流式处理：每提取 50 帧就立即拼接识别
      const streamBatchSize = 50
      const extractedFrames: Array<{
        timestamp: number
        imageUrl: string
      }> = []

      for (let i = 0; i < sampleTimestamps.length; i++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('用户取消处理')
        }

        const timestamp = sampleTimestamps[i]

        // 提取当前帧
        try {
          const frameDataUrl = await this.extractFrame(videoElement, timestamp)

          // 如果有字幕区域，进行裁剪
          let processedImage = frameDataUrl
          if (this.config.subtitleRegions && this.config.subtitleRegions.length > 0) {
            processedImage = await this.cropRegions(frameDataUrl, this.config.subtitleRegions)
          }

          extractedFrames.push({
            timestamp,
            imageUrl: processedImage
          })

          // 每收集 15 帧或最后一帧，进行批量识别
          if (extractedFrames.length >= streamBatchSize || i === sampleTimestamps.length - 1) {
            // 拼接当前批次的图片
            const mergedImage = await this.mergeImagesVertically(extractedFrames.map(f => f.imageUrl))

            if (mergedImage) {
              // OCR 识别当前批次
              const ocrResults = await this.ocr.recognizeBatch({
                image: mergedImage,
                timestamps: extractedFrames.map(f => f.timestamp),
                segments: extractedFrames.map(f => sampleToSegmentMap.get(f.timestamp))
              })

              // 将识别结果分配给对应的帧
              for (let j = 0; j < extractedFrames.length; j++) {
                frames.push({
                  timestamp: extractedFrames[j].timestamp,
                  imageUrl: extractedFrames[j].imageUrl,
                  recognizedText: ocrResults[j]?.text || '',
                  confidence: ocrResults[j]?.confidence || 0
                })

                // 流式输出：立即通知识别结果
                if (ocrResults[j]?.text && !ocrResults[j].text.includes('[无法识别]') && ocrResults[j].text.trim().length > 0) {
                  const segment = sampleToSegmentMap.get(extractedFrames[j].timestamp)
                  onProgress?.({
                    progress: 40 + (frames.length / sampleTimestamps.length) * 45,
                    message: `帧 ${frames.length}/${sampleTimestamps.length}: ${ocrResults[j].text}`,
                    step: 'ocr_recognition',
                    frameResult: {
                      timestamp: extractedFrames[j].timestamp,
                      text: ocrResults[j].text,
                      confidence: ocrResults[j].confidence,
                      index: frames.length,
                      total: sampleTimestamps.length,
                      segmentStart: segment?.start,
                      segmentEnd: segment?.end
                    }
                  })
                }
              }
            } else {
              // 拼接失败，逐个识别当前批次
              logger.warn('VideoProcessor', '图片拼接失败，使用逐个识别')
              for (let j = 0; j < extractedFrames.length; j++) {
                if (extractedFrames[j].imageUrl) {
                  try {
                    const ocrResult = await this.ocr.recognize({
                      image: extractedFrames[j].imageUrl,
                      timestamp: extractedFrames[j].timestamp
                    })
                    frames.push({
                      timestamp: extractedFrames[j].timestamp,
                      imageUrl: extractedFrames[j].imageUrl,
                      recognizedText: ocrResult.text,
                      confidence: ocrResult.confidence
                    })
                  } catch (error) {
                    frames.push({
                      timestamp: extractedFrames[j].timestamp,
                      imageUrl: extractedFrames[j].imageUrl,
                      recognizedText: '',
                      confidence: 0
                    })
                  }
                }
              }
            }

            // 清空当前批次
            extractedFrames.length = 0
          }
        } catch (error) {
          logger.error('VideoProcessor', `帧 ${timestamp}s 提取失败`, error)
          // 即使失败也添加空帧，保持时间戳对应
          extractedFrames.push({
            timestamp,
            imageUrl: ''
          })
        }
      }

      // 步骤 5: 生成字幕
      onProgress?.({
        progress: 85,
        message: '正在生成字幕...',
        step: 'generating_subtitles'
      })

      const subtitles = this.generateSubtitles(frames, speechSegments)

      // 步骤 6: 完成
      onProgress?.({
        progress: 100,
        message: '处理完成',
        step: 'complete'
      })

      const srtContent = this.generateSRT(subtitles)

      return {
        subtitles,
        frames,
        srtContent,
        speechSegments
      }
    } catch (error) {
      onProgress?.({
        progress: 0,
        message: error instanceof Error ? error.message : '处理失败',
        step: 'error',
        error: error instanceof Error ? error.message : '未知错误'
      })
      throw error
    } finally {
      this.destroy()
    }
  }

  /**
   * 从视频中提取音频
   */
  private async extractAudio(videoElement: HTMLVideoElement, videoFile?: File | null): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    try {
      // 如果有原始文件，优先使用 FileReader 读取
      if (videoFile) {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = () => reject(new Error('文件读取失败'))
          reader.readAsArrayBuffer(videoFile)
        })
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        return audioBuffer
      }
      
      // 如果是 Blob URL，尝试使用 fetch
      const videoSrc = videoElement.src
      if (videoSrc.startsWith('blob:')) {
        try {
          const response = await fetch(videoSrc)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            return audioBuffer
          }
        } catch (e) {
          console.warn('fetch blob URL failed:', e)
        }
      }
      
      // 回退：使用 captureStream 获取音频
      if (videoElement.captureStream) {
        try {
          const stream = videoElement.captureStream()
          const audioTrack = stream.getAudioTracks()[0]
          
          if (audioTrack) {
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 2048
            
            const pcmData = new Float32Array(analyser.fftSize)
            source.connect(analyser)
            
            // 播放视频一小段时间来捕获音频数据
            const wasPlaying = !videoElement.paused
            if (!wasPlaying) {
              videoElement.currentTime = 0
              await new Promise(resolve => {
                videoElement.onseeked = resolve
                setTimeout(resolve, 100)
              })
              videoElement.play()
            }
            
            analyser.getFloatTimeDomainData(pcmData)
            
            if (!wasPlaying) {
              videoElement.pause()
            }
            
            // 创建 AudioBuffer
            const audioBuffer = audioContext.createBuffer(1, pcmData.length, audioContext.sampleRate)
            audioBuffer.getChannelData(0).set(pcmData)
            return audioBuffer
          }
        } catch (e) {
          console.warn('captureStream failed:', e)
        }
      }
      
      // 最后回退：创建静音 AudioBuffer
      const duration = videoElement.duration || 60
      const audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate)
      return audioBuffer
      
    } finally {
      await audioContext.close()
    }
  }

  /**
   * 提取视频帧
   */
  private extractFrame(videoElement: HTMLVideoElement, timestamp: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = videoElement.cloneNode(true) as HTMLVideoElement
      video.muted = true

      video.onloadedmetadata = () => {
        video.currentTime = timestamp
      }

      video.onseeked = () => {
        // 使用 Canvas 绘制帧
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        ctx.drawImage(video, 0, 0)

        // 转换为 Data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(dataUrl)

        // 清理
        video.remove()
      }

      video.onerror = () => {
        reject(new Error('视频帧提取失败'))
        video.remove()
      }

      // 开始加载
      video.src = videoElement.src
      video.load()
    })
  }

  /**
   * 裁剪字幕区域
   */
  private async cropRegions(
    imageDataUrl: string,
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        
        // 找到所有区域的边界
        let minX = 100, minY = 100, maxX = 0, maxY = 0
        for (const region of regions) {
          minX = Math.min(minX, region.x)
          minY = Math.min(minY, region.y)
          maxX = Math.max(maxX, region.x + region.width)
          maxY = Math.max(maxY, region.y + region.height)
        }

        // 裁剪
        canvas.width = img.width * (maxX - minX) / 100
        canvas.height = img.height * (maxY - minY) / 100

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(imageDataUrl) // 返回原图
          return
        }

        ctx.drawImage(
          img,
          img.width * minX / 100,
          img.height * minY / 100,
          canvas.width,
          canvas.height,
          0,
          0,
          canvas.width,
          canvas.height
        )

        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.onerror = () => {
        resolve(imageDataUrl) // 返回原图
      }

      img.src = imageDataUrl
    })
  }

  /**
   * 将多张图片纵向拼接成一张图片
   */
  private async mergeImagesVertically(imageUrls: string[]): Promise<string | null> {
    if (imageUrls.length === 0) return null
    if (imageUrls.length === 1) return imageUrls[0]

    return new Promise((resolve) => {
      const images: HTMLImageElement[] = []
      let loadedCount = 0

      // 加载所有图片
      imageUrls.forEach((url, index) => {
        if (!url) {
          loadedCount++
          if (loadedCount === imageUrls.length) {
            this.doMergeImages(images, resolve)
          }
          return
        }

        const img = new Image()
        img.onload = () => {
          images[index] = img
          loadedCount++
          if (loadedCount === imageUrls.length) {
            this.doMergeImages(images, resolve)
          }
        }
        img.onerror = () => {
          loadedCount++
          if (loadedCount === imageUrls.length) {
            this.doMergeImages(images, resolve)
          }
        }
        img.src = url
      })
    })
  }

  /**
   * 执行图片拼接
   */
  private doMergeImages(images: HTMLImageElement[], resolve: (value: string | null) => void) {
    const validImages = images.filter(img => img !== undefined)
    if (validImages.length === 0) {
      resolve(null)
      return
    }

    // 计算拼接后的尺寸
    const maxWidth = Math.max(...validImages.map(img => img.width))
    const totalHeight = validImages.reduce((sum, img) => sum + img.height, 0)

    // 限制最大宽度，防止图片过大
    const maxAllowedWidth = 800
    const scaleRatio = maxWidth > maxAllowedWidth ? maxAllowedWidth / maxWidth : 1

    const scaledWidth = maxWidth * scaleRatio
    const scaledHeight = totalHeight * scaleRatio

    // 创建画布
    const canvas = document.createElement('canvas')
    canvas.width = scaledWidth
    canvas.height = scaledHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      resolve(null)
      return
    }

    // 绘制白色背景
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 纵向拼接图片
    let yOffset = 0
    for (const img of validImages) {
      // 缩放并居中绘制
      const scaledImgWidth = img.width * scaleRatio
      const scaledImgHeight = img.height * scaleRatio
      const xOffset = (scaledWidth - scaledImgWidth) / 2

      ctx.drawImage(img, xOffset, yOffset, scaledImgWidth, scaledImgHeight)
      yOffset += scaledImgHeight

      // 添加分隔线（除了最后一张）
      if (img !== validImages[validImages.length - 1]) {
        ctx.strokeStyle = '#CCCCCC'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, yOffset)
        ctx.lineTo(scaledWidth, yOffset)
        ctx.stroke()
        yOffset += 5 // 分隔线间距
      }
    }

    // 使用高质量输出，确保文字清晰度
    resolve(canvas.toDataURL('image/jpeg', 0.9))
  }

  /**
   * 生成字幕条目
   * 直接使用每个采样帧的识别结果，不做后处理合并
   */
  private generateSubtitles(
    frames: Array<{ timestamp: number; recognizedText: string; confidence: number }>,
    speechSegments: SpeechSegment[]
  ): Array<{
    id: string
    index: number
    startTime: string
    endTime: string
    text: string
    confidence: number
  }> {
    const subtitles: Array<{
      id: string
      index: number
      startTime: string
      endTime: string
      text: string
      confidence: number
    }> = []

    // 过滤有效识别结果
    const validFrames = frames.filter(f =>
      f.recognizedText &&
      !f.recognizedText.includes('[无法识别]') &&
      f.recognizedText.trim().length > 0
    )

    // 直接使用每个采样帧的识别结果
    let index = 1
    for (const frame of validFrames) {
      // 找到该帧对应的语音段，使用语音段的时间范围
      const segment = speechSegments.find(s =>
        frame.timestamp >= s.start && frame.timestamp <= s.end
      )

      const startTime = segment?.start ?? frame.timestamp
      const endTime = segment?.end ?? frame.timestamp + 2

      subtitles.push({
        id: `subtitle-${index}`,
        index,
        startTime: this.formatTime(startTime),
        endTime: this.formatTime(endTime),
        text: frame.recognizedText,
        confidence: frame.confidence
      })
      index++
    }

    return subtitles
  }

  /**
   * 生成 SRT 内容
   */
  private generateSRT(subtitles: Array<{
    index: number
    startTime: string
    endTime: string
    text: string
  }>): string {
    return subtitles.map(sub => 
      `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}`
    ).join('\n\n')
  }

  /**
   * 格式化时间为 SRT 格式
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  /**
   * 取消处理
   */
  cancel(): void {
    this.abortController?.abort()
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.vad.destroy()
    this.ocr = null as any
  }
}

export default VideoProcessor

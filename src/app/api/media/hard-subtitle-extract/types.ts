/**
 * 硬字幕提取任务类型定义
 */

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface BoundingBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface ExtractConfig {
  vadThreshold: number
  minSpeechDuration: number
  silenceThreshold: number
  sampleInterval: number
  useVAD: boolean
  ocrModelId: string
  subtitleRegions: BoundingBox[]
}

export interface SubtitleEntry {
  id: string
  index: number
  startTime: string
  endTime: string
  text: string
  confidence: number
}

export interface ExtractedFrame {
  timestamp: number
  imageUrl: string
  recognizedText: string
  confidence: number
}

export interface ExtractResult {
  subtitles: SubtitleEntry[]
  frames: ExtractedFrame[]
  srtContent: string
}

export interface HardSubtitleExtractTask {
  id: string
  status: TaskStatus
  progress: number
  statusMessage?: string
  createdAt: number
  updatedAt: number
  config: ExtractConfig
  videoUrl?: string
  videoFileName?: string
  result?: ExtractResult
  error?: string
}

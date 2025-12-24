import { useState, useCallback } from 'react'
import { useToast } from '@/components/common/use-toast'
import { VideoAnalyzer, VideoAnalysisResult } from '@/lib/media/video-analyzer'
import { SubtitleFile } from '../types'
import { useContentGeneration } from './useContentGeneration'

export function useVideoAnalysis(
  config: { speechRecognitionModel?: string },
  siliconFlowApiKey: string,
  generateEpisodesForFile?: (file: SubtitleFile) => void
) {
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false)
  const [videoAnalysisProgress, setVideoAnalysisProgress] = useState(0)
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<VideoAnalysisResult | null>(null)
  const [showAnalysisResult, setShowAnalysisResult] = useState(false)
  const [movieTitle, setMovieTitle] = useState('')
  const { toast } = useToast()

  // 处理视频分析
  const handleVideoAnalysis = useCallback(async (videoUrl: string) => {
    if (!siliconFlowApiKey) {
      toast({
        title: "需要配置API密钥",
        description: "视频分析功能需要硅基流动API密钥，请先在设置中配置",
        variant: "destructive"
      })
      return
    }

    setIsVideoAnalyzing(true)
    setVideoAnalysisProgress(0)

    try {
      // 创建视频分析器，传递语音识别模型配置
      const analyzer = new VideoAnalyzer(siliconFlowApiKey, {
        speechRecognitionModel: config.speechRecognitionModel || 'FunAudioLLM/SenseVoiceSmall'
      })

      // 开始分析
      const result = await analyzer.analyzeVideo(videoUrl)

      // 保存分析结果并显示
      setVideoAnalysisResult(result)
      setShowAnalysisResult(true)

      toast({
        title: "视频分析完成",
        description: "AI已成功分析视频内容，点击查看详细结果",
      })

    } catch (error) {
      console.error('视频分析失败:', error)
      toast({
        title: "视频分析失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive"
      })
    } finally {
      setIsVideoAnalyzing(false)
      setVideoAnalysisProgress(0)
    }
  }, [siliconFlowApiKey, config.speechRecognitionModel, toast])

  // 重新生成结构化内容（只生成SRT格式）
  const regenerateStructuredContent = useCallback((updatedResult: VideoAnalysisResult): VideoAnalysisResult => {
    const audioSegments = updatedResult.audioAnalysis.segments;

    // 生成SRT格式
    const formatSRTTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    const srtLines = [];

    // 音频转录内容
    audioSegments.forEach((segment, index) => {
      const srtIndex = index + 1; // 从1开始
      const startTime = formatSRTTime(segment.start);
      const endTime = formatSRTTime(segment.end);

      srtLines.push(
        srtIndex.toString(),
        `${startTime} --> ${endTime}`,
        segment.text,
        ''
      );
    });

    const srtContent = srtLines.join('\n');

    return {
      ...updatedResult,
      structuredContent: {
        srt: srtContent,
        markdown: '', // 不再生成
        text: ''      // 不再生成
      }
    };
  }, [])

  // 为视频分析结果生成简介
  const handleGenerateEpisodeFromVideo = useCallback((
    videoAnalysisResult: VideoAnalysisResult,
    setSubtitleFiles: (files: SubtitleFile[]) => void,
    setSelectedFile: (file: SubtitleFile | null) => void,
    setIsGenerating: (generating: boolean) => void,
    setGenerationProgress: (progress: number) => void,
    setGenerationResults: (results: Record<string, any[]>) => void
  ) => {
    if (videoAnalysisResult) {
      // 将视频分析结果转换为字幕文件格式
      const episodeContent = VideoAnalyzer.convertToEpisodeContent(videoAnalysisResult)

      // 创建虚拟字幕文件
      const videoFile: SubtitleFile = {
        id: `video-${Date.now()}`,
        name: videoAnalysisResult.videoInfo.title || '视频分析结果',
        size: episodeContent.length,
        uploadTime: new Date(),
        episodes: [{
          episodeNumber: 1,
          content: episodeContent,
          wordCount: episodeContent.length,
          title: videoAnalysisResult.videoInfo.title
        }]
      }

      // 添加到文件列表
      setSubtitleFiles(prev => [...prev, videoFile])
      setSelectedFile(videoFile)
      setShowAnalysisResult(false)

      // 自动开始生成简介
      setTimeout(() => {
        // 直接生成简介，不需要检查API密钥（视频分析已经验证过了）
        if (videoFile.episodes.length > 0) {
          setIsGenerating(true)
          setGenerationProgress(0)
          setGenerationResults(prev => ({ ...prev, [videoFile.id]: [] }))

          // 开始生成简介
          if (generateEpisodesForFile) {
            generateEpisodesForFile(videoFile)
          }
        }
      }, 1000)
    }
  }, [generateEpisodesForFile])

  return {
    isVideoAnalyzing,
    videoAnalysisProgress,
    videoAnalysisResult,
    showAnalysisResult,
    movieTitle,
    setVideoAnalysisResult,
    setShowAnalysisResult,
    setMovieTitle,
    handleVideoAnalysis,
    regenerateStructuredContent,
    handleGenerateEpisodeFromVideo
  }
}
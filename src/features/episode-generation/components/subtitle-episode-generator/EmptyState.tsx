import React, { useState } from "react"
import {
  Upload,
  Film,
  Wand2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText
} from "lucide-react"
import { logger } from '@/lib/utils/logger'
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/lib/utils"
import { VideoAnalyzer } from "@/lib/media/video-analyzer"
import { VideoAnalysisStep, createDefaultAnalysisSteps, updateStepStatus } from "@/features/episode-generation/components/video-analysis-feedback"
import { VideoAnalysisFeedback } from "@/features/episode-generation/components/video-analysis-feedback"
import { EmptyStateProps } from './types'
import { DELAY_500MS, DELAY_1S } from "@/lib/constants/constants"

export function EmptyState({ onUpload, onVideoAnalysis }: EmptyStateProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'video'>('upload')
  const [analysisSteps, setAnalysisSteps] = useState<VideoAnalysisStep[]>([])
  const [analysisError, setAnalysisError] = useState<string>('')

  const handleVideoAnalysis = async () => {
    if (!videoUrl.trim()) {
      setAnalysisError('请输入视频URL')
      return
    }

    if (!VideoAnalyzer.validateVideoUrl(videoUrl)) {
      setAnalysisError('不支持的视频URL格式，请使用YouTube、Bilibili等支持的平台')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysisSteps(createDefaultAnalysisSteps())

    try {
      // 模拟分析步骤进度
      const steps = createDefaultAnalysisSteps()

      // 开始下载
      setAnalysisSteps(updateStepStatus(steps, 'download', 'running', '正在下载视频...'))
      await new Promise(resolve => setTimeout(resolve, DELAY_1S))

      // 下载完成，开始提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'download', 'completed', '音频提取完成'),
        'extract', 'running', '正在进行语音识别...'
      ))
      await new Promise(resolve => setTimeout(resolve, DELAY_1S))

      // 提取完成，开始字幕提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'extract', 'completed', '内容提取完成'),
        'subtitle', 'running', '正在检测和提取字幕内容...'
      ))
      await new Promise(resolve => setTimeout(resolve, DELAY_1S))

      // 字幕提取完成，开始AI分析
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'subtitle', 'completed', '字幕提取完成'),
        'analyze', 'running', '正在使用AI分析视频内容...'
      ))

      // 调用实际的视频分析
      await onVideoAnalysis?.(videoUrl.trim())

      // 分析完成，开始生成简介
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'analyze', 'completed', 'AI分析完成'),
        'generate', 'running', '正在生成分集简介...'
      ))
      await new Promise(resolve => setTimeout(resolve, DELAY_500MS))

      // 全部完成
      setAnalysisSteps(prev => updateStepStatus(prev, 'generate', 'completed', '简介生成完成'))

    } catch (error) {
      logger.error('音频转写失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setAnalysisError(`音频转写失败: ${errorMessage}`)

      // 标记当前步骤为失败
      setAnalysisSteps(prev => {
        const runningStep = prev.find(step => step.status === 'running')
        if (runningStep) {
          return updateStepStatus(prev, runningStep.id, 'failed', errorMessage)
        }
        return prev
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRetryAnalysis = () => {
    setAnalysisError('')
    setAnalysisSteps([])
    handleVideoAnalysis()
  }

  const handleCancelAnalysis = () => {
    setIsAnalyzing(false)
    setAnalysisSteps([])
    setAnalysisError('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* 警告提示 */}
      <div className="p-4 pb-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">⚠️ 重要提醒</p>
              <p className="leading-relaxed">
                AI生成的分集简介仅作<strong>辅助作用</strong>，请务必观看对应视频内容审核修改后再使用。
                <strong className="text-amber-900 dark:text-amber-100">禁止直接上传至TMDB</strong>等数据库平台。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xl mx-auto px-5">
          {/* 简洁的图标 */}
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full inline-flex items-center justify-center">
              <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            分集简介生成
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            上传字幕文件或输入视频链接，生成分集标题和剧情简介
          </p>

          {/* 选项卡切换 */}
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'upload'
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  上传字幕
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    activeTab === 'video'
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Film className="h-4 w-4 inline mr-2" />
                  音频转写
                </button>
              </div>
            </div>
          </div>

          {/* 选项卡内容 */}
          {activeTab === 'upload' && (
            <>
              {/* 字幕文件上传说明 */}
              <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Upload className="h-4 w-4 mr-2 text-blue-500" />
                  字幕文件上传
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-medium">1.</span>
                    <span>配置硅基流动API密钥</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-medium">2.</span>
                    <span>上传SRT或VTT格式的字幕文件</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-medium">3.</span>
                    <span>选择模型和生成风格</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500 font-medium">4.</span>
                    <span>批量生成简介内容</span>
                  </div>
                </div>
              </div>

              {/* 主要操作按钮 */}
              <div className="flex justify-center">
                <Button
                  onClick={onUpload}
                  className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  上传字幕文件
                </Button>
              </div>

              {/* 支持的文件格式和拖拽提示 */}
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  支持格式：SRT、VTT、ASS、SSA
                </div>
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Upload className="h-3 w-3" />
                    <span>点击上传</span>
                  </div>
                  <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 border-2 border-dashed border-gray-400 rounded"></div>
                    <span>拖拽上传</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'video' && (
            <>
              {/* 音频转写说明 */}
              <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Film className="h-4 w-4 mr-2 text-purple-500" />
                  音频转写
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">1.</span>
                    <span>输入视频链接</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">2.</span>
                    <span>提取音频进行语音识别</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">3.</span>
                    <span>基于内容生成简介</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">4.</span>
                    <span>建议视频时长30分钟以内</span>
                  </div>
                </div>
              </div>

              {/* 视频URL输入 */}
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    视频链接
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="请输入视频URL..."
                        className={cn(
                          "w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors",
                          videoUrl.trim() && VideoAnalyzer.validateVideoUrl(videoUrl)
                            ? "border-green-300 dark:border-green-600 focus:ring-green-500"
                            : videoUrl.trim()
                              ? "border-red-300 dark:border-red-600 focus:ring-red-500"
                              : "border-gray-300 dark:border-gray-600 focus:ring-purple-500"
                        )}
                        disabled={isAnalyzing}
                      />
                      {videoUrl.trim() && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {VideoAnalyzer.validateVideoUrl(videoUrl) ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleVideoAnalysis}
                      disabled={isAnalyzing || !videoUrl.trim() || !VideoAnalyzer.validateVideoUrl(videoUrl)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>分析中...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          <span>开始分析</span>
                        </>
                      )}
                    </button>
                  </div>

                  {videoUrl.trim() && !VideoAnalyzer.validateVideoUrl(videoUrl) && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <XCircle className="h-3 w-3" />
                      <span>不支持的URL格式</span>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <p className="mb-2">支持的视频平台：</p>
                    <div className="flex flex-wrap gap-2">
                      {VideoAnalyzer.getSupportedPlatforms().map((platform, index) => (
                        <span key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                          {platform.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 音频转写反馈 */}
              <VideoAnalysisFeedback
                isAnalyzing={isAnalyzing}
                steps={analysisSteps}
                error={analysisError}
                onRetry={handleRetryAnalysis}
                onCancel={handleCancelAnalysis}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
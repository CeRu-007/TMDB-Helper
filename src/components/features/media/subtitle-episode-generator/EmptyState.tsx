import React, { useState } from "react"
import {
  Upload,
  Film,
  Wand2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { cn } from "@/lib/utils"
import { VideoAnalyzer } from "@/lib/media/video-analyzer"
import { VideoAnalysisStep, createDefaultAnalysisSteps, updateStepStatus } from "@/components/features/media/video-analysis-feedback"
import { VideoAnalysisFeedback } from "@/components/features/media/video-analysis-feedback"
import { EmptyStateProps } from './types'

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
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 下载完成，开始提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'download', 'completed', '音频提取完成'),
        'extract', 'running', '正在进行语音识别...'
      ))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 提取完成，开始字幕提取
      setAnalysisSteps(prev => updateStepStatus(
        updateStepStatus(prev, 'extract', 'completed', '内容提取完成'),
        'subtitle', 'running', '正在检测和提取字幕内容...'
      ))
      await new Promise(resolve => setTimeout(resolve, 1000))

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
      await new Promise(resolve => setTimeout(resolve, 500))

      // 全部完成
      setAnalysisSteps(prev => updateStepStatus(prev, 'generate', 'completed', '简介生成完成'))

    } catch (error) {
      console.error('视频分析失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setAnalysisError(`视频分析失败: ${errorMessage}`)

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
        <div className="text-center max-w-3xl mx-auto px-4">
          <div className="relative mb-8">
            {/* 外层光晕效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-500 blur-2xl opacity-20 rounded-full scale-150"></div>

            {/* 中层装饰圆环 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full scale-110 opacity-60"></div>

            {/* 主图标容器 */}
            <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 rounded-full text-white shadow-2xl">
              {/* 内部装饰 */}
              <div className="absolute inset-2 bg-white/10 rounded-full"></div>
              <div className="absolute inset-4 bg-white/5 rounded-full"></div>

              {/* 主图标 - 使用更具创意的组合 */}
              <div className="relative flex items-center justify-center">
                <Sparkles className="h-8 w-8 absolute -top-1 -left-1 opacity-80" />
                <Film className="h-12 w-12 relative z-10" />
                <Wand2 className="h-6 w-6 absolute -bottom-1 -right-1 opacity-90" />
              </div>
            </div>

            {/* 浮动装饰元素 */}
            <div className="absolute -top-4 -right-4 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-6 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-8 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping delay-700"></div>
          </div>

        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          开始您的AI创作之旅
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg leading-relaxed">
          上传字幕文件或输入视频链接，让AI为您生成精彩的分集标题和剧情简介
        </p>

        {/* 选项卡切换 */}
        <div className="mb-6">
          <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === 'upload'
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                上传字幕文件
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === 'video'
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <Film className="h-4 w-4 inline mr-2" />
                AI视频分析
              </button>
            </div>
          </div>
        </div>

        {/* 选项卡内容 */}
        {activeTab === 'upload' && (
          <>
            {/* 字幕文件上传说明 */}
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Upload className="h-4 w-4 mr-2 text-blue-500" />
                字幕文件上传
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-medium">1.</span>
                  <span>点击"配置API"前往全局设置配置硅基流动API密钥</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-medium">2.</span>
                  <span>上传SRT或VTT格式的字幕文件</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-medium">3.</span>
                  <span>选择AI模型和生成风格</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-medium">4.</span>
                  <span>点击"批量生成简介"获得AI创作的内容</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'video' && (
          <>
            {/* 视频分析说明 */}
            <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <Film className="h-4 w-4 mr-2 text-purple-500" />
                AI视频分析
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">1.</span>
                  <span>输入YouTube、Bilibili等平台的视频链接</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">2.</span>
                  <span>AI将自动提取音频并进行语音识别分析</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">3.</span>
                  <span>基于音频内容和关键信息生成精彩简介</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-500 font-medium">4.</span>
                  <span>支持视频时长：建议30分钟以内</span>
                </div>
              </div>
            </div>

            {/* 视频URL输入 */}
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  视频链接
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="请输入视频URL，支持YouTube、Bilibili、Emby等平台..."
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
                    {/* URL验证状态指示器 */}
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
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
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

                {/* URL格式提示 */}
                {videoUrl.trim() && !VideoAnalyzer.validateVideoUrl(videoUrl) && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>不支持的URL格式，请检查链接是否正确</span>
                  </div>
                )}

                {/* 支持的平台提示 */}
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p className="mb-1">支持的视频平台：</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {VideoAnalyzer.getSupportedPlatforms().map((platform, index) => (
                      <span key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {platform.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    <p>💡 支持媒体服务器直链（需包含API密钥参数）</p>
                    <p>📝 示例：http://server:8096/emby/videos/123/stream.mkv?api_key=xxx</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 视频分析反馈 */}
            <VideoAnalysisFeedback
              isAnalyzing={isAnalyzing}
              steps={analysisSteps}
              error={analysisError}
              onRetry={handleRetryAnalysis}
              onCancel={handleCancelAnalysis}
            />
          </>
        )}

        {/* 主要操作按钮 */}
        {activeTab === 'upload' && (
          <div className="flex justify-center">
            <button
              onClick={onUpload}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-1 shadow-2xl transition-all duration-300 hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
            >
              {/* 内层按钮 */}
              <div className="relative rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-8 py-4 text-white transition-all duration-300 group-hover:from-blue-400 group-hover:via-indigo-400 group-hover:to-purple-500">
                {/* 光泽效果 */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                {/* 内容 */}
                <div className="relative flex items-center space-x-3">
                  {/* 图标容器 */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-sm rounded-full"></div>
                    <div className="relative bg-white/10 p-2 rounded-full backdrop-blur-sm">
                      <Upload className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  </div>

                  {/* 文字 */}
                  <span className="text-lg font-medium tracking-wide">
                    点击上传或拖拽文件到此处
                  </span>
                </div>

                {/* 底部装饰线 */}
                <div className="absolute bottom-0 left-1/2 h-px w-0 bg-white/40 transition-all duration-500 group-hover:w-3/4 group-hover:left-1/8"></div>
              </div>

              {/* 外层光晕 */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-30"></div>
            </button>
          </div>
        )}

        {/* 支持的文件格式和拖拽提示 */}
        {activeTab === 'upload' && (
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              支持格式：SRT、VTT、ASS、SSA
            </div>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center space-x-1">
                <Upload className="h-3 w-3" />
                <span>点击上传</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border-2 border-dashed border-gray-400 rounded"></div>
                <span>拖拽上传</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              AI将提取音频内容并进行智能分析，自动生成分集简介
            </div>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center space-x-1">
                <Film className="h-3 w-3" />
                <span>音频分析</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-1">
                <Wand2 className="h-3 w-3" />
                <span>AI生成</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
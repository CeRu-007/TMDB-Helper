"use client"

import React, { useState, useRef, useEffect } from "react"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Upload, Sparkles, AlertCircle } from "lucide-react"
import { useScenarioModels } from "@/lib/hooks/useScenarioModels"
import { useToast } from "@/shared/components/ui/use-toast"
import { logger } from '@/lib/utils/logger'

// 导入类型和常量
import { ExportConfig } from './types'

// 导入hooks
import {
  useConfigManagement,
  useFileManagement,
  useContentGeneration,
  useVideoAnalysis
} from './hooks'

// 导入子组件
import {
  FileList,
  WorkArea,
  EmptyState,
  GenerationSettingsDialog,
  ExportConfigDialog,
  VideoAnalysisResultDialog
} from './index'

export function SubtitleEpisodeGenerator({
  onOpenGlobalSettings
}: {
  onOpenGlobalSettings?: (section: string) => void
} = {}) {
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast hook
  const { toast } = useToast()

  // 导出配置状态
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeTitle: true,
    includeOverview: true,
    includeRuntime: true
  })

  // 对话框状态
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [shouldReopenSettingsDialog, setShouldReopenSettingsDialog] = useState(false)

  // 使用配置管理hook
  const {
    config,
    setConfig,
    configInitialized,
    apiProvider,
    setApiProvider,
    siliconFlowApiKey,
    setSiliconFlowApiKey,
    modelScopeApiKey,
    setModelScopeApiKey,
    loadGlobalSettings
  } = useConfigManagement()

  // 使用文件管理hook
  const {
    subtitleFiles,
    selectedFile,
    isDragOver,
    dragCounter,
    setSubtitleFiles,
    setSelectedFile,
    processFiles,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleDeleteFile,
    handleSelectFile
  } = useFileManagement()

  // 使用内容生成hook
  const {
    generationResults,
    isGenerating,
    generationProgress,
    showInsufficientBalanceDialog,
    setShowInsufficientBalanceDialog,
    setGenerationResults,
    handleBatchGenerate,
    handleBatchGenerateAll,
    handleEnhanceContent,
    handleUpdateResult,
    handleMoveToTop,
    handleBatchExportToTMDB
  } = useContentGeneration(config, subtitleFiles, selectedFile)

  // 使用视频分析hook
  const {
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
  } = useVideoAnalysis(
    { speechRecognitionModel: config.speechRecognitionModel },
    siliconFlowApiKey
  )

  // 使用场景模型配置
  const scenarioModels = useScenarioModels('episode_generation')

  // 处理全局设置对话框关闭事件
  useEffect(() => {
    const handleGlobalSettingsClose = (event: unknown) => {
      if (shouldReopenSettingsDialog) {
        setShouldReopenSettingsDialog(false)
        // 延迟一点时间确保全局设置对话框完全关闭
        setTimeout(() => {
          setShowSettingsDialog(true)
        }, 100)
      }
    }

    window.addEventListener('global-settings-closed', handleGlobalSettingsClose)

    return () => {
      window.removeEventListener('global-settings-closed', handleGlobalSettingsClose)
    }
  }, [shouldReopenSettingsDialog])

  // 检查是否有待导入的字幕数据（从硬字幕提取页面跳转过来）
  useEffect(() => {
    try {
      const pendingImport = localStorage.getItem('pending-subtitle-import')
      if (pendingImport) {
        const { content, fileName } = JSON.parse(pendingImport)

        // 创建一个 File 对象
        const file = new File([content], fileName, { type: 'text/plain' })

        // 自动处理文件上传
        processFiles([file])

        // 清除 localStorage 中的待导入数据
        localStorage.removeItem('pending-subtitle-import')

        toast({
          title: "字幕已自动导入",
          description: `${fileName} 已成功导入`,
        })
      }
    } catch (error) {
      logger.error('自动导入字幕失败:', error)
    }
  }, [processFiles, toast])

  // 显示导出对话框
  const handleExportResults = () => {
    setShowExportDialog(true)
  }

  return (
    <TooltipProvider>
      <div
        className={`h-full flex flex-col bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 relative ${
          isDragOver ? 'bg-blue-100/50 dark:bg-blue-900/50' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      {/* 拖拽覆盖层 */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 dark:bg-blue-600/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-400 dark:border-blue-500 text-center max-w-md mx-4">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 rounded-full"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-full text-white">
                <Upload className="h-12 w-12" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              释放文件以上传
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              支持 SRT、VTT、ASS、SSA 格式
            </p>
          </div>
        </div>
      )}

      {/* 文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".srt,.vtt,.ass,.ssa"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件列表 */}
        <div className="w-72 border-r border-blue-100/50 dark:border-blue-900/30 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
          <FileList
            files={subtitleFiles}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onDeleteFile={handleDeleteFile}
            onUpload={() => fileInputRef.current?.click()}
            onOpenGlobalSettings={onOpenGlobalSettings}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onBatchGenerate={() => handleBatchGenerateAll(setSubtitleFiles, setSelectedFile)}
            onBatchExport={handleExportResults}
            isGenerating={isGenerating}
            apiConfigured={scenarioModels.availableModels.length > 0}
            hasResults={Object.values(generationResults).some(results => results.length > 0)}
            videoAnalysisResult={videoAnalysisResult}
            onShowAnalysisResult={() => setShowAnalysisResult(true)}
          />
        </div>

        {/* 右侧主要工作区 */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <WorkArea
              file={selectedFile}
              results={generationResults[selectedFile.id] || []}
              isGenerating={isGenerating}
              progress={generationProgress}
              onGenerate={handleBatchGenerate}
              apiConfigured={scenarioModels.availableModels.length > 0}
              onOpenGlobalSettings={onOpenGlobalSettings}
              onUpdateResult={(resultIndex, updatedResult) =>
                handleUpdateResult(selectedFile.id, resultIndex, updatedResult)
              }
              onMoveToTop={(resultIndex) =>
                handleMoveToTop(selectedFile.id, resultIndex)
              }
              onEnhanceContent={(resultIndex, operation, selectedTextInfo) =>
                handleEnhanceContent(selectedFile.id, resultIndex, operation, selectedTextInfo)
              }
              isInsufficientBalanceError={(error: unknown): boolean => {
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
                         error.errorType === 'INSUFFICIENT_BALANCE'
                }

                return false
              }}
              setShowInsufficientBalanceDialog={setShowInsufficientBalanceDialog}
            />
          ) : (
            <EmptyState
              onUpload={() => fileInputRef.current?.click()}
              onVideoAnalysis={handleVideoAnalysis}
            />
          )}
        </div>
      </div>

      {/* 生成设置对话框 */}
      <GenerationSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        config={config}
        onConfigChange={setConfig}
        onOpenGlobalSettings={onOpenGlobalSettings}
        setShouldReopenSettingsDialog={setShouldReopenSettingsDialog}
        scenarioModels={scenarioModels}
      />

      {/* 导出配置对话框 */}
      <ExportConfigDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        config={exportConfig}
        onConfigChange={setExportConfig}
        onExport={handleBatchExportToTMDB}
      />

      {/* 视频分析结果对话框 */}
      <VideoAnalysisResultDialog
        open={showAnalysisResult}
        onOpenChange={setShowAnalysisResult}
        result={videoAnalysisResult}
        movieTitle={movieTitle}
        onMovieTitleChange={setMovieTitle}
        onGenerateEpisode={() => {
          if (videoAnalysisResult) {
            handleGenerateEpisodeFromVideo(
              videoAnalysisResult,
              setSubtitleFiles,
              setSelectedFile,
              setIsGenerating,
              setGenerationProgress,
              setGenerationResults
            )
          }
        }}
      />

      {/* 余额不足弹窗 */}
      <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              余额不足
            </DialogTitle>
            <DialogDescription>
              您的硅基流动余额已用完，无法继续使用AI生成功能。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>请前往硅基流动官网充值后继续使用：</p>
              <a
                href="https://cloud.siliconflow.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                https://cloud.siliconflow.cn
              </a>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInsufficientBalanceDialog(false)}
              >
                知道了
              </Button>
              <Button
                onClick={() => {
                  window.open('https://cloud.siliconflow.cn', '_blank')
                  setShowInsufficientBalanceDialog(false)
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                前往充值
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
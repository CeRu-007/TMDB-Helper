import React from "react"
import {
  Film,
  Settings,
  Sparkles
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Progress } from "@/shared/components/ui/progress"
import { WorkAreaProps } from './types'
import { truncateFileName } from './utils'
import { ResultsDisplay } from './ResultsDisplay'

export function WorkArea({
  file,
  results,
  isGenerating,
  progress,
  onGenerate,
  apiConfigured,
  onOpenGlobalSettings,
  onUpdateResult,
  onMoveToTop,
  onEnhanceContent,
  onAIImprovement,
  aiImprovingIndex
}: WorkAreaProps): JSX.Element {
  return (
    <div className="h-full flex flex-col">
      {/* 文件信息和操作栏 */}
      <div className="flex-shrink-0 p-4 border-b border-blue-100/50 dark:border-blue-900/30 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Film className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                <span className="block">
                  {truncateFileName(file.name, 50)}
                </span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {file.episodes.length} 集 · 总字数 {file.episodes.reduce((sum, ep) => sum + ep.wordCount, 0).toLocaleString()}
              </p>
            </div>
          </div>

        </div>

        {isGenerating && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>生成进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* 结果展示区域 */}
      <div className="flex-1 overflow-hidden">
        {results.length > 0 ? (
          <ResultsDisplay
            results={results}
            onUpdateResult={onUpdateResult}
            onMoveToTop={onMoveToTop}
            onEnhanceContent={onEnhanceContent}
            onAIImprovement={onAIImprovement}
            aiImprovingIndex={aiImprovingIndex}
          />
        ) : !apiConfigured ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                请先配置API密钥
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                需要配置硅基流动API密钥才能使用AI生成功能
              </p>
              <Button
                onClick={() => {
                  if (onOpenGlobalSettings) {
                    onOpenGlobalSettings('api')
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Settings className="h-4 w-4 mr-2" />
                配置API
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                准备就绪
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                点击左侧"批量生成简介"按钮，AI将为您生成精彩的分集简介
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
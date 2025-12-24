import React from "react"
import {
  Upload,
  FileText,
  Settings,
  Download,
  Trash2,
  Sparkles,
  Film,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { Button } from "@/components/common/button"
import { Card, CardContent } from "@/components/common/card"
import { ScrollArea } from "@/components/common/scroll-area"
import { Badge } from "@/components/common/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/tooltip"
import { cn } from "@/lib/utils"
import { FileListProps } from './types'
import { truncateFileName } from './utils'

export function FileList({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onUpload,
  onOpenGlobalSettings,
  onOpenSettings,
  onBatchGenerate,
  onBatchExport,
  isGenerating,
  apiConfigured,
  hasResults,
  videoAnalysisResult,
  onShowAnalysisResult
}: FileListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-blue-100/50 dark:border-blue-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200">字幕文件</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {files.length} 个文件
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="h-8 w-8 p-0"
            title="生成设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* 批量操作按钮 */}
        <div className="mt-3 space-y-2">
          <Button
            onClick={onBatchGenerate}
            disabled={isGenerating || !apiConfigured || files.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                批量生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                批量生成简介
              </>
            )}
          </Button>

          {/* 视频分析结果按钮 */}
          {videoAnalysisResult && onShowAnalysisResult && (
            <Button
              onClick={onShowAnalysisResult}
              disabled={isGenerating}
              variant="outline"
              className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30"
              size="sm"
            >
              <Film className="h-4 w-4 mr-2" />
              查看视频分析结果
            </Button>
          )}

          {files.length > 0 && hasResults && (
            <Button
              onClick={onBatchExport}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出到TMDB
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {files.length > 0 ? (
          <div className="p-2 space-y-2">
            {files.map(file => (
            <Card
              key={file.id}
              className={cn(
                "group cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedFile?.id === file.id
                  ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                  : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              )}
              onClick={() => onSelectFile(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block">
                          {truncateFileName(file.name, 30)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{file.episodes.length} 集</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {file.uploadTime.toLocaleString()}
                      </div>

                      {/* 生成进度显示 */}
                      {file.generationStatus && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn(
                              "flex items-center space-x-1",
                              file.generationStatus === 'completed' && "text-green-600 dark:text-green-400",
                              file.generationStatus === 'generating' && "text-blue-600 dark:text-blue-400",
                              file.generationStatus === 'failed' && "text-red-600 dark:text-red-400",
                              file.generationStatus === 'pending' && "text-gray-500 dark:text-gray-400"
                            )}>
                              {file.generationStatus === 'completed' && <CheckCircle className="h-3 w-3" />}
                              {file.generationStatus === 'generating' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {file.generationStatus === 'failed' && <XCircle className="h-3 w-3" />}
                              {file.generationStatus === 'pending' && <Clock className="h-3 w-3" />}
                              <span>
                                {file.generationStatus === 'completed' && '已完成'}
                                {file.generationStatus === 'generating' && '生成中'}
                                {file.generationStatus === 'failed' && '生成失败'}
                                {file.generationStatus === 'pending' && '等待中'}
                              </span>
                            </span>
                            {file.generationStatus === 'generating' && file.generationProgress !== undefined && (
                              <span className="text-xs text-gray-500">
                                {file.generatedCount || 0}/{file.episodes.length}
                              </span>
                            )}
                          </div>

                          {/* 进度条 */}
                          {(file.generationStatus === 'generating' || file.generationStatus === 'completed') && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                              <div
                                className={cn(
                                  "h-1 rounded-full transition-all duration-300",
                                  file.generationStatus === 'completed' ? "bg-green-500" : "bg-blue-500"
                                )}
                                style={{
                                  width: `${file.generationProgress || 0}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteFile(file.id)
                      }}
                      title="删除文件"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        ) : (
          <FileListEmptyState onUpload={onUpload} />
        )}
      </ScrollArea>
    </div>
  )
}

// 文件列表空状态组件
function FileListEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      {/* 简洁的图标 */}
      <div className="mb-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-full p-4 border border-gray-200/50 dark:border-gray-700/50">
          <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* 简洁的文字说明 */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          暂无文件
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-500 max-w-[200px] leading-relaxed">
          文件上传后将在此处显示
        </p>
      </div>

      {/* 简单的上传提示 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-sm"></div>
          <span>支持拖拽上传</span>
        </div>
        <div className="text-gray-300 dark:text-gray-600">
          SRT • VTT • ASS • SSA
        </div>
      </div>
    </div>
  )
}
import React, { useRef } from 'react'
import { Button } from "@/components/common/button"
import { Badge } from "@/components/common/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { AutoResizeTextarea } from "./auto-resize-textarea"
import {
  Send,
  Paperclip,
  Loader2,
  AlertCircle,
  Pause,
  X,
  ChevronRight,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUPPORTED_SUBTITLE_FORMATS } from "@/lib/utils/ai-chat-constants"

interface ChatInputProps {
  inputValue: string
  isLoading: boolean
  isInterrupting: boolean
  isDragOver: boolean
  uploadedFileName: string | null
  uploadedFileContent: string | null
  isUploading: boolean
  uploadProgress: number
  selectedModel: string
  scenarioModels: any
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onInterrupt: () => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCancelUpload: () => void
  onModelChange: (modelId: string) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onSubtitleTask: (taskKey: string, content: string, fileName: string) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function ChatInput({
  inputValue,
  isLoading,
  isInterrupting,
  isDragOver,
  uploadedFileName,
  uploadedFileContent,
  isUploading,
  uploadProgress,
  selectedModel,
  scenarioModels,
  onInputChange,
  onSendMessage,
  onInterrupt,
  onFileUpload,
  onCancelUpload,
  onModelChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onSubtitleTask,
  fileInputRef,
  textareaRef
}: ChatInputProps) {
  return (
    <div className="bg-white dark:bg-gray-950 p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div 
            className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-sm min-h-[120px] transition-all duration-200 ${
              isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : ''
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="px-6 pt-4">
              {(uploadedFileName || isUploading) && (
                <div className="mb-3">
                  <div className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl inline-flex items-center self-start max-w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      {isUploading ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            正在上传: {uploadedFileName}
                          </span>
                          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {uploadedFileName}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 ml-2 flex-shrink-0"
                        onClick={onCancelUpload}
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {!isUploading && uploadedFileContent && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium"
                        onClick={() => {
                          if (uploadedFileContent && uploadedFileName) {
                            onSubtitleTask('generateSummary', uploadedFileContent, uploadedFileName)
                          }
                        }}
                      >
                        生成分集简介 <ChevronRight className="w-4 h-4 inline ml-1" />
                      </button>
                      
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium"
                        onClick={() => {
                          if (uploadedFileContent && uploadedFileName) {
                            onSubtitleTask('analyzePlot', uploadedFileContent, uploadedFileName)
                          }
                        }}
                      >
                        分析剧情 <ChevronRight className="w-4 h-4 inline ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <AutoResizeTextarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={isDragOver ? "松开以上传字幕文件..." : "输入消息或上传字幕文件..."}
                className="w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 text-base py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSendMessage()
                  }
                }}
                disabled={isLoading}
              />
              
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl pointer-events-none">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      拖放字幕文件到此处
                    </p>
                    <p className="text-blue-500 dark:text-blue-400 text-sm mt-1">
                      支持 {SUPPORTED_SUBTITLE_FORMATS.join(', ')} 格式
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </Button>

                {scenarioModels.isLoading ? (
                  <div className="h-10 px-3 py-2 flex items-center text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    加载中...
                  </div>
                ) : scenarioModels.error ? (
                  <div className="h-10 px-3 py-2 flex items-center text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    加载失败
                  </div>
                ) : (
                  <Select
                    value={selectedModel}
                    onValueChange={onModelChange}
                    disabled={scenarioModels.availableModels.length === 0}
                  >
                    <SelectTrigger className="h-10 px-3 py-2 border-none bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full data-[placeholder]:text-gray-500 focus:ring-0 focus:ring-offset-0 [&>svg]:w-4 [&>svg]:h-4 flex items-center gap-1 text-sm [&>svg]:text-gray-500">
                      <span className="font-medium truncate max-w-[120px]">
                        {scenarioModels.availableModels.find(m => m.id === selectedModel)?.displayName || '选择模型'}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="min-w-[200px]">
                      {scenarioModels.availableModels.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          暂无可用模型
                        </div>
                      ) : (
                        scenarioModels.getSelectedModels().map((model) => (
                          <SelectItem key={model.id} value={model.id} className="py-1.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-sm">{model.displayName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{model.description || model.modelId}</div>
                              </div>
                              {model.id === scenarioModels.primaryModelId && (
                                <Badge variant="secondary" className="text-xs">主模型</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-10 w-10 p-0 flex-shrink-0 rounded-full transition-all duration-200 relative z-10",
                  isLoading
                    ? "hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    : (inputValue.trim() || uploadedFileContent)
                    ? "hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLoading) {
                    onInterrupt();
                  } else {
                    onSendMessage();
                  }
                }}
                disabled={(!inputValue.trim() && !uploadedFileContent) && !isLoading}
              >
                {isLoading ? (
                  isInterrupting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

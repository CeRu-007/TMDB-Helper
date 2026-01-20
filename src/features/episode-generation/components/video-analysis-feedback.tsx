"use client"

import React from "react"
import { AlertCircle, CheckCircle2, Loader2, XCircle, Clock, Film, Wand2, FileText } from "lucide-react"
import { Progress } from "@/shared/components/ui/progress"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/lib/utils"

export interface VideoAnalysisStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  duration?: number;
}

export interface SubtitleInfo {
  hasSubtitles: boolean;
  language: string;
  content: string;
  confidence: number;
  segmentCount: number;
}

export interface VideoAnalysisFeedbackProps {
  isAnalyzing: boolean;
  steps: VideoAnalysisStep[];
  error?: string;
  subtitleInfo?: SubtitleInfo;
  onRetry?: () => void;
  onCancel?: () => void;
}

const stepIcons = {
  download: Film,
  extract: Clock,
  subtitle: FileText,
  analyze: Wand2,
  generate: CheckCircle2
};

const stepNames = {
  download: '提取音频',
  extract: '语音识别',
  subtitle: '信息抽取',
  analyze: 'AI分析',
  generate: '生成简介'
};

export function VideoAnalysisFeedback({
  isAnalyzing,
  steps,
  error,
  subtitleInfo,
  onRetry,
  onCancel
}: VideoAnalysisFeedbackProps) {
  const currentStep = steps.find(step => step.status === 'running');
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (!isAnalyzing && !error && steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 整体进度 */}
      {isAnalyzing && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                正在分析音频...
              </span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {currentStep && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {currentStep.message || `正在${stepNames[currentStep.id as keyof typeof stepNames] || currentStep.name}...`}
            </p>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
              >
                重试
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 字幕信息显示 */}
      {subtitleInfo && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            字幕提取结果
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-green-600 dark:text-green-400">检测状态:</span>
              <Badge variant={subtitleInfo.hasSubtitles ? "default" : "secondary"}>
                {subtitleInfo.hasSubtitles ? "✅ 已检测到字幕" : "❌ 未检测到字幕"}
              </Badge>
            </div>
            {subtitleInfo.hasSubtitles && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">语言:</span>
                  <span className="text-green-700 dark:text-green-300">{subtitleInfo.language}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">置信度:</span>
                  <span className="text-green-700 dark:text-green-300">{(subtitleInfo.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">字幕段数:</span>
                  <span className="text-green-700 dark:text-green-300">{subtitleInfo.segmentCount}</span>
                </div>
                {subtitleInfo.content && (
                  <div className="mt-3">
                    <span className="text-green-600 dark:text-green-400 text-xs">内容预览:</span>
                    <div className="mt-1 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300 max-h-20 overflow-y-auto">
                      {subtitleInfo.content.substring(0, 200)}
                      {subtitleInfo.content.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 详细步骤 */}
      {steps.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            分析进度
          </h4>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id as keyof typeof stepIcons] || Clock;
              const isLast = index === steps.length - 1;
              
              return (
                <div key={step.id} className="relative">
                  {/* 连接线 */}
                  {!isLast && (
                    <div className={cn(
                      "absolute left-2 top-6 w-px h-6 transition-colors",
                      step.status === 'completed' ? "bg-green-300" : "bg-gray-300 dark:bg-gray-600"
                    )} />
                  )}
                  
                  <div className="flex items-center space-x-3">
                    {/* 状态图标 */}
                    <div className={cn(
                      "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                      step.status === 'completed' && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      step.status === 'running' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      step.status === 'failed' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                      step.status === 'pending' && "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                    )}>
                      {step.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {step.status === 'failed' && <XCircle className="h-3 w-3" />}
                      {step.status === 'pending' && <Icon className="h-3 w-3" />}
                    </div>

                    {/* 步骤信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          step.status === 'completed' && "text-green-700 dark:text-green-300",
                          step.status === 'running' && "text-blue-700 dark:text-blue-300",
                          step.status === 'failed' && "text-red-700 dark:text-red-300",
                          step.status === 'pending' && "text-gray-500 dark:text-gray-400"
                        )}>
                          {stepNames[step.id as keyof typeof stepNames] || step.name}
                        </span>
                        
                        {/* 状态标签 */}
                        <Badge 
                          variant={
                            step.status === 'completed' ? 'default' :
                            step.status === 'running' ? 'secondary' :
                            step.status === 'failed' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {step.status === 'completed' && '已完成'}
                          {step.status === 'running' && '进行中'}
                          {step.status === 'failed' && '失败'}
                          {step.status === 'pending' && '等待中'}
                        </Badge>
                      </div>
                      
                      {/* 步骤消息 */}
                      {step.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {step.message}
                        </p>
                      )}
                      
                      {/* 步骤进度 */}
                      {step.status === 'running' && step.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-1" />
                        </div>
                      )}
                      
                      {/* 耗时 */}
                      {step.duration && step.status === 'completed' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          耗时: {step.duration}秒
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {(isAnalyzing || error) && (
        <div className="flex justify-end space-x-2">
          {onCancel && isAnalyzing && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              取消
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 创建默认的分析步骤
 */
export function createDefaultAnalysisSteps(): VideoAnalysisStep[] {
  return [
    {
      id: 'download',
      name: '下载视频',
      status: 'pending',
      message: '正在下载视频文件...'
    },
    {
      id: 'extract',
      name: '提取内容',
      status: 'pending',
      message: '正在提取视频帧和音频...'
    },
    {
      id: 'subtitle',
      name: '提取字幕',
      status: 'pending',
      message: '正在检测和提取字幕内容...'
    },
    {
      id: 'analyze',
      name: 'AI分析',
      status: 'pending',
      message: '正在使用AI分析视频内容...'
    },
    {
      id: 'generate',
      name: '生成简介',
      status: 'pending',
      message: '正在生成分集简介...'
    }
  ];
}

/**
 * 更新步骤状态的辅助函数
 */
export function updateStepStatus(
  steps: VideoAnalysisStep[],
  stepId: string,
  status: VideoAnalysisStep['status'],
  message?: string,
  progress?: number
): VideoAnalysisStep[] {
  return steps.map(step => 
    step.id === stepId 
      ? { ...step, status, message, progress }
      : step
  );
}

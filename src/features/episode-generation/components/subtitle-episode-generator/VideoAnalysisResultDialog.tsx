import React from "react"
import {
  Film,
  Wand2,
  CheckCircle2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { VideoAnalysisResultDialogProps } from './types'

export function VideoAnalysisResultDialog({
  open,
  onOpenChange,
  result,
  movieTitle,
  onMovieTitleChange,
  onGenerateEpisode
}: VideoAnalysisResultDialogProps) {
  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Film className="h-5 w-5" />
            <span>音频转写结果</span>
          </DialogTitle>
          <DialogDescription>
            AI已完成音频转写，您可以查看详细结果
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Film className="h-4 w-4 mr-2" />
              SRT字幕内容
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              音频转录生成的字幕内容
            </p>
          </div>

          <div className="h-[240px] border rounded-lg bg-gray-50 dark:bg-gray-900 overflow-auto">
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {result.structuredContent.srt || '暂无SRT字幕内容'}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4 mt-4">
          {/* 关键信息修正区域 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
              <Wand2 className="h-4 w-4 mr-2" />
              AI智能修正
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
              修正关键信息中的错别字、同音字，同时修正对话内容的语法错误，不会添加原文中没有的信息
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="movieTitle" className="text-sm">
                  片名（用于智能修正）
                </Label>
                <Input
                  id="movieTitle"
                  value={movieTitle}
                  onChange={(e) => onMovieTitleChange(e.target.value)}
                  placeholder="请输入完整的影视作品名称"
                  className="mt-1"
                />
              </div>

            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button onClick={onGenerateEpisode} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              生成分集简介
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
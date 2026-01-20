"use client"

import React, { useState } from "react"
import { Button } from "@/components/common/button"
import { Textarea } from "@/components/common/textarea"
import { ScrollArea } from "@/components/common/scroll-area"
import { Download, Trash2, Edit3, Save, X, Type, Sparkles } from "lucide-react"

interface SubtitleEntry {
  id: string
  index: number
  startTime: string
  endTime: string
  text: string
  confidence: number
}

interface ExtractedFrame {
  timestamp: number
  imageUrl: string
  recognizedText: string
  confidence: number
}

interface SubtitlePanelProps {
  subtitles: SubtitleEntry[]
  extractedFrames: ExtractedFrame[]
  totalTime?: number  // 总耗时（秒）
  onExport: () => void
  onClear: () => void
  onDelete?: (subtitleId: string) => void
  videoFileName?: string  // 视频文件名
}

export function SubtitlePanel({
  subtitles,
  extractedFrames,
  totalTime,
  onExport,
  onClear,
  onDelete,
  videoFileName
}: SubtitlePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // 格式化总耗时
  const formatTotalTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  const handleEditStart = (subtitle: SubtitleEntry) => {
    setEditingId(subtitle.id)
    setEditText(subtitle.text)
  }

  const handleEditSave = (id: string) => {
    // TODO: 更新字幕文本
    setEditingId(null)
    setEditText("")
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditText("")
  }

  // 生成SRT格式文本
  const generateSRTContent = () => {
    return subtitles
      .map((sub) => {
        return `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`
      })
      .join("\n")
  }

  // 跳转到AI生成页面
  const handleGoToAIGenerator = () => {
    const srtContent = generateSRTContent()
    const fileName = videoFileName ? videoFileName.replace(/\.[^/.]+$/, "") : "subtitle"

    // 保存到 localStorage
    localStorage.setItem('pending-subtitle-import', JSON.stringify({
      content: srtContent,
      fileName: `${fileName}.srt`,
      timestamp: Date.now()
    }))

    // 触发自定义事件通知页面跳转
    window.dispatchEvent(new CustomEvent('navigate-to-episode-generator'))
  }

  if (subtitles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Type className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          暂无字幕数据
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          开始提取后将在此显示识别的字幕
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-0.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {subtitles.length} 条字幕
          </span>
          {totalTime !== undefined && totalTime > 0 && (
            <span className="text-xs text-gray-400">
              耗时 {formatTotalTime(totalTime)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleGoToAIGenerator} className="h-8 px-3">
            <Sparkles className="h-4 w-4 mr-1.5" />
            <span className="text-xs">生成分集简介</span>
          </Button>
          <Button size="sm" onClick={onExport} className="h-8 px-3">
            <Download className="h-4 w-4 mr-1.5" />
            <span className="text-xs">导出SRT</span>
          </Button>
        </div>
      </div>

      {/* 字幕列表 */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-gray-500">
                    #{subtitle.index}
                  </span>
                  <span className="text-xs text-gray-400">
                    {subtitle.startTime} → {subtitle.endTime}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      subtitle.confidence >= 0.9
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                        : subtitle.confidence >= 0.7
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    }`}
                  >
                    {Math.round(subtitle.confidence * 100)}%
                  </span>
                  {editingId !== subtitle.id && (
                    <>
                      {onDelete && (
                        <button
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                          onClick={() => onDelete(subtitle.id)}
                          title="删除字幕"
                        >
                          <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                        </button>
                      )}
                      <button
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        onClick={() => handleEditStart(subtitle)}
                      >
                        <Edit3 className="h-3 w-3 text-gray-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === subtitle.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditCancel}
                    >
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditSave(subtitle.id)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {subtitle.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 预览SRT */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <details className="group">
          <summary className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            预览SRT格式
          </summary>
          <div className="p-3 bg-gray-100 dark:bg-gray-900 max-h-32 overflow-auto">
            <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {generateSRTContent().slice(0, 500)}
              {generateSRTContent().length > 500 && "..."}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
}

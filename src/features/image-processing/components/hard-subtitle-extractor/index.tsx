"use client"

import React, { useState, useCallback, useRef } from "react"
import { VideoPreview } from "./VideoPreview"
import { ConfigPanel } from "./ConfigPanel"
import { SubtitlePanel } from "./SubtitlePanel"
import { Button } from "@/shared/components/ui/button"
import { Slider } from "@/shared/components/ui/slider"
import { Play, Pause, Plus, Trash2, Download, Settings, Type, X } from "lucide-react"
import { useHardSubtitle } from "./useHardSubtitle"
import { cn } from "@/lib/utils"

interface HardSubtitleExtractorProps {
  onOpenGlobalSettings?: (section: string) => void
}

export function HardSubtitleExtractor({ onOpenGlobalSettings }: HardSubtitleExtractorProps) {
  const {
    // 状态
    videoFile,
    videoUrl,
    isPlaying,
    currentTime,
    duration,
    subtitleRegions,
    config,
    subtitles,
    isProcessing,
    progress,
    extractedFrames,
    statusMessage,
    totalTime,
    setDuration,
    setConfig,

    // 方法
    handleVideoUpload,
    handleVideoUrlChange,
    handlePlayPause,
    handleSeek,
    addSubtitleRegion,
    removeSubtitleRegion,
    updateSubtitleRegion,
    startExtraction,
    cancelExtraction,
    clearResults,
    deleteSubtitle,
    exportSRT,
    setVideoElementRef
  } = useHardSubtitle()

  const [activeTab, setActiveTab] = useState<"config" | "subtitles">("config")
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  // 回调视频元素引用
  const handleVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoElementRef.current = video
    setVideoElementRef(video)
  }, [setVideoElementRef])

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Type className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              硬字幕提取
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              通过VAD检测和OCR识别从视频中提取硬字幕
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isProcessing ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.floor(progress)}% {statusMessage}
              </span>
              <Button variant="outline" size="sm" onClick={cancelExtraction}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearResults}
                disabled={!videoFile && !videoUrl}
              >
                清空
              </Button>
              <Button
                size="sm"
                onClick={startExtraction}
                disabled={!videoFile && !videoUrl || subtitleRegions.length === 0}
              >
                <Play className="h-4 w-4 mr-1" />
                开始提取
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 主内容区 - 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧区域 (70%) - 视频预览和控制区 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* 视频预览区 */}
          <div className="flex-1 bg-black dark:bg-gray-950 relative">
            <VideoPreview
              videoUrl={videoUrl}
              currentTime={currentTime}
              duration={duration}
              subtitleRegions={subtitleRegions}
              onRegionAdd={addSubtitleRegion}
              onRegionUpdate={updateSubtitleRegion}
              onRegionRemove={removeSubtitleRegion}
              onSeek={handleSeek}
              onDurationChange={setDuration}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onVideoRef={handleVideoRef}
            />
          </div>

          {/* 控制区 */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* 左侧：字幕区域控制 */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSubtitleRegion({ x: 10, y: 85, width: 80, height: 12 })}
                  disabled={!videoFile && !videoUrl}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>

                {subtitleRegions.length > 0 && (
                  <>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {subtitleRegions.length} 个区域
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        subtitleRegions.forEach(r => removeSubtitleRegion(r.id))
                      }}
                      disabled={!videoFile && !videoUrl}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 mr-1" />
                      清除
                    </Button>
                  </>
                )}
              </div>

              {/* 右侧：视频控制 */}
              <div className="flex items-center space-x-2">
                {/* 时间显示 */}
                <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* 进度条 */}
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={([value]) => handleSeek(value)}
                  className="w-48"
                />

                {/* 播放控制 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                  disabled={!videoFile && !videoUrl}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧区域 (30%) - 配置和字幕面板 */}
        <div className="w-96 flex flex-col bg-white dark:bg-gray-800">
          {/* 标签页切换 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "config"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              onClick={() => setActiveTab("config")}
            >
              <Settings className="h-4 w-4 inline mr-1" />
              配置
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "subtitles"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              onClick={() => setActiveTab("subtitles")}
            >
              <Type className="h-4 w-4 inline mr-1" />
              字幕 ({subtitles.length})
            </button>
          </div>

          {/* 面板内容 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "config" ? (
              <ConfigPanel
                videoUrl={videoUrl}
                onVideoUrlChange={handleVideoUrlChange}
                onVideoUpload={handleVideoUpload}
                config={config}
                onConfigChange={(key, value) => {
                  setConfig((prev) => ({ ...prev, [key]: value }))
                }}
                subtitleRegions={subtitleRegions}
                progress={progress}
                isProcessing={isProcessing}
                onRegionRemove={removeSubtitleRegion}
              />
            ) : (
              <SubtitlePanel
                subtitles={subtitles}
                extractedFrames={extractedFrames}
                totalTime={totalTime}
                onExport={exportSRT}
                onClear={clearResults}
                onDelete={deleteSubtitle}
                videoFileName={videoFile?.name}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 格式化时间
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "00:00:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}
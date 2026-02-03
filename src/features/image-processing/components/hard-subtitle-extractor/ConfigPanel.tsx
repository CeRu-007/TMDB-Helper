"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Slider } from "@/shared/components/ui/slider"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Upload, Link, Settings, Volume2, Image, Clock, CheckCircle, Loader2, X } from "lucide-react"
import { logger } from '@/lib/utils/logger'

interface BoundingBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface Config {
  vadThreshold: number
  minSpeechDuration: number
  silenceThreshold: number
  sampleInterval: number
  useVAD: boolean
  ocrModelId: string
}

interface ModelInfo {
  id: string
  displayName: string
  providerId: string
}

interface ConfigPanelProps {
  videoUrl: string
  onVideoUrlChange: (url: string) => void
  onVideoUpload: (file: File) => void
  config: Config
  onConfigChange: (key: keyof Config, value: unknown) => void
  subtitleRegions: BoundingBox[]
  progress: number
  isProcessing: boolean
  onRegionRemove: (id: string) => void
}

export function ConfigPanel({
  videoUrl,
  onVideoUrlChange,
  onVideoUpload,
  config,
  onConfigChange,
  subtitleRegions,
  progress,
  isProcessing,
  onRegionRemove
}: ConfigPanelProps) {
  // 文件输入引用
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 模型列表状态
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  // 加载模型列表
  useEffect(() => {
    async function loadModels() {
      setLoadingModels(true)
      setModelError(null)
      try {
        const response = await fetch('/api/model-service/scenario?scenario=subtitle_ocr')
        const data = await response.json()
        
        if (data.success && data.models && data.models.length > 0) {
          const modelList = data.models.map((m: Record<string, unknown>) => ({
            id: m.id,
            displayName: m.displayName || m.modelId || m.id,
            providerId: m.providerId
          }))
          setModels(modelList)
        } else {
          setModels([])
        }
      } catch (err) {
        logger.error('加载模型列表失败:', err)
        setModelError('加载模型列表失败')
        setModels([])
      } finally {
        setLoadingModels(false)
      }
    }

    loadModels()
  }, [])
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      onVideoUpload(file)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 space-y-6">
      {/* 视频输入区域 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">视频来源</Label>

        {/* URL输入 */}
        <div className="flex items-center space-x-2">
          <Link className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="输入视频URL"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        {/* 或分隔符 */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">或</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* 文件上传 */}
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            点击上传视频文件
          </p>
          <p className="text-xs text-gray-400 mt-1">
            支持 MP4, MKV, AVI 等格式
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* 字幕区域信息 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center">
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          字幕区域 ({subtitleRegions.length})
        </Label>
        {subtitleRegions.length === 0 ? (
          <p className="text-xs text-gray-400">
            在视频预览区点击并拖动来框选字幕区域
          </p>
        ) : (
          <div className="space-y-1">
            {subtitleRegions.map((region, index) => (
              <div
                key={region.id}
                className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex justify-between items-center"
              >
                <span>区域 {index + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {region.width?.toFixed(1) ?? '0'}% × {region.height?.toFixed(1) ?? '0'}%
                  </span>
                  <button
                    onClick={() => onRegionRemove(region.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    disabled={isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VAD配置 */}
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center">
          <Volume2 className="h-4 w-4 mr-1" />
          VAD语音检测
        </Label>

        <div className="flex items-center justify-between">
          <Label className="text-xs">启用VAD检测</Label>
          <Switch
            checked={config.useVAD}
            onCheckedChange={(checked) => onConfigChange("useVAD", checked)}
            disabled={isProcessing}
          />
        </div>

        {config.useVAD && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label>语音阈值</Label>
                <span className="text-gray-400">{config.vadThreshold}</span>
              </div>
              <Slider
                value={[config.vadThreshold]}
                onValueChange={([value]) => onConfigChange("vadThreshold", value)}
                min={0}
                max={100}
                step={1}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label>最小语音时长 (秒)</Label>
                <span className="text-gray-400">{config.minSpeechDuration}</span>
              </div>
              <Slider
                value={[config.minSpeechDuration]}
                onValueChange={([value]) => onConfigChange("minSpeechDuration", value)}
                min={0.5}
                max={5}
                step={0.5}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label>静音合并阈值 (秒)</Label>
                <span className="text-gray-400">{config.silenceThreshold}</span>
              </div>
              <Slider
                value={[config.silenceThreshold]}
                onValueChange={([value]) => onConfigChange("silenceThreshold", value)}
                min={0.1}
                max={2}
                step={0.1}
                disabled={isProcessing}
              />
            </div>
          </>
        )}
      </div>

      {/* 采样配置 */}
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center">
          <Image className="h-4 w-4 mr-1" />
          帧采样
        </Label>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>采样间隔 (秒)</Label>
            <span className="text-gray-400">{config.sampleInterval}</span>
          </div>
          <Slider
            value={[config.sampleInterval]}
            onValueChange={([value]) => onConfigChange("sampleInterval", value)}
            min={1}
            max={10}
            step={0.5}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* OCR模型配置 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center">
          <Settings className="h-4 w-4 mr-1" />
          OCR模型
        </Label>
        {loadingModels ? (
          <div className="flex items-center text-sm text-gray-400">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            加载中...
          </div>
        ) : modelError ? (
          <p className="text-xs text-red-500">{modelError}</p>
        ) : models.length === 0 ? (
          <p className="text-xs text-gray-400">
            未配置OCR模型，请前往模型服务设置
          </p>
        ) : (
          <Select
            value={config.ocrModelId}
            onValueChange={(value) => onConfigChange("ocrModelId", value)}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择OCR模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 处理进度 */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>处理进度</Label>
            <span className="text-gray-400">{Math.floor(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

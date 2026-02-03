import React from "react"
import {
  Film,
  Loader2,
  AlertCircle
} from "lucide-react"
import { logger } from '@/lib/utils/logger'
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Badge } from "@/shared/components/ui/badge"
import { GenerationConfig } from '../types'
import { useScenarioModels } from "@/lib/hooks/useScenarioModels"

interface VideoAnalysisTabProps {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}

export function VideoAnalysisTab({
  config,
  onConfigChange
}: VideoAnalysisTabProps) {
  // 使用场景模型配置 - 语音转文字
  const speechModels = useScenarioModels('speech_to_text')
  
  return (
    <div className="space-y-6">
      {/* 功能介绍 */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Film className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              AI音频转写功能
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
              通过AI技术自动提取视频中的音频并进行语音识别，生成高质量的分集简介。
              支持YouTube、Bilibili等主流视频平台。
            </p>
          </div>
        </div>
      </div>

      {/* 功能开关 */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">功能控制</Label>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            启用或关闭AI音频转写功能
          </p>
        </div>

        <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Checkbox
            id="enableVideoAnalysis"
            checked={config.enableVideoAnalysis || false}
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({
                  ...config,
                  enableVideoAnalysis: !!checked
                })
              }
            }}
          />
          <div className="flex-1">
            <Label htmlFor="enableVideoAnalysis" className="text-sm font-medium cursor-pointer">
              启用AI音频转写功能
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              开启后可以通过视频URL直接生成分集简介
            </p>
          </div>
        </div>
      </div>

      {/* 语音识别模型配置 */}
      {config.enableVideoAnalysis && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">语音识别模型</Label>
            <p className="text-xs text-gray-500 mt-1 mb-3">
              选择用于语音转文字的AI模型。不同模型在精度、速度和适用场景上有所差异
            </p>
          </div>

          {speechModels.isLoading ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">加载模型中...</span>
            </div>
          ) : speechModels.error ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              <span className="text-sm text-red-500">加载失败: {speechModels.error}</span>
            </div>
          ) : (
            <Select
              value={config.speechRecognitionModel || speechModels.primaryModelId || ""}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function') {
                  onConfigChange({
                    ...config,
                    speechRecognitionModel: value
                  })

                  // 保存到模型服务场景配置
                  ;(async () => {
                    try {
                      // 获取当前场景配置
                      const response = await fetch('/api/model-service/scenario?scenario=speech_to_text')
                      const result = await response.json()

                      if (result.success && result.scenario) {
                        const scenario = result.scenario
                        // 更新主模型ID
                        scenario.primaryModelId = value

                        // 保存场景配置
                        await fetch('/api/model-service', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'update-scenario',
                            data: scenario
                          })
                        })
                      }
                    } catch (error) {
                      logger.error('保存语音识别场景配置失败:', error)
                    }
                  })()
                }
              }}
              disabled={speechModels.availableModels.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择语音识别模型" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {speechModels.availableModels.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    暂无可用模型，请先在模型服务中配置
                  </div>
                ) : (
                  speechModels.getSelectedModels().map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.displayName}</span>
                        {model.id === speechModels.primaryModelId && (
                          <Badge variant="secondary" className="text-xs">主模型</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}

          {/* 模型性能对比 */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">💡</span>
                模型选择建议
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SenseVoice-Small</span>
                  <span className="text-green-600 dark:text-green-400">推荐首选，平衡精度与速度</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SenseVoice-Large</span>
                  <span className="text-purple-600 dark:text-purple-400">最高精度，适合复杂音频环境</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">CosyVoice系列</span>
                  <span className="text-blue-600 dark:text-blue-400">轻量快速，适合简单清晰音频</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="font-medium">SpeechT5</span>
                  <span className="text-gray-600 dark:text-gray-400">通用模型，支持多种语音任务</span>
                </div>
              </div>
            </div>
          </div>

          {/* 支持的视频平台 */}
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-xs text-green-800 dark:text-green-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">🌐</span>
                支持的视频平台
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>YouTube</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Bilibili</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>腾讯视频</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>爱奇艺</span>
                </div>
              </div>
            </div>
          </div>

          {/* 使用提示 */}
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                使用注意事项
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>音频转写功能需要消耗较多API额度，建议合理使用</li>
                <li>音频质量会影响语音识别准确度，建议选择清晰的视频</li>
                <li>长视频处理时间较长，请耐心等待分析完成</li>
                <li>生成的内容仅供参考，请根据实际情况进行调整</li>
              </ul>
            </div>
          </div>

          {/* 快速使用指南 */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">📖</span>
                快速使用指南
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>在主界面选择"音频转写"选项卡</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>粘贴视频URL（支持YouTube、Bilibili等平台）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>点击"开始分析"，AI将自动提取音频并进行语音识别</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>查看分析结果，生成精彩的分集简介</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 功能未启用时的提示 */}
      {!config.enableVideoAnalysis && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">音频转写功能未启用</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            启用后可以通过视频URL直接生成分集简介
          </p>
        </div>
      )}
    </div>
  )
}
import React from "react"
import {
  Loader2,
  AlertCircle,
  Copy
} from "lucide-react"
import { logger } from '@/lib/utils/logger'
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Slider } from "@/shared/components/ui/slider"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Textarea } from "@/shared/components/ui/textarea"
import { Badge } from "@/shared/components/ui/badge"
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { GenerationConfig } from '../types'
import { useScenarioModels } from "@/lib/hooks/useScenarioModels"

interface GenerationTabProps {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}

export function GenerationTab({
  config,
  onConfigChange
}: GenerationTabProps) {
  // 使用场景模型配置
  const scenarioModels = useScenarioModels('episode_generation')

  // 保存模型配置到本地存储
  const handleModelChange = (newModel: string) => {
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      logger.error('onConfigChange is not a function')
      return
    }

    // 更新当前配置
    try {
      onConfigChange({
        ...config,
        model: newModel
      })
    } catch (error) {
      logger.error('Error updating config:', error)
      return
    }

    // 保存到模型服务场景配置
    ;(async () => {
      try {
        // 获取当前场景配置
        const response = await fetch('/api/model-service/scenario?scenario=episode_generation')
        const result = await response.json()

        if (result.success && result.scenario) {
          const scenario = result.scenario
          // 更新主模型ID
          scenario.primaryModelId = newModel

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
        logger.error('保存场景配置失败:', error)
      }
    })()

    // 保存到服务端配置（保留兼容性）
    ;(async () => {
      try {
        // 获取当前模型的提供商
        const currentModel = scenarioModels.availableModels.find(m => m.id === newModel)
        if (currentModel) {
          const key = currentModel.providerId === 'siliconflow-builtin' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
          const existing = await ClientConfigManager.getItem(key)
          const settings = existing ? JSON.parse(existing) : {}
          settings.episodeGenerationModel = newModel
          await ClientConfigManager.setItem(key, JSON.stringify(settings))
        }
      } catch (error) {
        logger.error('保存模型配置失败:', error)
      }
    })()
  }

  return (
    <div className="space-y-6">
      {/* 模型选择 */}
      <div>
        <Label className="text-sm font-medium">AI模型选择</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          选择用于生成分集简介的AI模型，不同模型有不同的特点和效果
        </p>
        {scenarioModels.isLoading ? (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">加载模型中...</span>
          </div>
        ) : scenarioModels.error ? (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
            <span className="text-sm text-red-500">加载失败: {scenarioModels.error}</span>
          </div>
        ) : (
          <Select
            value={config.model}
            onValueChange={handleModelChange}
            disabled={scenarioModels.availableModels.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择AI模型" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {scenarioModels.availableModels.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  暂无可用模型，请先在模型服务中配置
                </div>
              ) : (
                scenarioModels.getSelectedModels().map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.displayName}</span>
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

      {/* 简介字数范围 */}
      <div>
        <Label className="text-sm font-medium">简介字数范围</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          设置生成简介的字数范围，建议30-400字获得最佳效果
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">最少:</span>
            <Slider
              value={[config.summaryLength[0]]}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({
                    ...config,
                    summaryLength: [value[0], config.summaryLength[1]]
                  })
                }
              }}
              max={300}
              min={20}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{config.summaryLength[0]}字</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">最多:</span>
            <Slider
              value={[config.summaryLength[1]]}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({
                    ...config,
                    summaryLength: [config.summaryLength[0], value[0]]
                  })
                }
              }}
              max={400}
              min={config.summaryLength[0] + 10}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{config.summaryLength[1]}字</span>
          </div>
        </div>
      </div>

      {/* 创意温度 */}
      <div>
        <Label className="text-sm font-medium">创意温度</Label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          控制AI生成内容的创意程度，0.1为保守，1.0为创意
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 w-12">保守</span>
          <Slider
            value={[config.temperature]}
            onValueChange={(value) => {
              if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                onConfigChange({
                  ...config,
                  temperature: value[0]
                })
              }
            }}
            max={1.0}
            min={0.1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 w-12">创意</span>
          <span className="text-sm font-medium w-12">{config.temperature.toFixed(1)}</span>
        </div>
      </div>

      {/* 其他选项 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeOriginalTitle"
            checked={config.includeOriginalTitle}
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({
                  ...config,
                  includeOriginalTitle: !!checked
                })
              }
            }}
          />
          <Label htmlFor="includeOriginalTitle" className="text-sm">
            包含原始标题信息
          </Label>
        </div>
      </div>

      {/* 自定义提示词 */}
      <div>
        <Label htmlFor="customPrompt" className="text-sm font-medium">
          自定义提示词 (可选)
        </Label>
        <p className="text-xs text-gray-500 mt-1 mb-2">
          添加特殊要求或风格指导，将附加到生成提示中
        </p>
        <Textarea
          id="customPrompt"
          value={config.customPrompt || ""}
          onChange={(e) => {
            if (typeof onConfigChange === 'function') {
              onConfigChange({
                ...config,
                customPrompt: e.target.value
              })
            }
          }}
          placeholder="例如：注重情感描述，突出角色关系..."
          className="h-20 resize-none"
        />
      </div>

      {/* 模仿风格配置 */}
      {config.selectedStyles.includes('imitate') && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center space-x-2 mb-4">
            <Copy className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
              模仿风格配置
            </Label>
          </div>
          
          <div className="space-y-4">
            {/* 生成数量选择器 */}
            <div>
              <Label htmlFor="imitateGenerateCount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                生成数量
              </Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                设置基于样本风格生成多少个不同版本的简介
              </p>
              <Select
                value={config.imitateConfig?.generateCount?.toString() || "3"}
                onValueChange={(value) => {
                  if (typeof onConfigChange === 'function') {
                    onConfigChange({
                      ...config,
                      imitateConfig: {
                        ...config.imitateConfig!,
                        generateCount: parseInt(value)
                      }
                    })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} 个简介版本
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 风格样本输入框 */}
            <div>
              <Label htmlFor="imitateSampleContent" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                风格样本内容
              </Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                输入您希望AI模仿的简介风格样本，AI将分析其写作特点并应用到生成中
              </p>
              <Textarea
                id="imitateSampleContent"
                placeholder="请输入您希望模仿的简介风格样本..."
                value={config.imitateConfig?.sampleContent || ""}
                onChange={(e) => {
                  if (e.target.value.length <= 500 && typeof onConfigChange === 'function') {
                    const sampleContent = e.target.value
                    const sampleLength = sampleContent.length
                    
                    // 根据样本字数自动调整简介字数范围
                    let newSummaryLength = config.summaryLength
                    if (sampleLength > 0) {
                      const minLength = Math.max(20, Math.floor(sampleLength * 0.8))
                      const maxLength = Math.min(400, Math.ceil(sampleLength * 1.2))
                      newSummaryLength = [minLength, maxLength]
                    }
                    
                    onConfigChange({
                      ...config,
                      imitateConfig: {
                        ...config.imitateConfig!,
                        sampleContent: sampleContent
                      },
                      summaryLength: newSummaryLength
                    })
                  }
                }}
                className="min-h-[120px] resize-none"
                maxLength={500}
              />
              <div className="flex flex-col space-y-1 mt-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    AI将模仿写作风格、结构和表达方式，不会直接复用样本词汇
                  </p>
                  <span className="text-xs text-gray-400">
                    {config.imitateConfig?.sampleContent?.length || 0}/500
                  </span>
                </div>
                {config.imitateConfig?.sampleContent && config.imitateConfig.sampleContent.length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    已自动调整简介字数范围为 {config.summaryLength[0]}-{config.summaryLength[1]} 字（基于样本长度）
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
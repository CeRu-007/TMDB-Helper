import React, { useState } from "react"
import {
  Settings,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/use-toast"
import { EpisodeConfigClient } from "@/lib/media/episode-config-client"
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { GenerationSettingsDialogProps } from './types'
import { GENERATION_STYLES, TITLE_STYLES } from './constants'
import { GenerationTab } from './tabs/GenerationTab'
import { TitleStyleTab } from './tabs/TitleStyleTab'
import { SummaryStyleTab } from './tabs/SummaryStyleTab'
import { VideoAnalysisTab } from './tabs/VideoAnalysisTab'

export function GenerationSettingsDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onOpenGlobalSettings,
  setShouldReopenSettingsDialog,
  scenarioModels
}: GenerationSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("generation")
  const { toast } = useToast()

  const handleSave = () => {
    // 在保存前再次验证和清理配置
    const validStyleIds = GENERATION_STYLES.map(s => s.id)
    const cleanedConfig = {
      ...config,
      selectedStyles: config.selectedStyles.filter(styleId => validStyleIds.includes(styleId))
    }

    // 不保存model字段到本地配置，因为model应该从全局设置中获取
    const { model, ...configWithoutModel } = cleanedConfig

    // 保存清理后的配置到服务端（不包含model）
    void EpisodeConfigClient.saveConfig(JSON.stringify(configWithoutModel))

    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange === 'function') {
      onConfigChange(cleanedConfig)
    }

    // 显示保存成功的提示
    setTimeout(() => {
      toast({
        title: "设置已保存",
        description: "分集简介生成设置已成功保存",
      })
      onOpenChange(false)
    }, 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center text-base md:text-lg">
            <Settings className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
            分集简介生成设置
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {/* 模型服务状态显示 */}
          <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 md:mb-4 flex-shrink-0 space-y-3 md:space-y-4">
            {/* 模型服务状态 */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 md:justify-between">
              <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  模型服务状态:
                </span>
                <Badge variant={scenarioModels.availableModels.length > 0 ? "default" : "destructive"} className="text-[10px] md:text-xs">
                  {scenarioModels.availableModels.length > 0 ? "已配置" : "未配置"}
                </Badge>
                {scenarioModels.availableModels.length > 0 && (
                  <span className="text-[10px] md:text-xs text-gray-500">
                    可用模型: {scenarioModels.availableModels.length} 个
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] self-start md:self-auto"
                onClick={() => {
                  if (onOpenGlobalSettings) {
                    // 设置标记，表示需要在全局设置关闭后重新打开此对话框
                    setShouldReopenSettingsDialog?.(true)
                    onOpenGlobalSettings('model-service')
                    onOpenChange(false)
                  }
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                配置模型服务
              </Button>
            </div>

            {/* 当前选中的模型信息 */}
            {scenarioModels.getCurrentModel() && (
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-0 md:justify-between p-2.5 md:p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
                  <Badge variant="secondary" className="text-[10px] md:text-xs">
                    当前模型
                  </Badge>
                  <span className="text-xs md:text-sm font-medium">
                    {scenarioModels.getCurrentModel()?.displayName}
                  </span>
                  <span className="text-[10px] md:text-xs text-gray-500">
                    ({scenarioModels.getCurrentModel()?.modelId})
                  </span>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            {scenarioModels.availableModels.length === 0 && (
              <div className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                请先在"设置 - 模型服务 - 使用场景"中为"分集生成"配置模型
              </div>
            )}
          </div>

          {/* 标签页导航 - 可滚动 */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-3 md:mb-4 flex-shrink-0 overflow-x-auto scrollbar-hide">
            <nav className="-mb-px flex space-x-4 md:space-x-6 min-w-max px-0.5">
              <button
                onClick={() => setActiveTab("generation")}
                className={`min-h-[44px] py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${
                  activeTab === "generation"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                生成设置
              </button>
              <button
                onClick={() => setActiveTab("titleStyle")}
                className={`min-h-[44px] py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${
                  activeTab === "titleStyle"
                    ? "border-green-500 text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                标题风格
              </button>
              <button
                onClick={() => setActiveTab("summaryStyle")}
                className={`min-h-[44px] py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${
                  activeTab === "summaryStyle"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                简介风格
              </button>
              <button
                onClick={() => setActiveTab("videoAnalysis")}
                className={`min-h-[44px] py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${
                  activeTab === "videoAnalysis"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                音频转写
              </button>
            </nav>
          </div>

          {/* 标签页内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            {activeTab === "generation" && (
              <GenerationTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "titleStyle" && (
              <TitleStyleTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "summaryStyle" && (
              <SummaryStyleTab config={config} onConfigChange={onConfigChange} />
            )}
            {activeTab === "videoAnalysis" && (
              <VideoAnalysisTab config={config} onConfigChange={onConfigChange} />
            )}
          </div>

          {/* 底部按钮栏 */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-3 md:mt-4">
            {/* 左侧：风格提示信息 */}
            <div className="flex-1 md:mr-4">
              {activeTab === "titleStyle" && (
                <div className="text-sm">
                  {config.selectedTitleStyle ? (
                    <span className="text-green-700 dark:text-green-300">
                      已选择标题风格：
                      {(() => {
                        const style = TITLE_STYLES.find(s => s.id === config.selectedTitleStyle)
                        return style?.name || config.selectedTitleStyle
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-500">未选择标题风格</span>
                  )}
                </div>
              )}
              {activeTab === "summaryStyle" && (
                <div className="text-sm">
                  {(() => {
                    // 过滤出有效的风格名称
                    const validStyleNames = config.selectedStyles
                      .map(styleId => {
                        const style = GENERATION_STYLES.find(s => s.id === styleId)
                        return style?.name
                      })
                      .filter(name => name !== undefined)

                    return validStyleNames.length > 0 ? (
                      <span className="text-blue-700 dark:text-blue-300">
                        已选择 {validStyleNames.length} 种简介风格：
                        {validStyleNames.join('、')}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⚠️ 请至少选择一种生成风格
                      </span>
                    )
                  })()}
                </div>
              )}
              {activeTab === "videoAnalysis" && (
                <div className="text-sm">
                  {config.enableVideoAnalysis ? (
                    <span className="text-purple-700 dark:text-purple-300">
                      ✅ 音频转写功能已启用，模型：
                      {(() => {
                        const modelName = config.speechRecognitionModel || 'FunAudioLLM/SenseVoiceSmall';
                        if (modelName.includes('SenseVoiceSmall')) return 'SenseVoice-Small';
                        if (modelName.includes('SenseVoiceLarge')) return 'SenseVoice-Large';
                        if (modelName.includes('CosyVoice-300M-SFT')) return 'CosyVoice-300M-SFT';
                        if (modelName.includes('CosyVoice-300M-Instruct')) return 'CosyVoice-300M-Instruct';
                        if (modelName.includes('CosyVoice-300M')) return 'CosyVoice-300M';
                        if (modelName.includes('SpeechT5')) return 'SpeechT5';
                        return modelName;
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-500">音频转写功能未启用</span>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：按钮 */}
            <div className="flex space-x-2 self-end md:self-auto">
              <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave} className="min-h-[44px] bg-blue-500 hover:bg-blue-600">
                保存设置
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
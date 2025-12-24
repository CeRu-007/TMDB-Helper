import React from "react"
import { useToast } from "@/components/common/use-toast"
import { GenerationConfig } from '../types'
import { GENERATION_STYLES } from '../constants'

interface SummaryStyleTabProps {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}

export function SummaryStyleTab({
  config,
  onConfigChange
}: SummaryStyleTabProps) {
  const { toast } = useToast()
  
  const handleStyleToggle = (styleId: string) => {
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      console.error('onConfigChange is not a function')
      return
    }

    let newStyles: string[]
    let newConfig = { ...config }

    // 检查是否是模仿风格
    if (styleId === 'imitate') {
      if (config.selectedStyles.includes('imitate')) {
        // 取消选择模仿风格
        newStyles = []
      } else {
        // 选择模仿风格，清空其他所有风格
        newStyles = ['imitate']
        
        // 显示配置提示
        toast({
          title: "模仿风格已选择",
          description: '请前往"生成设置"标签页配置模仿样本内容和生成数量',
          duration: 5000,
        })
      }
    } else {
      // 普通风格选择逻辑
      if (config.selectedStyles.includes('imitate')) {
        // 如果当前选中了模仿风格，不允许选择其他风格
        return
      }

      if (config.selectedStyles.includes(styleId)) {
        // 取消选择
        newStyles = config.selectedStyles.filter(id => id !== styleId)
      } else {
        // 选择新风格，直接添加
        newStyles = [...config.selectedStyles, styleId]
      }
    }

    newConfig.selectedStyles = newStyles

    onConfigChange(newConfig)
  }

  const isImitateSelected = config.selectedStyles.includes('imitate')
  const isOtherStyleDisabled = isImitateSelected

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">选择简介生成风格</h3>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500">
            {isImitateSelected 
              ? "模仿模式：AI将根据您提供的样本内容模仿其风格生成简介" 
              : "可以选择多种风格组合使用，AI会为每种风格单独生成分集简介"
            }
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {GENERATION_STYLES.map((style) => {
            const isSelected = config.selectedStyles.includes(style.id)
            const isDisabled = isOtherStyleDisabled && style.id !== 'imitate'
            
            return (
              <div
                key={style.id}
                    className={`group relative rounded-xl border transition-all duration-200 overflow-hidden ${
                      isDisabled
                        ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg ring-2 ring-blue-500/20 cursor-pointer"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-950/10 cursor-pointer"
                    }`}
                    onClick={() => !isDisabled && handleStyleToggle(style.id)}
                  >
                    {/* 选中状态指示器 */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    <div className="p-5">
                      {/* 头部：图标和标题 */}
                      <div className="flex items-start space-x-3 mb-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          isDisabled
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                            : isSelected
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm leading-tight ${
                            isDisabled
                              ? "text-gray-400 dark:text-gray-500"
                              : isSelected
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-gray-900 dark:text-gray-100"
                          }`}>
                            {style.name}
                          </h4>
                        </div>
                      </div>

                      {/* 描述文字 */}
                      <p className={`text-xs leading-relaxed ${
                        isDisabled
                          ? "text-gray-400 dark:text-gray-500"
                          : isSelected
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {style.description}
                      </p>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>
    </div>
  )
}
import React from "react"
import { GenerationConfig } from '../types'
import { TITLE_STYLES } from '../constants'

interface TitleStyleTabProps {
  config: GenerationConfig
  onConfigChange: (config: GenerationConfig) => void
}

export function TitleStyleTab({
  config,
  onConfigChange
}: TitleStyleTabProps) {
  const handleTitleStyleToggle = (styleId: string) => {
    // 检查 onConfigChange 是否为函数
    if (typeof onConfigChange !== 'function') {
      console.error('onConfigChange is not a function')
      return
    }

    // 单选模式：如果点击的是当前选中的风格，则取消选择；否则选择新风格
    const newStyle = config.selectedTitleStyle === styleId ? "" : styleId

    onConfigChange({
      ...config,
      selectedTitleStyle: newStyle
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">选择标题生成风格</h3>
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500">
            选择标题生成风格，单选模式，将应用到所有简介风格
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {TITLE_STYLES.map((style) => {
            const isSelected = config.selectedTitleStyle === style.id
            return (
              <div
                key={style.id}
                className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-lg ring-2 ring-green-500/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md hover:bg-green-50/50 dark:hover:bg-green-950/10"
                }`}
                onClick={() => handleTitleStyleToggle(style.id)}
              >
                {/* 选中状态指示器 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="p-5">
                  {/* 头部：图标和标题 */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      isSelected
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm leading-tight ${
                        isSelected
                          ? "text-green-900 dark:text-green-100"
                          : "text-gray-900 dark:text-gray-100"
                      }`}>
                        {style.name}
                      </h4>
                    </div>
                  </div>

                  {/* 描述文字 */}
                  <p className={`text-xs leading-relaxed ${
                    isSelected
                      ? "text-green-700 dark:text-green-300"
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
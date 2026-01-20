/**
 * 帮助与支持面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Info, HelpCircle, ExternalLink, ChevronUp, ChevronDown } from "lucide-react"
import type { AppInfo, HelpTabState } from "./types"

interface HelpSettingsPanelProps {
  helpTab: HelpTabState['activeTab']
  setHelpTab: (tab: HelpTabState['activeTab']) => void
  appInfo: AppInfo
  isVersionDescriptionExpanded: boolean
  setIsVersionDescriptionExpanded: (expanded: boolean) => void
}

export default function HelpSettingsPanel({
  helpTab,
  setHelpTab,
  appInfo,
  isVersionDescriptionExpanded,
  setIsVersionDescriptionExpanded
}: HelpSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">帮助与支持</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          获取帮助文档和应用信息
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setHelpTab("about")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${helpTab === "about"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            关于应用
          </button>
        </nav>
      </div>

      {helpTab === "about" && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                关于应用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">帮助文档与常见问题</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">查看详细的使用说明和常见问题解答</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        访问GitHub文档
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{appInfo.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">版本 {appInfo.version}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {appInfo.versionInfo.title}
                      </h5>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {appInfo.versionInfo.releaseDate}
                      </span>
                    </div>
                    {appInfo.versionInfo.description && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsVersionDescriptionExpanded(!isVersionDescriptionExpanded)}
                        className="h-8 w-8 p-0 ml-2"
                      >
                        {isVersionDescriptionExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {appInfo.versionInfo.description && isVersionDescriptionExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                        {appInfo.versionInfo.description}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    一个专业的TMDB数据管理工具，帮助您轻松追踪、维护和管理影视词条信息。
                    支持数据导入导出、批量处理、智能分析等功能。
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">主要功能</h5>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• 影视数据追踪和管理</li>
                    <li>• TMDB API集成</li>
                    <li>• 数据导入导出</li>
                    <li>• 批量处理工具</li>
                    <li>• 智能数据分析</li>
                    <li>• 多主题界面</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    © 2024 TMDB Helper. 基于 TMDB API 构建。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
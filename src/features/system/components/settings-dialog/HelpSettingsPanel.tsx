/**
 * 帮助与支持面板
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Info, HelpCircle, ExternalLink } from "lucide-react"
import type { AppInfo, HelpTabState } from "./types"
import { VersionUpdatePanel } from "../VersionUpdatePanel"
import { useUpdateCheck } from "@/lib/hooks/use-update-check"

interface HelpSettingsPanelProps {
  helpTab: HelpTabState['activeTab']
  setHelpTab: (tab: HelpTabState['activeTab']) => void
  appInfo: AppInfo
}

export default function HelpSettingsPanel({
  helpTab,
  setHelpTab,
  appInfo
}: HelpSettingsPanelProps) {
  const { hasUpdate } = useUpdateCheck()

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
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${helpTab === "about"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            关于应用
          </button>
          <button
            onClick={() => setHelpTab("updates")}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${helpTab === "updates"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            版本更新
            {hasUpdate && (
              <Badge className="h-2 w-2 rounded-full bg-red-500 p-0" />
            )}
          </button>
        </nav>
      </div>

      {helpTab === "about" && (
        <div className="mt-6 space-y-4">
          {/* 应用图标和名称 */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                {/* 背景装饰 */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
                </div>

                {/* 网格背景 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

                {/* 主内容 */}
                <div className="relative z-10 p-8 text-center">
                  <img
                      src="/images/tmdb-helper-logo-new.png"
                      alt="TMDB Helper Logo"
                      className="h-20 w-20 mx-auto mb-4"
                      onError={(e) => {
                        e.currentTarget.src = "/tmdb-helper-logo.png"
                      }}
                    />
                  <h2 className="text-2xl font-light tracking-wide text-slate-800 dark:text-slate-100 mb-1">
                    {appInfo.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    功能强大的 TMDB 媒体维护助手
                  </p>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">v{appInfo.version}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快速链接 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                快速链接
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">GitHub 仓库</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">查看源代码和提交 Issue</div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">更新日志</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">查看版本历史和更新内容</div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/issues', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">问题反馈</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">报告 Bug 或提出功能建议</div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => window.open('https://hub.docker.com/r/ceru007/tmdb-helper', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Docker Hub</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">获取 Docker 镜像</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* 应用信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Info className="h-4 w-4 mr-2" />
                应用信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">版本号</div>
                  <div className="text-sm font-medium">{appInfo.version}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">构建时间</div>
                  <div className="text-sm font-medium">{appInfo.buildDate || '开发版本'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">应用类型</div>
                  <div className="text-sm font-medium">Web / Electron</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">许可证</div>
                  <div className="text-sm font-medium">MIT License</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">技术栈</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">Next.js 15</Badge>
                  <Badge variant="secondary" className="text-xs">React 18</Badge>
                  <Badge variant="secondary" className="text-xs">TypeScript</Badge>
                  <Badge variant="secondary" className="text-xs">Tailwind CSS</Badge>
                  <Badge variant="secondary" className="text-xs">Electron</Badge>
                  <Badge variant="secondary" className="text-xs">Docker</Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">核心依赖</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">TMDB API</Badge>
                  <Badge variant="outline" className="text-xs">TMDB-Import</Badge>
                  <Badge variant="outline" className="text-xs">AI 模型服务</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 简介 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                应用简介
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                TMDB-Helper 是一个功能强大的 TMDB (The Movie Database) 维护助手，旨在帮助用户高效地管理和维护 TMDB 上的电视节目类词条。
              </p>
              <div className="space-y-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">主要功能：</div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 🎬 智能导入和状态追踪影视词条</li>
                  <li>• 📺 查看即将上线和近期开播的影视资讯</li>
                  <li>• 🖼️ 海报背景裁切和视频缩略图提取</li>
                  <li>• 🤖 AI 分集简介生成器（多风格）</li>
                  <li>• 🔊 硬字幕提取和音频转写</li>
                  <li>• 🔧 TMDB-Import 集成和 CSV 编辑器</li>
                  <li>• 🚀 支持 Web、Electron 和 Docker 部署</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 版权信息 */}
          <Card className="bg-gray-50 dark:bg-gray-900/50">
            <CardContent className="py-6">
              <div className="text-center space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  © 2024 TMDB Helper. 保留所有权利。
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  基于 TMDB API 构建 • 遵循 MIT 许可证
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  特别感谢 <a href="https://github.com/fzlins/TMDB-Import" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">fzlins/TMDB-Import</a> 项目的支持
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {helpTab === "updates" && (
        <div className="mt-6">
          <VersionUpdatePanel />
        </div>
      )}
    </div>
  )
}
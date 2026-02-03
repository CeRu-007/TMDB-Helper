"use client"

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { 
  Settings, 
  AlarmClock, 
  BarChart2, 
  Upload, 
  Download,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserAvatar, useUser } from '@/shared/components/user-identity-provider'

interface HomeHeaderProps {
  runningTasksCount: number
  onShowSettings: () => void
  onShowTasks: () => void
  onShowExecutionLogs: () => void
  onShowImport: () => void
  onShowExport: () => void
}

export function HomeHeader({
  runningTasksCount,
  onShowSettings,
  onShowTasks,
  onShowExecutionLogs,
  onShowImport,
  onShowExport
}: HomeHeaderProps) {
  const { theme, setTheme } = useTheme()
  const { userInfo, isInitialized } = useUser()

  // 侧边栏布局下不显示此头部组件
  return null

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：标题 */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              TMDB维护助手
            </h1>
          </div>

          {/* 右侧：用户信息和操作按钮 */}
          <div className="flex items-center space-x-3">
            {/* 用户头像 */}
            {isInitialized && userInfo && (
              <UserAvatar
                onShowImportDialog={onShowImport}
                onShowExportDialog={onShowExport}
              />
            )}

            {/* 定时任务按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={onShowTasks}
              className="flex items-center space-x-2"
            >
              <AlarmClock className="h-4 w-4" />
              <span>定时任务</span>
            </Button>

            {/* 执行日志按钮（有运行任务时显示） */}
            {runningTasksCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowExecutionLogs}
                className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800"
              >
                <BarChart2 className="h-4 w-4" />
                <span>执行日志</span>
                <Badge variant="secondary" className="ml-1">
                  {runningTasksCount}
                </Badge>
              </Button>
            )}

            {/* 导入导出按钮 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowImport}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>导入</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onShowExport}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>导出</span>
              </Button>
            </div>

            {/* 主题切换 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* 设置按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={onShowSettings}
              className="flex items-center"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
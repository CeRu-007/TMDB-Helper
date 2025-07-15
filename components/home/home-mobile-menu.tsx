"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  Menu, 
  Calendar, 
  Film, 
  CalendarRange, 
  BarChart2,
  AlarmClock,
  Upload,
  Download,
  Settings
} from 'lucide-react'
import { UserAvatar, useUser } from '@/components/user-identity-provider'
import { UseHomeStateReturn } from '@/hooks/use-home-state'

interface HomeMobileMenuProps {
  homeState: UseHomeStateReturn
  runningTasksCount: number
}

export function HomeMobileMenu({ homeState, runningTasksCount }: HomeMobileMenuProps) {
  const { userInfo, isInitialized } = useUser()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="md:hidden fixed bottom-4 right-4 z-50 shadow-md"
          size="icon"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px]">
        <div className="mt-6">
          {/* 用户信息 */}
          {isInitialized && userInfo && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <UserAvatar
                onShowImportDialog={() => homeState.setShowImportDialog(true)}
                onShowExportDialog={() => homeState.setShowExportDialog(true)}
              />
            </div>
          )}

          <nav className="flex flex-col space-y-4">
            {/* 主要导航 */}
            <Button
              className="justify-start"
              variant={homeState.activeTab === "upcoming" ? "default" : "ghost"}
              onClick={() => homeState.setActiveTab("upcoming")}
            >
              <Calendar className="h-4 w-4 mr-2" /> 即将上线
            </Button>
            
            <Button
              className="justify-start"
              variant={homeState.activeTab === "recent" ? "default" : "ghost"}
              onClick={() => homeState.setActiveTab("recent")}
            >
              <Film className="h-4 w-4 mr-2" /> 近期开播
            </Button>
            
            <Button
              className="justify-start"
              variant={homeState.activeTab === "weekly" ? "default" : "ghost"}
              onClick={() => homeState.setActiveTab("weekly")}
            >
              <CalendarRange className="h-4 w-4 mr-2" /> 每周放送
            </Button>
            
            <Button
              className="justify-start"
              variant={homeState.activeTab === "progress" ? "default" : "ghost"}
              onClick={() => homeState.setActiveTab("progress")}
            >
              <BarChart2 className="h-4 w-4 mr-2" /> 追剧进度
            </Button>

            {/* 分隔线 */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

            {/* 功能按钮 */}
            <Button
              className="justify-start"
              variant="outline"
              onClick={() => homeState.setShowTasksDialog(true)}
            >
              <AlarmClock className="h-4 w-4 mr-2" /> 定时任务
            </Button>

            {runningTasksCount > 0 && (
              <Button
                className="justify-start bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                variant="outline"
                onClick={() => homeState.setShowExecutionLogs(true)}
              >
                <BarChart2 className="h-4 w-4 mr-2" /> 
                执行日志
                <Badge variant="secondary" className="ml-2">
                  {runningTasksCount}
                </Badge>
              </Button>
            )}

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => homeState.setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" /> 导入
            </Button>

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => homeState.setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" /> 导出
            </Button>

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => homeState.setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" /> 设置
            </Button>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}
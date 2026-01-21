"use client"

import type React from "react"
import { useState, useEffect } from "react"

// 导入图标
import {
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  Video,
  Loader2,
  AlertTriangle,
  Plus,
  PlayCircle,
  RefreshCw
} from "lucide-react"

// 导入 hooks
import { useHomeState } from '@/features/media-maintenance/lib/hooks/use-home-state'
import { useCategoryFilter } from '@/features/media-maintenance/lib/hooks/use-category-filter'
import { useWeekdayFilter } from '@/features/media-maintenance/lib/hooks/use-weekday-filter'
import { useCurrentDay } from '@/features/media-maintenance/lib/hooks/use-current-day'
import { useMediaNews } from '@/features/media-maintenance/lib/hooks/use-media-news'
import { useData } from "@/shared/components/client-data-provider"
import { useToast } from "@/shared/lib/hooks/use-toast"

// 导入常量
import { categories } from '@/lib/constants/categories'

// 导入组件
import { SidebarLayout } from "@/shared/components/layouts/sidebar-layout"
import { WeekdayNavigation } from '@/features/media-maintenance/components/weekday-navigation'
import { RegionNavigation } from '@/features/media-news/components/region-navigation'
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import MediaCard from "@/features/media-maintenance/components/media-card"

// 导入对话框组件
import AddItemDialog from "@/features/media-maintenance/components/add-item-dialog"
import SettingsDialog from "@/features/system/components/settings-dialog/SettingsDialog"
import GlobalScheduledTasksDialog from "@/features/scheduled-tasks/components/global-scheduled-tasks-dialog/global-scheduled-tasks-dialog"
import { TaskExecutionLogsDialog } from "@/features/scheduled-tasks/components/task-execution-logs-dialog"
import ScheduledTaskDialog from "@/features/scheduled-tasks/components/scheduled-task-dialog"
import ImportDataDialog from "@/features/data-management/components/import-data-dialog"
import ExportDataDialog from "@/features/data-management/components/export-data-dialog"

// 导入其他功能组件
import { SubtitleEpisodeGenerator } from "@/features/episode-generation/components/subtitle-episode-generator"
import VideoThumbnailExtractor from "@/features/image-processing/components/video-thumbnail-extractor"
import { ImageCropper } from "@/features/image-processing/components/image-cropper"

// 导入 home 组件
import { ErrorState } from "@/features/media-maintenance/components/error-state"
import { EmptyState } from "@/features/media-maintenance/components/empty-state"

// 判断当前环境是否为客户端
const isClientEnv = typeof window !== 'undefined'

// Helper function to get empty state message
const getEmptyStateMessage = (selectedCategory: string, selectedDayFilter: number, categories: any[], isCompleted: boolean = false) => {
  if (selectedCategory !== "all") {
    const categoryName = categories.find(c => c.id === selectedCategory)?.name
    return isCompleted
      ? `${categoryName}分类暂无已完结词条`
      : `${categoryName}分类暂无词条`
  }

  if (selectedDayFilter === "recent") {
    return isCompleted ? "暂无最近完成的词条" : "暂无最近更新的词条"
  }

  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weekdayName = weekdayNames[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]
  return isCompleted
    ? `${weekdayName}暂无已完结词条`
    : `${weekdayName}暂无词条`
}

// Helper function to render media news content
const renderMediaNews = (mediaNewsType: 'upcoming' | 'recent', mediaNews: any, items: any[], selectedRegion: string) => {
  const newsData = mediaNewsType === 'upcoming' ? mediaNews.upcomingItems : mediaNews.recentItems
  const loading = mediaNewsType === 'upcoming' ? mediaNews.loadingUpcoming : mediaNews.loadingRecent
  const error = mediaNewsType === 'upcoming' ? mediaNews.upcomingError : mediaNews.recentError
  const fetchFunction = mediaNewsType === 'upcoming'
    ? () => mediaNews.fetchUpcomingItems(selectedRegion, false)
    : () => mediaNews.fetchRecentItems(selectedRegion, false)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex flex-col items-center text-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600 dark:text-red-300 font-medium mb-1">
            {error}
          </p>
          <p className="text-red-500 dark:text-red-400 text-sm mb-4">
            {mediaNews.isMissingApiKey
              ? '请按照上方指南配置TMDB API密钥'
              : '无法连接到TMDB服务，请检查网络连接或稍后重试'}
          </p>
          <Button
            onClick={fetchFunction}
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (newsData.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 mb-1">
          {mediaNewsType === 'upcoming' ? '暂无即将上线的内容' : '暂无近期开播的内容'}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          {mediaNewsType === 'upcoming' ? '未找到未来30天内上线的影视动态' : '未找到过去30天内刚刚开播的影视动态'}
        </p>
      </div>
    )
  }

  const filteredItems = newsData.filter(newsItem =>
    !items.some(item =>
      item.tmdbId === newsItem.id.toString() &&
      item.mediaType === newsItem.mediaType
    )
  )

  return (
    <div className="grid grid-cols-6 gap-6 overflow-y-auto max-h-[calc(100vh-350px)]">
      {filteredItems.map((item) => (
        <div key={`${item.mediaType}-${item.id}`} className="group">
          <div className="mb-2">
            <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
            </Badge>
          </div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl">
            <img
              src={item.posterUrl ? `https://image.tmdb.org/t/p/w500${item.posterUrl}` : "/placeholder.svg"}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {item.title}
            </h3>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { toast } = useToast()

  // 使用自定义 hooks 管理状态
  const homeState = useHomeState()
  const { filterItemsByCategory } = useCategoryFilter()
  const { getFilteredItems: getWeekdayFilteredItems } = useWeekdayFilter()
  const { currentDay } = useCurrentDay()

  // 影视资讯相关
  const [selectedRegion, setSelectedRegion] = useState<string>("CN")
  const [mediaNewsType, setMediaNewsType] = useState<'upcoming' | 'recent'>('upcoming')
  const mediaNews = useMediaNews(selectedRegion)

  

  // 使用增强的数据提供者获取数据和方法
  const {
    items,
    loading,
    error: loadError,
    initialized,
    refreshData: handleRefresh,
    addItem: handleAddItem,
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem
  } = useData()

  // 根据状态获取词条
  const getItemsByStatus = (status: "ongoing" | "completed") => {
    return items.filter((item) => item.status === status)
  }

  const ongoingItems = getItemsByStatus("ongoing")
  const completedItems = getItemsByStatus("completed")

  // 统计数据
  const totalItems = items.length

  // 根据当前选择的分类过滤统计数据
  const filteredOngoingItems = filterItemsByCategory(ongoingItems, homeState.selectedCategory)
  const filteredCompletedItems = filterItemsByCategory(completedItems, homeState.selectedCategory)
  const filteredOngoingCount = filteredOngoingItems.length
  const filteredCompletedCount = filteredCompletedItems.length



  // 获取最终筛选后的词条
  const getFinalFilteredItems = (items: any[]) => {
    const categoryFiltered = filterItemsByCategory(items, homeState.selectedCategory)
    return getWeekdayFilteredItems(categoryFiltered, homeState.selectedDayFilter, homeState.selectedCategory)
  }

  // 渲染内容
  const renderContent = () => {
    if (loadError) {
      return <ErrorState error={loadError} onRefresh={handleRefresh} onOpenSettings={() => homeState.setShowSettingsDialog(true)} />;
    }

    if (items.length === 0 && initialized) {
      return <EmptyState onAddItem={() => homeState.setShowAddDialog(true)} />;
    }

    return (
        <div className="w-full h-full">
          <Tabs value={homeState.activeTab} onValueChange={homeState.setActiveTab} className="w-full h-full overflow-hidden">
          <TabsContent value="ongoing">
            <WeekdayNavigation
              selectedDayFilter={homeState.selectedDayFilter}
              onDayFilterChange={homeState.setSelectedDayFilter}
              filteredItems={filteredOngoingItems}
              categories={categories}
              selectedCategory={homeState.selectedCategory}
              activeTab={homeState.activeTab}
              onActiveTabChange={homeState.setActiveTab}
              currentDay={currentDay}
            />
            <div className="mt-6 overflow-y-auto">
              <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                {getFinalFilteredItems(ongoingItems).map((item) => (
                  <div key={item.id} className="transform scale-[0.98] origin-top-left">
                    <MediaCard
                      item={item}
                      onClick={() => homeState.setSelectedItem(item)}
                      showAirTime={true}
                    />
                  </div>
                ))}
              </div>

              {getFinalFilteredItems(ongoingItems).length === 0 && (
                <div className="text-center py-16">
                  <div className="p-8 max-w-md mx-auto">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                    <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {getEmptyStateMessage(homeState.selectedCategory, homeState.selectedDayFilter, categories, false)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">添加新词条开始维护吧</p>
                    <Button onClick={() => homeState.setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      添加新词条
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <WeekdayNavigation
              selectedDayFilter={homeState.selectedDayFilter}
              onDayFilterChange={homeState.setSelectedDayFilter}
              filteredItems={filteredCompletedItems}
              categories={categories}
              selectedCategory={homeState.selectedCategory}
              activeTab={homeState.activeTab}
              onActiveTabChange={homeState.setActiveTab}
              currentDay={currentDay}
            />
            <div className="mt-6 overflow-y-auto">
              <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                {getFinalFilteredItems(completedItems).map((item) => (
                  <div key={item.id} className="transform scale-[0.98] origin-top-left">
                    <MediaCard
                      item={item}
                      onClick={() => homeState.setSelectedItem(item)}
                      showAirTime={true}
                    />
                  </div>
                ))}
              </div>

              {getFinalFilteredItems(completedItems).length === 0 && (
                <div className="text-center py-16">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {getEmptyStateMessage(homeState.selectedCategory, homeState.selectedDayFilter, categories, true)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">完成维护的词条会自动出现在这里</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="flex flex-row justify-between items-center mb-4 overflow-y-auto max-h-[calc(100vh-250px)]">
              <div className="flex items-center mb-0">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                    {mediaNewsType === 'upcoming' ? (
                      <Calendar className="h-5 w-5" />
                    ) : (
                      <PlayCircle className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                      {mediaNewsType === 'upcoming' ? '即将上线' : '近期开播'}
                    </h2>
                    {mediaNewsType === 'upcoming' && mediaNews.upcomingItems.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {mediaNews.upcomingItems.filter(upcomingItem =>
                          !items.some(item =>
                            item.tmdbId === upcomingItem.id.toString() &&
                            item.mediaType === upcomingItem.mediaType
                          )
                        ).length}
                      </span>
                    )}
                    {mediaNewsType === 'recent' && mediaNews.recentItems.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {mediaNews.recentItems.filter(recentItem =>
                          !items.some(item =>
                            item.tmdbId === recentItem.id.toString() &&
                            item.mediaType === recentItem.mediaType
                          )
                        ).length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {mediaNewsType === 'upcoming' ? '未来30天将要上线的内容' : '过去30天刚刚开播的内容'}
                  </p>
                </div>
              </div>
            </div>

            <RegionNavigation
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              mediaNewsType={mediaNewsType}
              setMediaNewsType={setMediaNewsType}
              upcomingItemsByRegion={mediaNews.upcomingItemsByRegion}
              recentItemsByRegion={mediaNews.recentItemsByRegion}
              items={items}
            />

            <div className="overflow-y-auto">
              {renderMediaNews(mediaNewsType, mediaNews, items, selectedRegion)}
            </div>
          </TabsContent>

          <TabsContent value="content-generation">
            <div className="min-h-0">
              <SubtitleEpisodeGenerator
                onOpenGlobalSettings={(section) => {
                  homeState.setSettingsInitialSection(section)
                  homeState.setShowSettingsDialog(true)
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="thumbnail">
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="extract">分集图片提取</TabsTrigger>
                <TabsTrigger value="crop">海报背景裁切</TabsTrigger>
              </TabsList>

              <TabsContent value="extract" className="mt-4">
                <VideoThumbnailExtractor onOpenGlobalSettings={(section) => {
                  homeState.setSettingsInitialSection(section)
                  homeState.setShowSettingsDialog(true)
                }} />
              </TabsContent>

              <TabsContent value="crop" className="min-h-0">
                <ImageCropper />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <>
      <SidebarLayout
        totalItems={totalItems}
        runningTasks={homeState.runningTasks}
        onShowAddDialog={() => homeState.setShowAddDialog(true)}
        onShowSettingsDialog={(section) => {
          homeState.setSettingsInitialSection(section)
          homeState.setShowSettingsDialog(true)
        }}
        onShowTasksDialog={() => homeState.setShowTasksDialog(true)}
        onShowExecutionLogs={() => homeState.setShowExecutionLogs(true)}
        onShowImportDialog={() => homeState.setShowImportDialog(true)}
        onShowExportDialog={() => homeState.setShowExportDialog(true)}
        // 词条详情相关
        selectedItem={homeState.selectedItem}
        onSelectedItemChange={homeState.setSelectedItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onOpenScheduledTask={(item) => {
          homeState.setScheduledTaskItem(item);
          homeState.setShowScheduledTaskDialog(true);
        }}
        // 影视资讯相关状态和函数
        upcomingItems={mediaNews.upcomingItems}
        recentItems={mediaNews.recentItems}
        loadingUpcoming={mediaNews.loadingUpcoming}
        loadingRecent={mediaNews.loadingRecent}
        upcomingError={mediaNews.upcomingError}
        recentError={mediaNews.recentError}
        upcomingLastUpdated={mediaNews.upcomingLastUpdated}
        recentLastUpdated={mediaNews.recentLastUpdated}
        selectedRegion={selectedRegion}
        mediaNewsType={mediaNewsType}
        isMissingApiKey={mediaNews.isMissingApiKey}
        upcomingItemsByRegion={mediaNews.upcomingItemsByRegion}
        recentItemsByRegion={mediaNews.recentItemsByRegion}
        fetchUpcomingItems={(silent?: boolean, _retryCount?: number, region?: string) => {
          if (region) {
            mediaNews.fetchUpcomingItems(region, silent || false)
          } else {
            mediaNews.fetchUpcomingItems(selectedRegion, silent || false)
          }
        }}
        fetchRecentItems={(silent?: boolean, _retryCount?: number, region?: string) => {
          if (region) {
            mediaNews.fetchRecentItems(region, silent || false)
          } else {
            mediaNews.fetchRecentItems(selectedRegion, silent || false)
          }
        }}
        setMediaNewsType={setMediaNewsType}
        setSelectedRegion={setSelectedRegion}
        // 词条维护相关状态和函数
        items={items}
        activeTab={homeState.activeTab}
        selectedDayFilter={homeState.selectedDayFilter}
        selectedCategory={homeState.selectedCategory}
        categories={categories}
        filteredOngoingItems={filteredOngoingItems}
        filteredCompletedItems={filteredCompletedItems}
        getFilteredItems={getFinalFilteredItems}
        setActiveTab={homeState.setActiveTab}
        setSelectedDayFilter={homeState.setSelectedDayFilter}
        setSelectedCategory={homeState.setSelectedCategory}
        onItemClick={(item) => {
          homeState.setSelectedItem(item);
        }}
        // 组件引用
        RegionNavigation={() => <RegionNavigation
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          mediaNewsType={mediaNewsType}
          setMediaNewsType={setMediaNewsType}
          upcomingItemsByRegion={mediaNews.upcomingItemsByRegion}
          recentItemsByRegion={mediaNews.recentItemsByRegion}
          items={items}
        />}
        ApiKeySetupGuide={() => <div>ApiKeySetupGuide</div>}
        VideoThumbnailExtractor={VideoThumbnailExtractor}
        ImageCropper={ImageCropper}
        WeekdayNavigation={() => <div>WeekdayNavigation</div>}
      >
        {/* 词条维护内容 */}
        <div id="main-content-container" className="relative min-h-0">
          {renderContent()}
        </div>
      </SidebarLayout>

      {/* Dialogs */}
      <AddItemDialog
        open={homeState.showAddDialog}
        onOpenChange={homeState.setShowAddDialog}
        onAdd={handleAddItem}
      />
      <SettingsDialog
        open={homeState.showSettingsDialog}
        onOpenChange={(open) => {
          homeState.setShowSettingsDialog(open)
          if (!open) {
            homeState.setSettingsInitialSection(undefined)
          }
        }}
        initialSection={homeState.settingsInitialSection || ""}
      />
      <GlobalScheduledTasksDialog open={homeState.showTasksDialog} onOpenChange={homeState.setShowTasksDialog} />
      <TaskExecutionLogsDialog
        open={homeState.showExecutionLogs}
        onOpenChange={homeState.setShowExecutionLogs}
        runningTasks={homeState.runningTasks}
      />
      <ImportDataDialog open={homeState.showImportDialog} onOpenChange={homeState.setShowImportDialog} />
      <ExportDataDialog open={homeState.showExportDialog} onOpenChange={homeState.setShowExportDialog} />
      {homeState.scheduledTaskItem && (
        <ScheduledTaskDialog
          item={homeState.scheduledTaskItem}
          open={homeState.showScheduledTaskDialog}
          onOpenChange={(open) => {
            homeState.setShowScheduledTaskDialog(open);
            if (!open) homeState.setScheduledTaskItem(null);
          }}
          onUpdate={handleUpdateItem}
          onTaskSaved={(task) => {
            toast({
              title: "定时任务已保存",
              description: `任务 "${task.name}" 已成功保存`,
            });
          }}
        />
      )}
    </>
  )
}
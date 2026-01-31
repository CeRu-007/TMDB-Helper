"use client"

import type React from "react"
import { useState, useMemo } from "react"

// Icons
import {
  Clock,
  CheckCircle2,
  Calendar,
  Loader2,
  AlertTriangle,
  Plus,
  PlayCircle,
  RefreshCw
} from "lucide-react"

// Hooks
import { useHomeState } from '@/features/media-maintenance/lib/hooks/use-home-state'
import { useCategoryFilter } from '@/features/media-maintenance/lib/hooks/use-category-filter'
import { useWeekdayFilter } from '@/features/media-maintenance/lib/hooks/use-weekday-filter'
import { useCurrentDay } from '@/features/media-maintenance/lib/hooks/use-current-day'
import { useMediaNews } from '@/features/media-maintenance/lib/hooks/use-media-news'
import { useData } from "@/shared/components/client-data-provider"
import { useToast } from "@/lib/hooks/use-toast"

// Constants
import { categories, type Category } from '@/lib/constants/categories'
import type { MediaItem } from '@/types/media'

// Components
import { SidebarLayout } from "@/shared/components/layouts/sidebar-layout"
import { WeekdayNavigation } from '@/features/media-maintenance/components/weekday-navigation'
import { RegionNavigation } from '@/features/media-news/components/region-navigation'
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import MediaCard from "@/features/media-maintenance/components/media-card"
import { ErrorState } from "@/features/media-maintenance/components/error-state"

// Dialog components
import AddItemDialog from "@/features/media-maintenance/components/add-item-dialog"
import SettingsDialog from "@/features/system/components/settings-dialog/SettingsDialog"
import GlobalScheduledTasksDialog from "@/features/scheduled-tasks/components/global-scheduled-tasks-dialog/global-scheduled-tasks-dialog"
import { TaskExecutionLogsDialog } from "@/features/scheduled-tasks/components/task-execution-logs-dialog"
import ScheduledTaskDialog from "@/features/scheduled-tasks/components/scheduled-task-dialog"
import ImportDataDialog from "@/features/data-management/components/import-data-dialog"
import ExportDataDialog from "@/features/data-management/components/export-data-dialog"

// Feature components
import { SubtitleEpisodeGenerator } from "@/features/episode-generation/components/subtitle-episode-generator"
import VideoThumbnailExtractor from "@/features/image-processing/components/video-thumbnail-extractor"
import { ImageCropper } from "@/features/image-processing/components/image-cropper"

// Types
interface MediaNewsData {
  upcomingItems: MediaItem[]
  recentItems: MediaItem[]
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError?: string
  recentError?: string
  fetchUpcomingItems: (region: string, force?: boolean) => Promise<void>
  fetchRecentItems: (region: string, force?: boolean) => Promise<void>
}

// Helper functions
const getEmptyStateMessage = (
  selectedCategory: string,
  selectedDayFilter: number,
  categories: Category[],
  isCompleted: boolean = false
): string => {
  if (selectedCategory !== "all") {
    const categoryName = categories.find(c => c.id === selectedCategory)?.name
    const suffix = isCompleted ? "暂无已完结词条" : "暂无词条"
    return `${categoryName}分类${suffix}`
  }

  if (selectedDayFilter === "recent") {
    return isCompleted ? "暂无最近完成的词条" : "暂无最近更新的词条"
  }

  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weekdayName = weekdayNames[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]
  return isCompleted ? `${weekdayName}暂无已完结词条` : `${weekdayName}暂无词条`
}

const MediaNewsLoadingState = () => (
  <div className="flex justify-center items-center h-48">
    <div className="flex flex-col items-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
    </div>
  </div>
)

const MediaNewsErrorState = ({
  error,
  isMissingApiKey,
  onRetry
}: {
  error: string
  isMissingApiKey: boolean
  onRetry: () => void
}) => {
  const errorMessage = isMissingApiKey
    ? '请按照上方指南配置TMDB API密钥'
    : '无法连接到TMDB服务，请检查网络连接或稍后重试'

  return (
    <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
      <div className="flex flex-col items-center text-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600 dark:text-red-300 font-medium mb-1">{error}</p>
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">{errorMessage}</p>
        <Button
          onClick={onRetry}
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

const MediaNewsEmptyState = ({ isUpcoming }: { isUpcoming: boolean }) => {
  const noDataMessage = isUpcoming
    ? { title: '暂无即将上线的内容', desc: '未找到未来30天内上线的影视动态' }
    : { title: '暂无近期开播的内容', desc: '未找到过去30天内刚刚开播的影视动态' }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
      <p className="text-gray-500 dark:text-gray-400 mb-1">{noDataMessage.title}</p>
      <p className="text-gray-400 dark:text-gray-500 text-sm">{noDataMessage.desc}</p>
    </div>
  )
}

const MediaNewsGrid = ({ items }: { items: MediaItem[] }) => (
  <div className="grid grid-cols-6 gap-6 overflow-y-auto max-h-[calc(100vh-350px)]">
    {items.map((item) => (
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

export default function HomePage() {
  const { toast } = useToast()

  // State management
  const homeState = useHomeState()
  const { filterItemsByCategory } = useCategoryFilter()
  const { getFilteredItems: getWeekdayFilteredItems } = useWeekdayFilter()
  const { currentDay } = useCurrentDay()

  const [selectedRegion, setSelectedRegion] = useState<string>("CN")
  const [mediaNewsType, setMediaNewsType] = useState<'upcoming' | 'recent'>('upcoming')
  const mediaNews = useMediaNews(selectedRegion)

  // Data management
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

  // Computed values
  const itemsByStatus = useMemo(() => ({
    ongoing: items.filter((item) => item.status === "ongoing"),
    completed: items.filter((item) => item.status === "completed")
  }), [items])

  const filteredItems = useMemo(() => ({
    ongoing: filterItemsByCategory(itemsByStatus.ongoing, homeState.selectedCategory),
    completed: filterItemsByCategory(itemsByStatus.completed, homeState.selectedCategory)
  }), [itemsByStatus, homeState.selectedCategory, filterItemsByCategory])

  const filteredCounts = useMemo(() => ({
    ongoing: filteredItems.ongoing.length,
    completed: filteredItems.completed.length
  }), [filteredItems])

  const getFinalFilteredItems = (items: MediaItem[]) => {
    const categoryFiltered = filterItemsByCategory(items, homeState.selectedCategory)
    return getWeekdayFilteredItems(categoryFiltered, homeState.selectedDayFilter, homeState.selectedCategory)
  }

  // Media news rendering
  const renderMediaNews = (type: 'upcoming' | 'recent') => {
    const newsData = type === 'upcoming' ? mediaNews.upcomingItems : mediaNews.recentItems
    const loading = type === 'upcoming' ? mediaNews.loadingUpcoming : mediaNews.loadingRecent
    const error = type === 'upcoming' ? mediaNews.upcomingError : mediaNews.recentError
    const fetchFunction = () => type === 'upcoming'
      ? mediaNews.fetchUpcomingItems(selectedRegion, false)
      : mediaNews.fetchRecentItems(selectedRegion, false)

    if (loading) return <MediaNewsLoadingState />
    if (error) return (
      <MediaNewsErrorState
        error={error}
        isMissingApiKey={mediaNews.isMissingApiKey}
        onRetry={fetchFunction}
      />
    )
    if (newsData.length === 0) return <MediaNewsEmptyState isUpcoming={type === 'upcoming'} />

    const filteredItems = newsData.filter(newsItem =>
      !items.some(item =>
        item.tmdbId === newsItem.id.toString() &&
        item.mediaType === newsItem.mediaType
      )
    )

    return <MediaNewsGrid items={filteredItems} />
  }

  // Main content rendering
  const renderContent = () => {
    if (loadError) {
      return <ErrorState error={loadError} onRefresh={handleRefresh} onOpenSettings={() => homeState.setShowSettingsDialog(true)} />
    }

    return (
      <div className="w-full h-full">
        <Tabs value={homeState.activeTab} onValueChange={homeState.setActiveTab} className="w-full h-full overflow-hidden">
          <TabsContent value="ongoing">
            <WeekdayNavigation
              selectedDayFilter={homeState.selectedDayFilter}
              onDayFilterChange={homeState.setSelectedDayFilter}
              filteredItems={filteredItems.ongoing}
              categories={categories}
              selectedCategory={homeState.selectedCategory}
              activeTab={homeState.activeTab}
              onActiveTabChange={homeState.setActiveTab}
              currentDay={currentDay}
            />
            <div className="mt-6 overflow-y-auto">
              <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                {getFinalFilteredItems(itemsByStatus.ongoing).map((item) => (
                  <div key={item.id} className="transform scale-[0.98] origin-top-left">
                    <MediaCard
                      item={item}
                      onClick={() => homeState.setSelectedItem(item)}
                      showAirTime={true}
                    />
                  </div>
                ))}
              </div>

              {getFinalFilteredItems(itemsByStatus.ongoing).length === 0 && (
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
              filteredItems={filteredItems.completed}
              categories={categories}
              selectedCategory={homeState.selectedCategory}
              activeTab={homeState.activeTab}
              onActiveTabChange={homeState.setActiveTab}
              currentDay={currentDay}
            />
            <div className="mt-6 overflow-y-auto">
              <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                {getFinalFilteredItems(itemsByStatus.completed).map((item) => (
                  <div key={item.id} className="transform scale-[0.98] origin-top-left">
                    <MediaCard
                      item={item}
                      onClick={() => homeState.setSelectedItem(item)}
                      showAirTime={true}
                    />
                  </div>
                ))}
              </div>

              {getFinalFilteredItems(itemsByStatus.completed).length === 0 && (
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
              {renderMediaNews(mediaNewsType)}
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
    )
  }

  return (
    <>
      <SidebarLayout
        totalItems={items.length}
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
        filteredOngoingItems={filteredItems.ongoing}
        filteredCompletedItems={filteredItems.completed}
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
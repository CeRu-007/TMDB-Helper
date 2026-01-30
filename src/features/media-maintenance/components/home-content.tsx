"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Plus, Calendar, Film, CalendarRange, BarChart2 } from 'lucide-react'
import { WeekdayNavigation } from './weekday-navigation'
import { MediaNewsSection } from './media-news-section'
import { ProgressSection } from './progress-section'
import { WeeklyScheduleSection } from './weekly-schedule-section'
import { UseHomeStateReturn } from '@/features/media-maintenance/lib/hooks/use-home-state'
import { UseMediaNewsReturn } from '@/features/media-news/lib/hooks/use-media-news'
interface HomeContentProps {
  homeState: UseHomeStateReturn
  mediaNews: UseMediaNewsReturn
}

const categories = [
  { id: "all", name: "全部", icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
  { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" /> },
  { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" /> },
  { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" /> },
  { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" /> },
  { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" /> },

]

export function HomeContent({ homeState, mediaNews }: HomeContentProps) {
  const containerClasses = "mx-auto px-6"

  return (
    <main className="flex-1">
      <div className={containerClasses}>
        <div className="py-6">
          {/* 主要标签页 */}
          <Tabs value={homeState.activeTab} onValueChange={homeState.setActiveTab}>
            <div className="flex flex-row items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>即将上线</span>
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex items-center space-x-2">
                  <Film className="h-4 w-4" />
                  <span>近期开播</span>
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center space-x-2">
                  <CalendarRange className="h-4 w-4" />
                  <span>每周放送</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center space-x-2">
                  <BarChart2 className="h-4 w-4" />
                  <span>维护进度</span>
                </TabsTrigger>
              </TabsList>

              {/* 右侧操作区 */}
              <div className="flex items-center space-x-3">
                {/* 分类筛选（仅在进度页面显示） */}
                {(homeState.activeTab === 'weekly' || homeState.activeTab === 'progress') && (
                  <Select 
                    value={homeState.selectedCategory} 
                    onValueChange={homeState.setSelectedCategory}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center">
                            {category.icon}
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* 添加按钮 */}
                <Button
                  onClick={() => homeState.setShowAddDialog(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>添加词条</span>
                </Button>
              </div>
            </div>

            {/* 标签页内容 */}
            <TabsContent value="upcoming" className="space-y-6">
              <MediaNewsSection
                type="upcoming"
                title="即将上线"
                items={mediaNews.upcomingItems}
                loading={mediaNews.loadingUpcoming}
                error={mediaNews.upcomingError}
                lastUpdated={mediaNews.upcomingLastUpdated}
                isMissingApiKey={mediaNews.isMissingApiKey}
                selectedRegion={homeState.selectedRegion}
                onRegionChange={homeState.setSelectedRegion}
                onRefresh={() => mediaNews.fetchUpcomingItems(homeState.selectedRegion, false)}
                onShowSettings={() => homeState.setShowSettingsDialog(true)}
              />
            </TabsContent>

            <TabsContent value="recent" className="space-y-6">
              <MediaNewsSection
                type="recent"
                title="近期开播"
                items={mediaNews.recentItems}
                loading={mediaNews.loadingRecent}
                error={mediaNews.recentError}
                lastUpdated={mediaNews.recentLastUpdated}
                isMissingApiKey={mediaNews.isMissingApiKey}
                selectedRegion={homeState.selectedRegion}
                onRegionChange={homeState.setSelectedRegion}
                onRefresh={() => mediaNews.fetchRecentItems(homeState.selectedRegion, false)}
                onShowSettings={() => homeState.setShowSettingsDialog(true)}
              />
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <WeeklyScheduleSection
                homeState={homeState}
                categories={categories}
              />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <ProgressSection
                homeState={homeState}
                categories={categories}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
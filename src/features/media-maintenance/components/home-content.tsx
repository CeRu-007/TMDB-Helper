"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Calendar, Film, CalendarRange, BarChart2, Plus, LayoutGrid, Sparkles, Tv, Baby, Popcorn, Ticket } from 'lucide-react'
import { WeekdayNavigation } from './weekday-navigation'
import { MediaNewsSection } from './media-news-section'
import { ProgressSection } from './progress-section'
import { WeeklyScheduleSection } from './weekly-schedule-section'
import { UseHomeStateReturn } from '@/stores/hooks'
import { UseMediaNewsReturn } from '@/features/media-news/lib/hooks/use-media-news'
import { useTranslation } from 'react-i18next'

interface HomeContentProps {
  homeState: UseHomeStateReturn
  mediaNews: UseMediaNewsReturn
}

const categories = [
  { id: "all", key: "all" },
  { id: "anime", key: "anime" },
  { id: "tv", key: "tv" },
  { id: "kids", key: "kids" },
  { id: "variety", key: "variety" },
  { id: "short", key: "short" },
]

export function HomeContent({ homeState, mediaNews }: HomeContentProps) {
  const { t } = useTranslation('media')
  const containerClasses = "mx-auto px-6"

  return (
    <main className="flex-1">
      <div className={containerClasses}>
        <div className="py-6">
          <Tabs value={homeState.activeTab} onValueChange={homeState.setActiveTab}>
            <div className="flex flex-row items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{t('homeTabs.upcoming')}</span>
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex items-center space-x-2">
                  <Film className="h-4 w-4" />
                  <span>{t('homeTabs.recent')}</span>
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center space-x-2">
                  <CalendarRange className="h-4 w-4" />
                  <span>{t('homeTabs.weekly')}</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center space-x-2">
                  <BarChart2 className="h-4 w-4" />
                  <span>{t('homeTabs.progress')}</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center space-x-3">
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
                            <span className="mr-2">
                              {category.id === 'all' && <LayoutGrid className="h-4 w-4" />}
                              {category.id === 'anime' && <Sparkles className="h-4 w-4" />}
                              {category.id === 'tv' && <Tv className="h-4 w-4" />}
                              {category.id === 'kids' && <Baby className="h-4 w-4" />}
                              {category.id === 'variety' && <Popcorn className="h-4 w-4" />}
                              {category.id === 'short' && <Ticket className="h-4 w-4" />}
                            </span>
                            <span>{t(`categoryNames.${category.key}`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  onClick={() => homeState.setShowAddDialog(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('addItem')}</span>
                </Button>
              </div>
            </div>

            <TabsContent value="upcoming" className="space-y-6">
              <MediaNewsSection
                type="upcoming"
                title={t('homeTabs.upcoming')}
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
                title={t('homeTabs.recent')}
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
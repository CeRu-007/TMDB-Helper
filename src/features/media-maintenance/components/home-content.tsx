'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import {
  Calendar,
  Film,
  CalendarRange,
  BarChart2,
  Plus,
  LayoutGrid,
  Sparkles,
  Tv,
  Baby,
  Popcorn,
  Ticket,
} from 'lucide-react';
import { WeekdayNavigation } from './weekday-navigation';
import { MediaNewsSection } from '@/features/media-news';
import { ProgressSection } from './progress-section';
import { WeeklyScheduleSection } from './weekly-schedule-section';
import { UseHomeStateReturn } from '@/stores/hooks';
import { UseMediaNewsReturn } from '@/lib/hooks/use-media-news';
import { useTranslation } from 'react-i18next';

interface HomeContentProps {
  homeState: UseHomeStateReturn;
  mediaNews: UseMediaNewsReturn;
}

const categories: Array<{ id: string; name: string; icon: React.ReactNode }> = [
  { id: 'all', name: 'all', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'anime', name: 'anime', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'tv', name: 'tv', icon: <Tv className="h-4 w-4" /> },
  { id: 'kids', name: 'kids', icon: <Baby className="h-4 w-4" /> },
  { id: 'variety', name: 'variety', icon: <Popcorn className="h-4 w-4" /> },
  { id: 'short', name: 'short', icon: <Ticket className="h-4 w-4" /> },
];

export function HomeContent({ homeState, mediaNews }: HomeContentProps) {
  const { t } = useTranslation('media');
  const [selectedRegion, setSelectedRegion] = useState('CN');
  const containerClasses = 'mx-auto px-6';

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
                            <span className="mr-2">{category.icon}</span>
                            <span>{t(`categoryNames.${category.name}`)}</span>
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
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                onRefresh={() => mediaNews.fetchUpcomingItems(selectedRegion, false)}
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
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                onRefresh={() => mediaNews.fetchRecentItems(selectedRegion, false)}
                onShowSettings={() => homeState.setShowSettingsDialog(true)}
              />
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <WeeklyScheduleSection homeState={homeState} categories={categories} />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <ProgressSection homeState={homeState} categories={categories} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

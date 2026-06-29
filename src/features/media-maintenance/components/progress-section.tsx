'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CheckCircle2, PlayCircle, Clock, Star } from 'lucide-react';
import { WeekdayNavigation } from './weekday-navigation';
import { useData } from '@/shared/components/client-data-provider';
import { TMDBItem } from '@/lib/data/storage';
import MediaCard from '@/features/media-maintenance/components/media-card';
import { MediaCardGridSkeleton } from '@/features/media-maintenance/components/media-card-skeleton';
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll';
import { UseHomeStateReturn } from '@/stores/hooks';
import { useTranslation } from 'react-i18next';

interface ProgressSectionProps {
  homeState: UseHomeStateReturn;
  categories: Array<{ id: string; name: string; icon: React.ReactNode }>;
}

export function ProgressSection({ homeState, categories }: ProgressSectionProps): JSX.Element {
  const { t } = useTranslation('media');
  const { items, loading } = useData();

  function handleCardClick(itemId: string): void {
    const item = items.find(function (i: TMDBItem) {
      return i.id === itemId;
    });

    if (item) {
      homeState.setSelectedItem(item);
    }
  }

  function filterItemsByCategory(itemsToFilter: TMDBItem[]): TMDBItem[] {
    if (homeState.selectedCategory === 'all') {
      return itemsToFilter;
    }

    return itemsToFilter.filter(function (item: TMDBItem) {
      if (item.category) {
        return item.category === homeState.selectedCategory;
      }

      const title = item.title.toLowerCase();
      const notes = item.notes?.toLowerCase() || '';

      switch (homeState.selectedCategory) {
        case 'anime':
          return title.includes('动漫') || notes.includes('动漫');
        case 'tv':
          return (
            item.mediaType === 'tv' &&
            !title.includes('动漫') &&
            !notes.includes('动漫') &&
            !title.includes('综艺') &&
            !notes.includes('综艺')
          );
        case 'kids':
          return title.includes('少儿') || notes.includes('少儿');
        case 'variety':
          return title.includes('综艺') || notes.includes('综艺');
        case 'short':
          return title.includes('短剧') || notes.includes('短剧');
        default:
          return true;
      }
    });
  }

  function getItemsByStatus(status: 'ongoing' | 'completed'): TMDBItem[] {
    const statusFilteredItems = items.filter(function (item: TMDBItem) {
      return item.status === status;
    });
    return filterItemsByCategory(statusFilteredItems);
  }

  const ongoingItems = getItemsByStatus('ongoing');
  const completedItems = getItemsByStatus('completed');

  const {
    visibleItems: ongoingVisible,
    sentinelRef: ongoingSentinel,
    hasMore: ongoingHasMore,
  } = useInfiniteScroll(ongoingItems, 24);
  const {
    visibleItems: completedVisible,
    sentinelRef: completedSentinel,
    hasMore: completedHasMore,
  } = useInfiniteScroll(completedItems, 24);

  // 统计数据
  const totalItems = ongoingItems.length + completedItems.length;
  const completedCount = completedItems.length;
  const completionRate = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <MediaCardGridSkeleton count={12} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <PlayCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {t('inProgress')}
                </p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {ongoingItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {t('completed')}
                </p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {completedItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">{t('total')}</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-muted-foreground">{t('completionRate')}</p>
                <p className="text-sm font-medium text-foreground">{completionRate.toFixed(1)}%</p>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 进度标签页 */}
      <Tabs defaultValue="ongoing">
        <TabsList className="overflow-x-auto flex-nowrap scrollbar-hide w-full">
          <TabsTrigger
            value="ongoing"
            className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap"
          >
            <PlayCircle className="h-4 w-4" />
            <span>{t('progress.ongoing', { count: ongoingItems.length })}</span>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center space-x-2 flex-shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('progress.completed', { count: completedItems.length })}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          {ongoingItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {ongoingVisible.map((item) => (
                  <div
                    key={item.id}
                    className="w-[99%] mx-auto transform scale-[0.99] origin-top-left"
                  >
                    <MediaCard item={item} itemId={item.id} onItemClick={handleCardClick} />
                  </div>
                ))}
              </div>
              {ongoingHasMore && <div ref={ongoingSentinel} className="h-4" />}
            </>
          ) : (
            <div className="text-center py-8">
              <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('progress.noOngoing')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {completedVisible.map((item) => (
                  <div
                    key={item.id}
                    className="w-[99%] mx-auto transform scale-[0.99] origin-top-left"
                  >
                    <MediaCard item={item} itemId={item.id} onItemClick={handleCardClick} />
                  </div>
                ))}
              </div>
              {completedHasMore && <div ref={completedSentinel} className="h-4" />}
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('progress.noCompleted')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { TMDBItem } from '@/lib/data/storage';
import { Calendar, LayoutGrid, Columns2 } from 'lucide-react';
import { FilterDropdown } from './filter-dropdown';
import { Separator } from '@/shared/components/ui/separator';
import i18n from '@/lib/i18n';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface WeekdayNavigationProps {
  selectedDayFilter: 'recent' | number;
  onDayFilterChange: (filter: 'recent' | number) => void;
  filteredItems: TMDBItem[];
  allItems: TMDBItem[];
  categories: Array<{ id: string; name: string }>;
  selectedCategory: string;
  onCategoryChange?: (category: string) => void;
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
  currentDay?: number;
}

function getDayButtonClasses(isSelected: boolean, isToday: boolean): string {
  const baseClasses =
    'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border-2';

  if (isSelected) {
    return `${baseClasses} bg-blue-100 text-blue-700 ${
      isToday ? 'border-yellow-400' : 'border-blue-100'
    }`;
  }

  return `${baseClasses} text-muted-foreground hover:text-foreground hover:bg-accent ${
    isToday ? 'border-yellow-400' : 'border-transparent'
  }`;
}

export function WeekdayNavigation({
  selectedDayFilter,
  onDayFilterChange,
  filteredItems,
  allItems,
  categories,
  selectedCategory,
  onCategoryChange,
  activeTab,
  onActiveTabChange,
  currentDay = 0,
}: WeekdayNavigationProps) {
  const { t } = useTranslation('media');
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const [mounted, setMounted] = useState(false);
  const [localCurrentDay, setLocalCurrentDay] = useState(currentDay);

  const WEEKDAYS = useMemo(
    () => [
      t('weekdaysList.monday'),
      t('weekdaysList.tuesday'),
      t('weekdaysList.wednesday'),
      t('weekdaysList.thursday'),
      t('weekdaysList.friday'),
      t('weekdaysList.saturday'),
      t('weekdaysList.sunday'),
    ],
    [t]
  );

  useEffect(() => {
    setMounted(true);
    const jsDay = new Date().getDay();
    const adjustedDay = jsDay === 0 ? 6 : jsDay - 1;
    setLocalCurrentDay(adjustedDay);
  }, []);

  const getItemsByDay = (items: TMDBItem[], day: number) => {
    return items.filter(
      (item) =>
        item.weekday === day ||
        (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
    );
  };

  return (
    <div className="bg-background border-b border-border sticky top-0 z-10">
      <div className="mx-auto px-6">
        <div className="flex max-md:flex-col justify-between max-md:justify-start items-center max-md:items-stretch pt-3 pb-0 gap-4 max-md:gap-2">
          <ScrollAreaPrimitive.Root className="flex-1 whitespace-nowrap overflow-hidden self-stretch">
            <ScrollAreaPrimitive.Viewport className="h-full w-full">
              <div className="flex space-x-1 pb-3">
                <button
                  onClick={() => onDayFilterChange('recent')}
                  className={getDayButtonClasses(selectedDayFilter === 'recent', false)}
                >
                  {t('recentlyUpdated', { ns: 'common' })}
                </button>

                {WEEKDAYS.map((day, index) => {
                  const jsWeekday = index === 6 ? 0 : index + 1;
                  const dayItems = getItemsByDay(filteredItems, jsWeekday);
                  const isToday = mounted && index === localCurrentDay;
                  const isSelected = selectedDayFilter === jsWeekday;

                  return (
                    <button
                      key={index}
                      onClick={() => onDayFilterChange(jsWeekday)}
                      className={getDayButtonClasses(isSelected, isToday)}
                      suppressHydrationWarning
                    >
                      <div className="flex items-center space-x-1">
                        <span>{day}</span>
                        {isToday && (
                          <Calendar className="h-3 w-3 text-yellow-600" suppressHydrationWarning />
                        )}
                        {dayItems.length > 0 && (
                          <span className="bg-muted-foreground/20 text-muted-foreground text-xs rounded-full px-1.5 py-0.5 ml-1">
                            {dayItems.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.ScrollAreaScrollbar
              orientation="horizontal"
              className="max-md:hidden flex h-3 touch-none select-none flex-col border-t border-t-transparent p-[2px] transition-colors"
            >
              <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/70 hover:bg-muted-foreground/80" />
            </ScrollAreaPrimitive.ScrollAreaScrollbar>
          </ScrollAreaPrimitive.Root>

          <div className="flex items-center gap-2 flex-shrink-0 pb-3">
            <Separator orientation="vertical" className="h-6 bg-muted max-sm:hidden" />

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title={viewMode === 'grid' ? t('backdropView') : t('posterView')}
            >
              {viewMode === 'grid' ? (
                <LayoutGrid className="h-5 w-5" />
              ) : (
                <Columns2 className="h-5 w-5" />
              )}
            </button>

            <Separator orientation="vertical" className="h-6 bg-muted max-sm:hidden" />

            {onCategoryChange && (
              <FilterDropdown
                items={allItems}
                categories={categories}
                activeTab={activeTab}
                onActiveTabChange={onActiveTabChange}
              />
            )}
          </div>

          {(!activeTab || !onActiveTabChange) && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground pb-3">
              <span>
                {selectedCategory === 'all'
                  ? t('all', { ns: 'common' })
                  : t(`categoryNames.${selectedCategory}`, { ns: 'media' })}
              </span>
              <span>•</span>
              <span>
                {selectedDayFilter === 'recent'
                  ? t('recentlyUpdated', { ns: 'common' })
                  : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}${t('aired', { ns: 'common' })}`}
              </span>
              <span>•</span>
              <span>{t('itemsCount', { count: filteredItems.length, ns: 'common' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

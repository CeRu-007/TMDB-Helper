"use client"

import React from 'react'
import { WeekdayNavigation } from './weekday-navigation'
import { useData } from '@/shared/components/client-data-provider'
import { TMDBItem } from '@/lib/data/storage'
import MediaCard from '@/features/media-maintenance/components/media-card'
import { UseHomeStateReturn } from '@/features/media-maintenance/lib/hooks/use-home-state'

interface WeeklyScheduleSectionProps {
  homeState: UseHomeStateReturn
  categories: Array<{ id: string; name: string; icon: React.ReactNode }>
}

// 分类筛选策略
const categoryFilters = {
  anime: (title: string, notes: string) =>
    title.includes("动漫") || notes.includes("动漫"),
  tv: (title: string, notes: string, mediaType?: string) =>
    mediaType === "tv" &&
    !title.includes("动漫") && !notes.includes("动漫") &&
    !title.includes("综艺") && !notes.includes("综艺"),
  kids: (title: string, notes: string) =>
    title.includes("少儿") || notes.includes("少儿"),
  variety: (title: string, notes: string) =>
    title.includes("综艺") || notes.includes("综艺"),
  short: (title: string, notes: string) =>
    title.includes("短剧") || notes.includes("短剧"),
} as const;

export function WeeklyScheduleSection({ homeState, categories }: WeeklyScheduleSectionProps): JSX.Element {
  const { items, loading } = useData()

  function handleCardClick(itemId: string): void {
    const item = items.find(function(i: TMDBItem) {
      return i.id === itemId
    })

    if (item) {
      homeState.setSelectedItem(item)
    }
  }

  function filterItemsByCategory(itemsToFilter: TMDBItem[]): TMDBItem[] {
    if (homeState.selectedCategory === "all") {
      return itemsToFilter
    }

    return itemsToFilter.filter(function(item: TMDBItem) {
      if (item.category) {
        return item.category === homeState.selectedCategory
      }

      const title = item.title.toLowerCase()
      const notes = item.notes?.toLowerCase() || ""
      const category = homeState.selectedCategory as keyof typeof categoryFilters

      const filter = categoryFilters[category]
      if (!filter) {
        return true
      }

      if (category === 'tv') {
        return filter(title, notes, item.mediaType)
      }

      return filter(title, notes)
    })
  }

  function getItemsByDay(itemsToFilter: TMDBItem[], day: number): TMDBItem[] {
    return itemsToFilter.filter(function(item: TMDBItem) {
      return (
        item.weekday === day ||
        (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
      )
    })
  }

  function getFilteredItems(itemsToFilter: TMDBItem[]): TMDBItem[] {
    const filteredByCategory = filterItemsByCategory(itemsToFilter)

    if (homeState.selectedDayFilter === "recent") {
      const jsWeekday = new Date().getDay()

      function getDayDifference(targetWeekday: number): number {
        const safeTarget = targetWeekday % 7
        let diff = safeTarget - jsWeekday

        if (diff < 0) {
          diff += 7
        }

        return diff
      }

      function getNearestWeekday(item: TMDBItem): number {
        const primaryDiff = getDayDifference(item.weekday)

        if (typeof item.secondWeekday === 'number') {
          const secondDiff = getDayDifference(item.secondWeekday)
          return secondDiff < primaryDiff ? item.secondWeekday : item.weekday
        }

        return item.weekday
      }

      function isToday(item: TMDBItem): boolean {
        return item.weekday === jsWeekday || item.secondWeekday === jsWeekday
      }

      return filteredByCategory.sort(function(a, b) {
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()

        const aIsToday = isToday(a)
        const bIsToday = isToday(b)

        if (aIsToday !== bIsToday) {
          return aIsToday ? -1 : 1
        }

        if (aIsToday && bIsToday) {
          return timeB - timeA
        }

        const aDayDiff = getDayDifference(getNearestWeekday(a))
        const bDayDiff = getDayDifference(getNearestWeekday(b))

        if (aDayDiff !== bDayDiff) {
          return aDayDiff - bDayDiff
        }

        return timeB - timeA
      })
    }

    const filteredItems = getItemsByDay(filteredByCategory, homeState.selectedDayFilter)

    return filteredItems.sort(function(a, b) {
      const timeA = new Date(a.updatedAt).getTime()
      const timeB = new Date(b.updatedAt).getTime()
      return timeB - timeA
    })
  }

  const ongoingItems = items.filter((item) => item.status === "ongoing")
  const filteredItems = getFilteredItems(ongoingItems)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 周几导航 */}
      <WeekdayNavigation
        selectedDayFilter={homeState.selectedDayFilter}
        onDayFilterChange={homeState.setSelectedDayFilter}
        filteredItems={ongoingItems}
        categories={categories}
        selectedCategory={homeState.selectedCategory}
      />

      {/* 内容网格 */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="w-[99%] mx-auto transform scale-[0.99] origin-top-left">
              <MediaCard
                item={item}
                itemId={item.id}
                onItemClick={handleCardClick}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {homeState.selectedDayFilter === "recent" 
              ? "暂无最近更新的词条" 
              : "该日期暂无播出内容"
            }
          </p>
        </div>
      )}
    </div>
  )
}
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

export function WeeklyScheduleSection({ homeState, categories }: WeeklyScheduleSectionProps) {
  const { items, loading } = useData()

  // 根据分类筛选词条
  const filterItemsByCategory = (items: TMDBItem[]) => {
    if (homeState.selectedCategory === "all") return items

    return items.filter(item => {
      // 优先使用明确的分类
      if (item.category) {
        return item.category === homeState.selectedCategory
      }

      // 备用逻辑：使用关键词匹配
      const title = item.title.toLowerCase()
      const notes = item.notes?.toLowerCase() || ""
      const category = homeState.selectedCategory as keyof typeof categoryFilters

      const filter = categoryFilters[category]
      if (!filter) return true

      return category === 'tv'
        ? filter(title, notes, item.mediaType)
        : filter(title, notes)
    })
  }

  const getItemsByDay = (items: TMDBItem[], day: number) => {
    return items.filter((item) => 
      item.weekday === day || 
      (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
    )
  }

  const getFilteredItems = (items: TMDBItem[]) => {
    const filteredByCategory = filterItemsByCategory(items)
    
    if (homeState.selectedDayFilter === "recent") {
      // 获取当前JS的星期几（0=周日，1=周一，...，6=周六）
      const jsWeekday = new Date().getDay()

      // 计算到指定weekday的天数差（考虑循环）
      const getDayDifference = (targetWeekday: number) => {
        const safeTarget = targetWeekday % 7
        let diff = safeTarget - jsWeekday
        if (diff < 0) diff += 7
        return diff
      }

      // 获取条目距离今天最近的播出weekday
      const getNearestWeekday = (it: TMDBItem) => {
        const primaryDiff = getDayDifference(it.weekday)
        if (typeof it.secondWeekday === 'number') {
          const secondDiff = getDayDifference(it.secondWeekday)
          return secondDiff < primaryDiff ? it.secondWeekday : it.weekday
        }
        return it.weekday
      }

      // 判断是否为今天的播出日
      const isToday = (it: TMDBItem) => {
        return it.weekday === jsWeekday || it.secondWeekday === jsWeekday
      }

      return filteredByCategory.sort((a, b) => {
        // 获取更新时间
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        
        // 判断是否为今天的播出日
        const aIsToday = isToday(a)
        const bIsToday = isToday(b)
        
        // 第一优先级：今天的播出日
        if (aIsToday !== bIsToday) {
          return aIsToday ? -1 : 1
        }
        
        // 如果都是今天的内容，按更新时间排序
        if (aIsToday && bIsToday) {
          return timeB - timeA
        }
        
        // 第二优先级：按照未来最近的日期排序
        const aDayDiff = getDayDifference(getNearestWeekday(a))
        const bDayDiff = getDayDifference(getNearestWeekday(b))
        
        if (aDayDiff !== bDayDiff) {
          return aDayDiff - bDayDiff
        }

        // 最后按更新时间排序
        return timeB - timeA
      })
    } else {
      // 按指定日期筛选
      const filteredItems = getItemsByDay(filteredByCategory, homeState.selectedDayFilter)
      
      return filteredItems.sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        return timeB - timeA
      })
    }
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
                onClick={() => homeState.setSelectedItem(item)}
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
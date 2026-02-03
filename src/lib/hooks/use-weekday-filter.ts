"use client"

import { useMemo } from 'react'
import { TMDBItem } from '@/lib/data/storage'

export interface UseWeekdayFilterReturn {
  getItemsByDay: (items: TMDBItem[], day: number) => TMDBItem[]
  getFilteredItems: (
    items: TMDBItem[],
    selectedDayFilter: "recent" | number,
    selectedCategory: string
  ) => TMDBItem[]
}

export function useWeekdayFilter(): UseWeekdayFilterReturn {
  const getItemsByDay = useMemo(() => {
    return (items: TMDBItem[], day: number): TMDBItem[] => {
      return items.filter((item) =>
        // 主播出日匹配 或 第二播出日匹配（如果有）
        item.weekday === day ||
        (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
      )
    }
  }, [])

  const getFilteredItems = useMemo(() => {
    return (
      items: TMDBItem[],
      selectedDayFilter: "recent" | number,
      selectedCategory: string
    ): TMDBItem[] => {
      // 先按分类筛选
      let filteredItems = items
      if (selectedCategory !== "all") {
        filteredItems = items.filter(item => {
          if (item.category) {
            return item.category === selectedCategory
          }

          const title = item.title.toLowerCase()
          const notes = item.notes?.toLowerCase() || ""

          switch(selectedCategory) {
            case "anime":
              return title.includes("动漫") || notes.includes("动漫") ||
                     title.includes("anime") || notes.includes("anime")
            case "tv":
              return item.mediaType === "tv" &&
                     !title.includes("动漫") && !notes.includes("动漫") &&
                     !title.includes("综艺") && !notes.includes("综艺") &&
                     !title.includes("少儿") && !notes.includes("少儿") &&
                     !title.includes("短剧") && !notes.includes("短剧")
            case "kids":
              return title.includes("少儿") || notes.includes("少儿") ||
                     title.includes("儿童") || notes.includes("儿童")
            case "variety":
              return title.includes("综艺") || notes.includes("综艺")
            case "short":
              return title.includes("短剧") || notes.includes("短剧")
            default:
              return true
          }
        })
      }

      if (selectedDayFilter === "recent") {
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

        // 获取条目距离今天最近的播出weekday
        const isToday = (it: TMDBItem) => {
          return it.weekday === jsWeekday || it.secondWeekday === jsWeekday
        }

        return filteredItems.sort((a, b) => {
          // 获取更新时间
          const timeA = new Date(a.updatedAt).getTime()
          const timeB = new Date(b.updatedAt).getTime()

          // 判断是否为今天的播出日（周几）
          const aIsToday = isToday(a)
          const bIsToday = isToday(b)

          // 判断是否为每日更新内容，优先使用isDailyUpdate属性
          const aIsDailyUpdate = a.isDailyUpdate === true || (
            a.isDailyUpdate === undefined && (
              a.category === "tv" ||
              a.category === "short" ||
              (a.mediaType === "tv" &&
                (!a.category ||
                (a.category !== "anime" && a.category !== "kids" && a.category !== "variety")))
            )
          )

          const bIsDailyUpdate = b.isDailyUpdate === true || (
            b.isDailyUpdate === undefined && (
              b.category === "tv" ||
              b.category === "short" ||
              (b.mediaType === "tv" &&
                (!b.category ||
                (b.category !== "anime" && b.category !== "kids" && b.category !== "variety")))
            )
          )

          // 在"全部"分类下使用特殊的排序逻辑
          if (selectedCategory === "all") {
            // 第一优先级：当前日期的词条
            if (aIsToday !== bIsToday) {
              return aIsToday ? -1 : 1
            }

            // 如果都是当前日期的词条，则按内容类型和更新时间排序
            if (aIsToday && bIsToday) {
              if (aIsDailyUpdate !== bIsDailyUpdate) {
                return aIsDailyUpdate ? 1 : -1
              }
              return timeB - timeA
            }

            // 第二优先级：带每日更新标签的词条
            if (aIsDailyUpdate !== bIsDailyUpdate) {
              return aIsDailyUpdate ? -1 : 1
            }

            // 第三优先级：按照未来最近的日期排序
            const aDayDiff = getDayDifference(getNearestWeekday(a))
            const bDayDiff = getDayDifference(getNearestWeekday(b))

            if (aDayDiff !== bDayDiff) {
              return aDayDiff - bDayDiff
            }
          } else {
            // 其他分类使用相同的排序逻辑
            if (aIsToday !== bIsToday) {
              return aIsToday ? -1 : 1
            }

            if (aIsToday && bIsToday) {
              if (aIsDailyUpdate !== bIsDailyUpdate) {
                return aIsDailyUpdate ? 1 : -1
              }
              return timeB - timeA
            }

            if (aIsDailyUpdate !== bIsDailyUpdate) {
              return aIsDailyUpdate ? -1 : 1
            }

            const aDayDiff = getDayDifference(getNearestWeekday(a))
            const bDayDiff = getDayDifference(getNearestWeekday(b))

            if (aDayDiff !== bDayDiff) {
              return aDayDiff - bDayDiff
            }
          }

          // 最后优先级：更新时间的细微差异
          return timeB - timeA
        })
      } else {
        // 按指定日期筛选
        const dayItems = getItemsByDay(filteredItems, selectedDayFilter)

        // 获取当前JS的星期几（0=周日，1=周一，...，6=周六）
        const jsWeekday = new Date().getDay()

        // 对筛选后的内容进行排序
        return dayItems.sort((a, b) => {
          // 判断是否为每日更新内容
          const aIsDailyUpdate = a.isDailyUpdate === true || (
            a.isDailyUpdate === undefined && (
              a.category === "tv" ||
              a.category === "short" ||
              (a.mediaType === "tv" &&
                (!a.category ||
                (a.category !== "anime" && a.category !== "kids" && a.category !== "variety")))
            )
          )

          const bIsDailyUpdate = b.isDailyUpdate === true || (
            b.isDailyUpdate === undefined && (
              b.category === "tv" ||
              b.category === "short" ||
              (b.mediaType === "tv" &&
                (!b.category ||
                (b.category !== "anime" && b.category !== "kids" && b.category !== "variety")))
            )
          )

          // 优先显示每日更新内容
          if (aIsDailyUpdate !== bIsDailyUpdate) {
            return aIsDailyUpdate ? -1 : 1
          }

          // 如果都是每日更新内容或都不是每日更新内容，按更新时间排序
          const timeA = new Date(a.updatedAt).getTime()
          const timeB = new Date(b.updatedAt).getTime()
          return timeB - timeA
        })
      }
    }
  }, [getItemsByDay])

  return {
    getItemsByDay,
    getFilteredItems
  }
}
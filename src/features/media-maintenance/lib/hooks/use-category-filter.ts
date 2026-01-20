"use client"

import { useMemo } from 'react'
import { TMDBItem } from '@/lib/data/storage'
import { categories } from '@/lib/constants/categories'

export interface UseCategoryFilterReturn {
  categories: typeof categories
  filterItemsByCategory: (items: TMDBItem[], selectedCategory: string) => TMDBItem[]
}

export function useCategoryFilter(): UseCategoryFilterReturn {
  const filterItemsByCategory = useMemo(() => {
    return (items: TMDBItem[], selectedCategory: string): TMDBItem[] => {
      if (selectedCategory === "all") return items

      // 优先使用category字段筛选
      return items.filter(item => {
        // 如果有category字段，直接用它判断
        if (item.category) {
          return item.category === selectedCategory
        }

        // 没有category字段时，使用备用逻辑
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
  }, [])

  return {
    categories,
    filterItemsByCategory
  }
}
"use client"

import { TMDBItem } from '@/lib/data/storage'
import { categories } from "@/lib/constants/categories"

// Category matching patterns for better maintainability
const CATEGORY_PATTERNS = {
  anime: ["动漫", "anime"],
  kids: ["少儿", "儿童"],
  variety: ["综艺"],
  short: ["短剧"]
} as const

function matchesCategory(item: TMDBItem, category: string): boolean {
  // Prefer the category field if available
  if (item.category) {
    return item.category === category
  }

  // Special case for TV - must be TV type and not match other categories
  if (category === "tv") {
    if (item.mediaType !== "tv") return false

    const title = item.title.toLowerCase()
    const notes = item.notes?.toLowerCase() || ""

    // Exclude if matches any other category patterns
    return !Object.values(CATEGORY_PATTERNS).some(patterns =>
      patterns.some(keyword =>
        title.includes(keyword.toLowerCase()) ||
        notes.includes(keyword.toLowerCase())
      )
    )
  }

  // For other categories, check keyword patterns
  const patterns = CATEGORY_PATTERNS[category as keyof typeof CATEGORY_PATTERNS]
  if (!patterns) return true

  const title = item.title.toLowerCase()
  const notes = item.notes?.toLowerCase() || ""

  return patterns.some(keyword =>
    title.includes(keyword.toLowerCase()) ||
    notes.includes(keyword.toLowerCase())
  )
}

export function useCategoryFilter() {
  const filterItemsByCategory = (items: TMDBItem[], selectedCategory: string): TMDBItem[] => {
    if (selectedCategory === "all") return items

    return items.filter(item => matchesCategory(item, selectedCategory))
  }

  return {
    categories,
    filterItemsByCategory
  }
}
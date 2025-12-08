import { Platform, PlatformStats, PlatformCategory } from './types'

// 数据筛选和分类辅助函数
export function getPlatformsByCategory(platforms: Platform[], category: string): Platform[] {
  if (category === 'all') {
    return platforms
  }
  return platforms.filter(platform => platform.category === category)
}

export function getPopularPlatforms(platforms: Platform[]): Platform[] {
  return platforms.filter(platform => platform.popular)
}

export function getPlatformsByRegion(platforms: Platform[], region: string): Platform[] {
  return platforms.filter(platform => platform.region === region)
}

export function searchPlatforms(platforms: Platform[], query: string): Platform[] {
  const lowercaseQuery = query.toLowerCase()
  return platforms.filter(platform => 
    platform.name.toLowerCase().includes(lowercaseQuery) ||
    platform.description.toLowerCase().includes(lowercaseQuery) ||
    platform.region.toLowerCase().includes(lowercaseQuery)
  )
}

export function updateCategoryCounts(platforms: Platform[], categories: PlatformCategory[]): PlatformCategory[] {
  const updatedCategories = [...categories]
  
  updatedCategories[0].count = platforms.length // 全部
  updatedCategories[1].count = platforms.filter(p => p.category === '国际平台').length // 国际平台
  updatedCategories[2].count = platforms.filter(p => p.category === '国内平台').length // 国内平台
  
  return updatedCategories
}

export function getPlatformById(platforms: Platform[], id: string): Platform | undefined {
  return platforms.find(platform => platform.id === id)
}

// 按评分排序
export function getPlatformsByRating(platforms: Platform[], ascending: boolean = false): Platform[] {
  return [...platforms].sort((a, b) => 
    ascending ? a.rating - b.rating : b.rating - a.rating
  )
}

// 获取统计信息
export function getPlatformStats(platforms: Platform[]): PlatformStats {
  const total = platforms.length
  const international = platforms.filter(p => p.category === '国际平台').length
  const domestic = platforms.filter(p => p.category === '国内平台').length
  const popular = platforms.filter(p => p.popular).length
  
  const regions = [...new Set(platforms.map(p => p.region))]
  const regionStats = regions.map(region => ({
    region,
    count: platforms.filter(p => p.region === region).length
  }))
  
  return {
    total,
    international,
    domestic,
    popular,
    regions: regionStats
  }
}
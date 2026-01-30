import { Platform, PlatformStats, PlatformCategory } from './types'

// 搜索平台
export function searchPlatforms(platforms: Platform[], query: string): Platform[] {
  const lowercaseQuery = query.toLowerCase()
  return platforms.filter(platform =>
    platform.name.toLowerCase().includes(lowercaseQuery) ||
    platform.description.toLowerCase().includes(lowercaseQuery) ||
    platform.region.toLowerCase().includes(lowercaseQuery)
  )
}

// 更新分类计数
export function updateCategoryCounts(platforms: Platform[], categories: PlatformCategory[]): PlatformCategory[] {
  const updatedCategories = [...categories]

  // 更新全部计数
  updatedCategories[0].count = platforms.length

  // 更新各地区计数
  for (let i = 1; i < updatedCategories.length; i++) {
    const category = updatedCategories[i];
    category.count = platforms.filter(p => p.region === category.label).length;
  }

  return updatedCategories
}

// 根据ID获取平台
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
  const uniqueRegions = [...new Set(platforms.map(p => p.region))]
  const international = uniqueRegions.filter(r => r !== '中国大陆').length
  const domestic = platforms.filter(p => p.region === '中国大陆').length
  const popular = platforms.filter(p => p.popular).length

  const regions = uniqueRegions.map(region => ({
    region,
    count: platforms.filter(p => p.region === region).length
  }))

  return {
    total,
    international,
    domestic,
    popular,
    regions
  }
}

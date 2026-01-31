import { Platform, PlatformStats, PlatformCategory } from './types'

// 数据筛选和分类辅助函数
export function getPlatformsByCategory(platforms: Platform[], category: string): Platform[] {
  if (category === 'all') {
    return platforms
  }
  return platforms.filter(platform => platform.region === category)
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

// 获取所有唯一的地区
export function getUniqueRegions(platforms: Platform[]): string[] {
  return [...new Set(platforms.map(p => p.region))].sort((a, b) => {
    // 自定义排序：全球/中国大陆优先，其他按字母顺序
    if (a === '全球') return -1;
    if (b === '全球') return 1;
    if (a === '中国大陆') return -1;
    if (b === '中国大陆') return 1;
    return a.localeCompare(b, 'zh-CN');
  });
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

import { NextRequest, NextResponse } from 'next/server'
import { ServerConfigManager } from '@/lib/server-config-manager'

// TMDB API配置
const TMDB_API_BASE = 'https://api.tmdb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, keywords } = body

    if (!description && (!keywords || keywords.length === 0)) {
      return NextResponse.json(
        { error: '描述或关键词未提供' },
        { status: 400 }
      )
    }

    // 获取TMDB API密钥
    const config = ServerConfigManager.getConfig()
    const apiKey = config.tmdbApiKey || process.env.TMDB_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'TMDB API密钥未配置，请在设置中配置' },
        { status: 400 }
      )
    }

    // 构建搜索查询
    const searchQueries = buildSearchQueries(description, keywords)
    const allResults: any[] = []

    // 对每个查询进行搜索
    for (const query of searchQueries) {
      try {
        // 搜索电影
        const movieResults = await searchTMDB('movie', query, apiKey)
        allResults.push(...movieResults)

        // 搜索电视剧
        const tvResults = await searchTMDB('tv', query, apiKey)
        allResults.push(...tvResults)
      } catch (error) {
        console.error(`Search error for query "${query}":`, error)
        // 继续处理其他查询
      }
    }

    // 去重和排序
    const uniqueResults = deduplicateResults(allResults)
    const rankedResults = rankResults(uniqueResults, description, keywords)

    // 转换为统一格式
    const movies = rankedResults.map(result => ({
      id: `${result.media_type || 'movie'}-${result.id}`,
      title: result.title || result.name || '未知标题',
      originalTitle: result.original_title || result.original_name,
      poster: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : '/placeholder.jpg',
      rating: result.vote_average || 0,
      matchScore: result.matchScore || 0,
      year: extractYear(result.release_date || result.first_air_date),
      overview: result.overview || '暂无简介',
      source: 'tmdb' as const
    }))

    return NextResponse.json({
      success: true,
      movies: movies.slice(0, 20) // 限制返回结果数量
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { 
        error: '搜索失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 构建搜索查询
function buildSearchQueries(description: string, keywords: string[]): string[] {
  const queries: string[] = []

  // 从描述中提取可能的标题
  const titleMatches = description.match(/《([^》]+)》/g)
  if (titleMatches) {
    titleMatches.forEach(match => {
      const title = match.replace(/[《》]/g, '')
      queries.push(title)
    })
  }

  // 使用关键词组合
  if (keywords && keywords.length > 0) {
    // 单个关键词
    keywords.forEach(keyword => {
      if (keyword.length > 1) {
        queries.push(keyword)
      }
    })

    // 关键词组合
    if (keywords.length >= 2) {
      queries.push(keywords.slice(0, 3).join(' '))
    }
  }

  // 从描述中提取其他可能的搜索词
  const descriptionWords = extractSearchWords(description)
  descriptionWords.forEach(word => {
    if (word.length > 2 && !queries.includes(word)) {
      queries.push(word)
    }
  })

  // 如果没有找到任何查询词，使用描述的前几个词
  if (queries.length === 0) {
    const words = description.split(/\s+/).slice(0, 3)
    if (words.length > 0) {
      queries.push(words.join(' '))
    }
  }

  return queries.slice(0, 5) // 限制查询数量
}

// 从描述中提取搜索词
function extractSearchWords(description: string): string[] {
  const words: string[] = []
  
  // 提取可能的人名、地名、专有名词
  const properNouns = description.match(/[A-Z][a-z]+/g) || []
  words.push(...properNouns)

  // 提取中文词汇（简单分词）
  const chineseWords = description.match(/[\u4e00-\u9fa5]{2,}/g) || []
  words.push(...chineseWords)

  return words.filter(word => word.length >= 2)
}

// 搜索TMDB
async function searchTMDB(type: 'movie' | 'tv', query: string, apiKey: string) {
  const url = `${TMDB_API_BASE}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=zh-CN`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'TMDB-Helper/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }

  const data = await response.json()
  return data.results?.map((item: any) => ({
    ...item,
    media_type: type,
    searchQuery: query
  })) || []
}

// 去重结果
function deduplicateResults(results: any[]): any[] {
  const seen = new Set()
  return results.filter(result => {
    const key = `${result.media_type}-${result.id}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// 对结果进行排序和评分
function rankResults(results: any[], description: string, keywords: string[]): any[] {
  return results.map(result => {
    let matchScore = 0

    // 基础评分（基于TMDB评分和受欢迎程度）
    matchScore += (result.vote_average || 0) * 5
    matchScore += Math.log10((result.popularity || 1) + 1) * 10

    // 标题匹配评分
    const title = (result.title || result.name || '').toLowerCase()
    const originalTitle = (result.original_title || result.original_name || '').toLowerCase()
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      if (title.includes(keywordLower) || originalTitle.includes(keywordLower)) {
        matchScore += 20
      }
    })

    // 描述匹配评分
    const overview = (result.overview || '').toLowerCase()
    const descriptionLower = description.toLowerCase()
    
    // 简单的文本相似度评分
    const commonWords = extractCommonWords(descriptionLower, overview)
    matchScore += commonWords.length * 5

    // 年份匹配（如果描述中包含年份）
    const yearMatch = description.match(/(\d{4})/g)
    if (yearMatch) {
      const descYear = parseInt(yearMatch[0])
      const resultYear = extractYear(result.release_date || result.first_air_date)
      if (Math.abs(descYear - resultYear) <= 2) {
        matchScore += 15
      }
    }

    // 确保评分在0-100范围内
    matchScore = Math.min(100, Math.max(0, matchScore))

    return {
      ...result,
      matchScore
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
}

// 提取公共词汇
function extractCommonWords(text1: string, text2: string): string[] {
  const words1 = text1.split(/\s+/).filter(w => w.length > 2)
  const words2 = text2.split(/\s+/).filter(w => w.length > 2)
  
  return words1.filter(word => words2.includes(word))
}

// 提取年份
function extractYear(dateString?: string): number {
  if (!dateString) return new Date().getFullYear()
  
  const year = parseInt(dateString.substring(0, 4))
  return isNaN(year) ? new Date().getFullYear() : year
}
export type FeedKind = "upcoming" | "recent"

export interface FetchOpts {
  region: string
  language: string
}

interface MovieLike {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview: string
  vote_average: number
  popularity: number
  original_language: string
  genre_ids: number[]
}

interface TVLike {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string
  overview: string
  vote_average: number
  popularity: number
  original_language: string
  genre_ids: number[]
}

export interface FeedItem {
  id: number
  title: string
  posterPath: string | null
  releaseDate: string
  mediaType: "movie" | "tv"
  overview: string
  voteAverage: number
  popularity: number
  originalLanguage: string
  genreIds: number[]
  region: string
}

const BASE_URL = 'https://api.themoviedb.org/3'

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

const fetchTMDB = async (endpoint: string, params: Record<string, string>, apiKey: string): Promise<Response> => {
  const queryParams = new URLSearchParams({ api_key: apiKey, ...params }).toString()
  const url = `${BASE_URL}${endpoint}?${queryParams}`
  const res = await fetchWithTimeout(url, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "TMDB-Helper/1.0",
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    throw new Error(`API请求失败: ${res.status} ${res.statusText}`)
  }
  return res
}

function getDateRange(kind: FeedKind): { from: string; to: string } {
  const today = new Date()
  const formatDate = (date: Date): string => date.toISOString().split("T")[0]

  if (kind === "upcoming") {
    const from = formatDate(today)
    const later = new Date(today)
    later.setDate(today.getDate() + 30)
    const to = formatDate(later)
    return { from, to }
  } else {
    const ago = new Date(today)
    ago.setDate(today.getDate() - 30)
    const from = formatDate(ago)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const to = formatDate(yesterday)
    return { from, to }
  }
}

function shouldKeep(kind: FeedKind, dateStr: string): boolean {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const releaseTime = new Date(dateStr).getTime()

  if (kind === "upcoming") {
    return releaseTime >= todayStart.getTime()
  } else {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    return releaseTime >= thirtyDaysAgo.getTime() && releaseTime < todayStart.getTime()
  }
}

export async function fetchTmdbFeed(
  kind: FeedKind,
  opts: FetchOpts,
  apiKey: string
): Promise<{
  success: true
  results: FeedItem[]
  region: string
  language: string
  type: FeedKind
  timestamp: string
}> {
  const { region, language } = opts
  const { from, to } = getDateRange(kind)
  const regionStr = String(region)
  const langStr = String(language)

  // 检查是否需要中文内容
  const needsChineseContent = region === "CN" || region === "HK" || region === "TW"
  const chineseFilter = needsChineseContent ? { with_original_language: "zh" } : {}

  // 构建电影和电视节目的请求参数
  const baseParams = {
    language: langStr,
    "release_date.gte": from,
    "release_date.lte": to,
    page: "1",
    ...chineseFilter,
  }

  const movieParams: Record<string, string> = {
    ...baseParams,
    region: regionStr,
    sort_by: kind === "upcoming" ? "release_date.asc" : "release_date.desc",
  }

  const tvParams: Record<string, string> = {
    ...baseParams,
    sort_by: kind === "upcoming" ? "first_air_date.asc" : "first_air_date.desc",
    "first_air_date.gte": from,
    "first_air_date.lte": to,
  }

  try {
    // 串行请求以避免并发问题
    const [moviesResponse, tvShowsResponse] = await Promise.all([
      fetchTMDB("/discover/movie", movieParams, apiKey),
      fetchTMDB("/discover/tv", tvParams, apiKey),
    ])

    const [moviesData, tvShowsData] = await Promise.all([
      moviesResponse.json(),
      tvShowsResponse.json(),
    ])

    // 转换电影数据
    const movies: FeedItem[] = (moviesData.results as MovieLike[]).map((m) => ({
      id: m.id,
      title: m.title,
      posterPath: m.poster_path,
      releaseDate: m.release_date,
      mediaType: "movie" as const,
      overview: m.overview,
      voteAverage: m.vote_average,
      popularity: m.popularity,
      originalLanguage: m.original_language,
      genreIds: m.genre_ids,
      region: regionStr,
    }))

    // 转换电视节目数据
    const tvShows: FeedItem[] = (tvShowsData.results as TVLike[]).map((t) => ({
      id: t.id,
      title: t.name,
      posterPath: t.poster_path,
      releaseDate: t.first_air_date,
      mediaType: "tv" as const,
      overview: t.overview,
      voteAverage: t.vote_average,
      popularity: t.popularity,
      originalLanguage: t.original_language,
      genreIds: t.genre_ids,
      region: regionStr,
    }))

    // 合并、过滤和排序
    const combined = [...movies, ...tvShows]
      .filter((item) => shouldKeep(kind, item.releaseDate))
      .sort((a, b) => {
        const timeA = new Date(a.releaseDate).getTime()
        const timeB = new Date(b.releaseDate).getTime()
        return kind === "upcoming" ? timeA - timeB : timeB - timeA
      })

    return {
      success: true,
      results: combined,
      region: regionStr,
      language: langStr,
      type: kind,
      timestamp: new Date().toISOString(),
    }
  } catch (error: { message?: string }) {
    throw new Error(`TMDB API请求失败: ${error.message}`)
  }
}
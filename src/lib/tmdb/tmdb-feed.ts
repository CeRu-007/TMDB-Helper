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

const PRIMARY_BASE_URL = 'https://api.themoviedb.org/3'
const FALLBACK_BASE_URL = 'https://api.tmdb.org/3'

async function fetchTMDB(endpoint: string, params: Record<string, string>, apiKey: string): Promise<Response> {
  const queryParams = new URLSearchParams({ api_key: apiKey, ...params }).toString()
  const primaryUrl = `${PRIMARY_BASE_URL}${endpoint}?${queryParams}`
  
  try {
    const res = await fetch(primaryUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TMDB-Helper/1.0",
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      throw new Error(`API请求失败: ${res.status} ${res.statusText} - ${errorText}`)
    }
    return res
  } catch (primaryError) {
    // 主域名失败，尝试备用域名
    const fallbackUrl = `${FALLBACK_BASE_URL}${endpoint}?${queryParams}`
    const res = await fetch(fallbackUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TMDB-Helper/1.0",
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      throw new Error(`API请求失败: ${res.status} ${res.statusText} - ${errorText}`)
    }
    return res
  }
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

  const needsChineseContent = region === "CN" || region === "HK" || region === "TW"
  const chineseFilter = needsChineseContent ? { with_original_language: "zh" } : {}

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

  const moviesResponse = await fetchTMDB("/discover/movie", movieParams, apiKey)
  await new Promise(resolve => setTimeout(resolve, 100))
  const tvShowsResponse = await fetchTMDB("/discover/tv", tvParams, apiKey)

  const moviesData = await moviesResponse.json()
  const tvShowsData = await tvShowsResponse.json()

  if (!moviesData || !Array.isArray(moviesData.results)) {
    throw new Error(`电影API返回无效数据`)
  }
  if (!tvShowsData || !Array.isArray(tvShowsData.results)) {
    throw new Error(`电视节目API返回无效数据`)
  }

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
}

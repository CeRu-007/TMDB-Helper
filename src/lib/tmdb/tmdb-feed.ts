export type FeedKind = 'upcoming' | 'recent'

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
  mediaType: 'movie' | 'tv'
  overview: string
  voteAverage: number
  popularity: number
  originalLanguage: string
  genreIds: number[]
  region: string
}

const BASE_URL = 'https://api.themoviedb.org/3'

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
      next: { revalidate: 0 }
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

const fetchTMDB = async (
  endpoint: string,
  params: Record<string, string>,
  apiKey: string
) => {
  const queryParams = new URLSearchParams({ api_key: apiKey, ...params }).toString()
  const url = `${BASE_URL}${endpoint}?${queryParams}`
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TMDB-Helper/1.0',
        Accept: 'application/json'
      }
    }
  )
  if (!res.ok) {
    throw new Error(`API请求失败: ${res.status} ${res.statusText}`)
  }
  return res
}

function getDateRange(kind: FeedKind) {
  const today = new Date()
  if (kind === 'upcoming') {
    const from = today.toISOString().split('T')[0]
    const later = new Date()
    later.setDate(today.getDate() + 30)
    const to = later.toISOString().split('T')[0]
    return { from, to }
  } else {
    const ago = new Date()
    ago.setDate(today.getDate() - 30)
    const from = ago.toISOString().split('T')[0]
    const y = new Date()
    y.setDate(today.getDate() - 1)
    const to = y.toISOString().split('T')[0]
    return { from, to }
  }
}

function shouldKeep(kind: FeedKind, dateStr: string) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const releaseTime = new Date(dateStr).getTime()
  if (kind === 'upcoming') {
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
): Promise<{ success: true; results: FeedItem[]; region: string; language: string; type: FeedKind; timestamp: string }> {
  const { region, language } = opts
  const { from, to } = getDateRange(kind)
  const regionStr = String(region)
  const langStr = String(language)
  const fromStr = String(from)
  const toStr = String(to)

  const movieParams: Record<string, string> = {
    language: langStr,
    region: regionStr,
    sort_by: kind === 'upcoming' ? 'release_date.asc' : 'release_date.desc',
    'release_date.gte': fromStr,
    'release_date.lte': toStr,
    ...(region === 'CN' || region === 'HK' || region === 'TW' ? { with_original_language: 'zh' } : {}),
    page: '1'
  }

  const tvParams: Record<string, string> = {
    language: langStr,
    sort_by: kind === 'upcoming' ? 'first_air_date.asc' : 'first_air_date.desc',
    'first_air_date.gte': fromStr,
    'first_air_date.lte': toStr,
    // 修复：移除国家限制，避免过于严格的筛选条件导致API请求失败
    // 同时保留语言限制以获取中文内容
    ...(region === 'CN' || region === 'HK' || region === 'TW' ? { with_original_language: 'zh' } : {}),
    page: '1'
  }

  // 修改为串行请求，避免网络问题导致的并发错误
  try {
    const moviesResponse = await fetchTMDB('/discover/movie', movieParams, apiKey)
    const tvShowsResponse = await fetchTMDB('/discover/tv', tvParams, apiKey)

    const moviesData = await moviesResponse.json()
    const tvShowsData = await tvShowsResponse.json()

    const movies: FeedItem[] = (moviesData.results as MovieLike[]).map((m) => ({
      id: m.id,
      title: m.title,
      posterPath: m.poster_path,
      releaseDate: m.release_date,
      mediaType: 'movie',
      overview: m.overview,
      voteAverage: m.vote_average,
      popularity: m.popularity,
      originalLanguage: m.original_language,
      genreIds: m.genre_ids,
      region: regionStr
    }))

    const tvShows: FeedItem[] = (tvShowsData.results as TVLike[]).map((t) => ({
      id: t.id,
      title: t.name,
      posterPath: t.poster_path,
      releaseDate: t.first_air_date,
      mediaType: 'tv',
      overview: t.overview,
      voteAverage: t.vote_average,
      popularity: t.popularity,
      originalLanguage: t.original_language,
      genreIds: t.genre_ids,
      region: regionStr
    }))

    const combined = [...movies, ...tvShows]
      .filter((item) => shouldKeep(kind, item.releaseDate))
      .sort((a, b) =>
        kind === 'upcoming'
          ? new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
          : new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      )

    return {
      success: true,
      results: combined,
      region: regionStr,
      language: langStr,
      type: kind,
      timestamp: new Date().toISOString()
    }
  } catch (error: { message?: string }) {
    throw new Error(`TMDB API请求失败: ${error.message}`)
  }
}
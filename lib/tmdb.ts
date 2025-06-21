interface TMDBMovieResponse {
  id: number
  title: string
  poster_path: string | null
  homepage: string | null
  runtime: number | null
  release_date: string | null
  genres: Array<{
    id: number
    name: string
  }>
}

interface TMDBTVResponse {
  id: number
  name: string
  poster_path: string | null
  homepage: string | null
  number_of_episodes: number | null
  number_of_seasons: number | null
  first_air_date: string | null
  seasons: Array<{
    season_number: number
    name: string
    episode_count: number
    poster_path: string | null
  }>
  networks: Array<{
    name: string
    homepage: string | null
  }>
  genres: Array<{
    id: number
    name: string
  }>
}

export interface TMDBSeasonData {
  seasonNumber: number
  name: string
  totalEpisodes: number
  posterUrl?: string
}

export interface TMDBItemData {
  tmdbId: string
  title: string
  mediaType: "movie" | "tv"
  posterUrl?: string
  totalEpisodes?: number
  platformUrl?: string
  weekday?: number
  seasons?: TMDBSeasonData[]
  recommendedCategory?: "anime" | "tv" | "kids" | "variety" | "short" | "movie"
}

export class TMDBService {
  private static readonly BASE_URL = "https://api.themoviedb.org/3"
  private static readonly IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

  private static getApiKey(): string {
    const apiKey = localStorage.getItem("tmdb_api_key")
    if (!apiKey) {
      throw new Error("TMDB API密钥未设置，请在设置中配置")
    }
    return apiKey
  }

  static async getItemFromUrl(url: string): Promise<TMDBItemData | null> {
    try {
      const { mediaType, id } = this.parseUrl(url)
      if (!mediaType || !id) {
        throw new Error("无效的TMDB URL")
      }

      const apiKey = this.getApiKey()
      const endpoint = mediaType === "movie" ? "movie" : "tv"
      const response = await fetch(`${this.BASE_URL}/${endpoint}/${id}?api_key=${apiKey}&language=zh-CN`)

      if (!response.ok) {
        throw new Error("获取TMDB数据失败")
      }

      const data = await response.json()

      let platformUrl = ""
      let totalEpisodes = undefined
      let seasons: TMDBSeasonData[] = []
      let recommendedCategory: "anime" | "tv" | "kids" | "variety" | "short" | "movie" | undefined = undefined

      if (mediaType === "movie") {
        const movieData = data as TMDBMovieResponse
        platformUrl = movieData.homepage || ""

        // 计算首播日期的星期几
        let weekday = undefined
        const airDate = movieData.release_date
        if (airDate) {
          const date = new Date(airDate)
          // 保持 JS 原生的星期值格式（0=周日，1=周一）
          weekday = date.getDay()
        }
        
        // 初始化分类标志
        let isAnime = false;
        let isKids = false;
        
        // 检查各种类型标签
        if (movieData.genres && movieData.genres.length > 0) {
          // 检查是否是动画电影
          isAnime = movieData.genres.some(genre => 
            genre.name.toLowerCase().includes('animation') || 
            genre.name.toLowerCase().includes('动画'));
          
          // 检查是否是儿童电影
          isKids = movieData.genres.some(genre => 
            genre.name.toLowerCase().includes('family') || 
            genre.name.toLowerCase().includes('children') || 
            genre.name.toLowerCase().includes('儿童') ||
            genre.name.toLowerCase().includes('家庭'));
        }
        
        // 按照优先级确定分类
        if (isAnime) {
          recommendedCategory = "anime";
        } else if (isKids) {
          recommendedCategory = "kids";
        } else {
          // 默认为普通电影
          recommendedCategory = "movie";
        }

        return {
          tmdbId: id,
          title: movieData.title,
          mediaType,
          posterUrl: movieData.poster_path ? `${this.IMAGE_BASE_URL}${movieData.poster_path}` : undefined,
          platformUrl,
          weekday,
          recommendedCategory
        }
      } else {
        const tvData = data as TMDBTVResponse
        platformUrl = tvData.homepage || tvData.networks?.[0]?.homepage || ""
        totalEpisodes = tvData.number_of_episodes || undefined

        // 处理多季数据
        if (tvData.seasons && tvData.seasons.length > 0) {
          // 过滤掉第0季（通常是特别篇）和无效季
          const validSeasons = tvData.seasons.filter((season) => season.season_number > 0 && season.episode_count > 0)

          seasons = validSeasons.map((season) => ({
            seasonNumber: season.season_number,
            name: season.name || `第${season.season_number}季`,
            totalEpisodes: season.episode_count,
            posterUrl: season.poster_path ? `${this.IMAGE_BASE_URL}${season.poster_path}` : undefined,
          }))

          // 重新计算总集数（排除第0季）
          totalEpisodes = seasons.reduce((total, season) => total + season.totalEpisodes, 0)
        }

        // 计算首播日期的星期几
        let weekday = undefined
        const airDate = tvData.first_air_date
        if (airDate) {
          const date = new Date(airDate)
          // 保持 JS 原生的星期值格式（0=周日，1=周一）
          weekday = date.getDay()
        }
        
        // 初始化分类标志
        let isAnime = false;
        let isKids = false;
        let isVariety = false;
        
        // 检查各种类型标签
        if (tvData.genres && tvData.genres.length > 0) {
          // 检查是否是动画
          isAnime = tvData.genres.some(genre => 
            genre.name.toLowerCase().includes('animation') || 
            genre.name.toLowerCase().includes('动画') ||
            genre.name.toLowerCase().includes('anime'));
          
          // 检查是否是儿童节目
          isKids = tvData.genres.some(genre => 
            genre.name.toLowerCase().includes('family') || 
            genre.name.toLowerCase().includes('children') || 
            genre.name.toLowerCase().includes('儿童') ||
            genre.name.toLowerCase().includes('家庭'));
          
          // 检查是否是综艺/真人秀
          isVariety = tvData.genres.some(genre => 
            genre.name.toLowerCase().includes('reality') || 
            genre.name.toLowerCase().includes('talk') || 
            genre.name.toLowerCase().includes('真人秀') ||
            genre.name.toLowerCase().includes('综艺'));
        }
        
        // 按照优先级确定分类
        if (isAnime) {
          recommendedCategory = "anime";
        } else if (isVariety) {
          recommendedCategory = "variety";
        } else if (isKids) {
          recommendedCategory = "kids";
        } else {
          // 默认为普通电视剧
          recommendedCategory = "tv";
        }

        return {
          tmdbId: id,
          title: tvData.name,
          mediaType,
          posterUrl: tvData.poster_path ? `${this.IMAGE_BASE_URL}${tvData.poster_path}` : undefined,
          totalEpisodes,
          platformUrl,
          weekday,
          seasons: seasons.length > 0 ? seasons : undefined,
          recommendedCategory
        }
      }
    } catch (error) {
      console.error("TMDB API error:", error)
      throw error
    }
  }

  private static parseUrl(url: string): { mediaType: "movie" | "tv" | null; id: string | null } {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/").filter(Boolean)

      if (pathParts.length >= 2) {
        const mediaType = pathParts[0] === "movie" ? "movie" : pathParts[0] === "tv" ? "tv" : null
        const id = pathParts[1].split("-")[0]

        return { mediaType, id }
      }

      return { mediaType: null, id: null }
    } catch (error) {
      console.error("URL parsing error:", error)
      return { mediaType: null, id: null }
    }
  }
}

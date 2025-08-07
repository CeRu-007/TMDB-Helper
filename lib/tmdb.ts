import { tmdbNetworkOptimizer } from './network-optimizer';

interface TMDBMovieResponse {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  homepage: string | null
  runtime: number | null
  release_date: string | null
  vote_average: number | null
  overview: string | null
  genres: Array<{
    id: number
    name: string
  }>
}

// 添加获取电影图片的响应接口
interface TMDBMovieImagesResponse {
  id: number
  backdrops: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    vote_average: number
    vote_count: number
    width: number
  }>
  logos: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    file_type: string
    vote_average: number
    vote_count: number
    width: number
  }>
  posters: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    vote_average: number
    vote_count: number
    width: number
  }>
}

interface TMDBTVResponse {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  homepage: string | null
  number_of_episodes: number | null
  number_of_seasons: number | null
  first_air_date: string | null
  vote_average: number | null
  overview: string | null
  seasons: Array<{
    season_number: number
    name: string
    episode_count: number
    poster_path: string | null
  }>
  networks: Array<{
    id: number
    name: string
    logo_path: string | null
    homepage: string | null
  }>
  genres: Array<{
    id: number
    name: string
  }>
}

// 添加获取电视剧图片的响应接口
interface TMDBTVImagesResponse {
  id: number
  backdrops: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    vote_average: number
    vote_count: number
    width: number
  }>
  logos: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    file_type: string
    vote_average: number
    vote_count: number
    width: number
  }>
  posters: Array<{
    aspect_ratio: number
    height: number
    iso_639_1: string | null
    file_path: string
    vote_average: number
    vote_count: number
    width: number
  }>
}

export interface TMDBSeasonData {
  seasonNumber: number
  name: string
  totalEpisodes: number
  posterUrl?: string | undefined
}

export interface TMDBItemData {
  tmdbId: string
  title: string
  mediaType: "movie" | "tv"
  posterUrl?: string | undefined
  backdropUrl?: string | undefined
  backdropPath?: string | null | undefined
  logoUrl?: string | undefined  // 添加标志URL字段
  logoPath?: string | null | undefined  // 添加标志路径字段
  networkId?: number | undefined        // 添加网络ID
  networkName?: string | undefined      // 添加网络名称
  networkLogoUrl?: string | undefined   // 添加网络Logo URL
  totalEpisodes?: number | undefined
  platformUrl?: string | undefined
  weekday?: number | undefined
  seasons?: TMDBSeasonData[] | undefined
  recommendedCategory?: "anime" | "tv" | "kids" | "variety" | "short" | "movie" | undefined
  voteAverage?: number | null | undefined
  overview?: string | null | undefined
}

export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

export class TMDBService {
  // 使用备用域名以解决某些网络环境的连接问题
  private static readonly BASE_URL = "https://api.tmdb.org/3"
  private static readonly IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
  private static readonly BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"
  private static readonly BACKDROP_ORIGINAL_URL = "https://image.tmdb.org/t/p/original"
  private static readonly LOGO_BASE_URL = "https://image.tmdb.org/t/p/w300"  // 添加标志基础URL
  private static readonly NETWORK_LOGO_BASE_URL = "https://image.tmdb.org/t/p/w300" // 网络Logo基础URL
  private static readonly CACHE_PREFIX = "tmdb_backdrop_"
  private static readonly LOGO_CACHE_PREFIX = "tmdb_logo_"  // 标志缓存前缀
  private static readonly NETWORK_LOGO_CACHE_PREFIX = "tmdb_network_logo_"  // 网络标志缓存前缀
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24小时

  // 客户端版本 - 只在浏览器环境中使用
  private static async getApiKeyClient(): Promise<string> {
    const { ClientConfigManager } = await import('./client-config-manager');
    const apiKey = await ClientConfigManager.getItem("tmdb_api_key");
    if (!apiKey) {
      throw new Error("TMDB API密钥未设置，请在设置中配置");
    }
    return apiKey;
  }

  // 服务端版本 - 只在Node.js环境中使用
  private static async getApiKeyServer(): Promise<string> {
    const { ServerConfigManager } = await import('./server-config-manager');
    const config = ServerConfigManager.getConfig();
    const apiKey = config.tmdbApiKey || process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB API密钥未设置，请在设置中配置");
    }
    return apiKey;
  }

  // 主方法 - 根据环境选择合适的实现
  private static async getApiKey(): Promise<string> {
    try {
      if (typeof window !== 'undefined') {
        return await this.getApiKeyClient();
      } else {
        return await this.getApiKeyServer();
      }
    } catch (error) {
      console.error('获取TMDB API密钥失败:', error);
      throw new Error("TMDB API密钥未设置，请在设置中配置");
    }
  }

  // 缓存标志路径
  private static cacheLogoPath(mediaType: "movie" | "tv", id: string, logoPath: string): void {
    try {
      const cacheKey = `${this.LOGO_CACHE_PREFIX}${mediaType}_${id}`
      const cacheData = {
        path: logoPath,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn("缓存标志失败:", error)
      // 缓存失败不影响主要功能，只是记录警告
    }
  }

  // 获取缓存的标志路径
  private static getCachedLogoPath(mediaType: "movie" | "tv", id: string): string | null {
    try {
      const cacheKey = `${this.LOGO_CACHE_PREFIX}${mediaType}_${id}`
      const cachedData = localStorage.getItem(cacheKey)
      
      if (!cachedData) {
        return null
      }
      
      const { path, timestamp } = JSON.parse(cachedData)
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      return path
    } catch (error) {
      console.warn("获取缓存标志失败:", error)
      return null
    }
  }

  // 缓存网络logo路径
  private static cacheNetworkLogoPath(networkId: number, logoPath: string): void {
    try {
      const cacheKey = `${this.NETWORK_LOGO_CACHE_PREFIX}${networkId}`
      const cacheData = {
        path: logoPath,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn("缓存网络logo失败:", error)
    }
  }

  // 获取缓存的网络logo路径
  private static getCachedNetworkLogoPath(networkId: number): string | null {
    try {
      const cacheKey = `${this.NETWORK_LOGO_CACHE_PREFIX}${networkId}`
      const cachedData = localStorage.getItem(cacheKey)
      
      if (!cachedData) {
        return null
      }
      
      const { path, timestamp } = JSON.parse(cachedData)
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      return path
    } catch (error) {
      console.warn("获取缓存网络logo失败:", error)
      return null
    }
  }

  // 添加获取标志的方法，增加forceRefresh参数
  static async getItemLogoFromId(mediaType: "movie" | "tv", id: string, forceRefresh: boolean = false): Promise<{url: string | null, path: string | null}> {
    try {
      // 如果不是强制刷新，先尝试从缓存获取
      if (!forceRefresh) {
        const cachedLogoPath = this.getCachedLogoPath(mediaType, id)
        if (cachedLogoPath) {
          return {
            url: `${this.LOGO_BASE_URL}${cachedLogoPath}`,
            path: cachedLogoPath
          }
        }
      }

      const apiKey = await this.getApiKey()
      const endpoint = mediaType === "movie" ? "movie" : "tv"
      
      // 使用网络优化器进行请求
      try {
        const response = await fetch(`${this.BASE_URL}/${endpoint}/${id}/images?api_key=${apiKey}`);
        
        if (!response.ok) {
          throw new Error("获取TMDB图片数据失败")
        }

        const data = mediaType === "movie"
          ? (await response.json() as TMDBMovieImagesResponse)
          : (await response.json() as TMDBTVImagesResponse)

        // 优先获取中文标志，其次是英文标志，最后才是其他语言的标志
        const chineseLogo = data.logos.find(logo => logo.iso_639_1 === "zh" || logo.iso_639_1 === "zh-CN")
        const englishLogo = data.logos.find(logo => logo.iso_639_1 === "en")
        const nullLangLogo = data.logos.find(logo => logo.iso_639_1 === null) // 无语言标记的标志通常是通用的
        const firstLogo = data.logos[0]

        const logoPath = chineseLogo?.file_path || englishLogo?.file_path || nullLangLogo?.file_path || firstLogo?.file_path || null

        if (logoPath) {
          // 缓存标志路径
          this.cacheLogoPath(mediaType, id, logoPath)
          return {
            url: `${this.LOGO_BASE_URL}${logoPath}`,
            path: logoPath
          }
        }

        return { url: null, path: null }
      } catch (error) {
        console.error("网络请求失败，使用传统方式:", error)
        // 回退到传统fetch方式
        const response = await fetch(`${this.BASE_URL}/${endpoint}/${id}/images?api_key=${apiKey}`)
        
        if (!response.ok) {
          throw new Error("获取TMDB图片数据失败")
        }

        const data = mediaType === "movie"
          ? (await response.json() as TMDBMovieImagesResponse)
          : (await response.json() as TMDBTVImagesResponse)

        const chineseLogo = data.logos.find(logo => logo.iso_639_1 === "zh" || logo.iso_639_1 === "zh-CN")
        const englishLogo = data.logos.find(logo => logo.iso_639_1 === "en")
        const nullLangLogo = data.logos.find(logo => logo.iso_639_1 === null)
        const firstLogo = data.logos[0]

        const logoPath = chineseLogo?.file_path || englishLogo?.file_path || nullLangLogo?.file_path || firstLogo?.file_path || null

        if (logoPath) {
          this.cacheLogoPath(mediaType, id, logoPath)
          return {
            url: `${this.LOGO_BASE_URL}${logoPath}`,
            path: logoPath
          }
        }

        return { url: null, path: null }
      }
    } catch (error) {
      console.error("获取TMDB标志失败:", error)
      return { url: null, path: null }
    }
  }

  /**
   * 搜索电影和电视剧
   */
  static async search(query: string, page: number = 1): Promise<any> {
    try {
      const apiKey = await this.getApiKey()
      const url = `${this.BASE_URL}/search/multi?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(query)}&page=${page}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`TMDB搜索请求失败: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('TMDB搜索失败:', error)
      throw error
    }
  }

  static async getItemFromUrl(url: string, forceRefresh: boolean = false): Promise<TMDBItemData | null> {
    const startTime = performance.now();
    
    try {
      const { mediaType, id } = this.parseUrl(url)
      if (!mediaType || !id) {
        throw new Error("无效的TMDB URL")
      }

      const apiKey = await this.getApiKey()
      const endpoint = mediaType === "movie" ? "movie" : "tv"

      console.log(`[TMDBService] 获取项目数据: ${endpoint}/${id}`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log(`[TMDBService] 请求超时，中止请求`);
        controller.abort();
      }, 30000); // 30秒超时

      // 使用传统fetch方式（网络优化器可能还未完全集成）
      const response = await fetch(`${this.BASE_URL}/${endpoint}/${id}?api_key=${apiKey}&language=zh-CN`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeout);
      
      // 记录API响应时间
      const endTime = performance.now();
      try {
        const { PerformanceOptimizer } = await import('./performance-optimizer');
        PerformanceOptimizer.recordApiResponse(startTime, endTime);
      } catch (error) {
        console.warn('无法加载性能监控器:', error);
      }

      if (!response.ok) {
        console.error(`[TMDBService] API请求失败: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json()
      console.log(`[TMDBService] 获取到TMDB数据:`, { mediaType, id, title: data.title || data.name })

      let platformUrl = ""
      let totalEpisodes = undefined
      let seasons: TMDBSeasonData[] = []
      let recommendedCategory: "anime" | "tv" | "kids" | "variety" | "short" | "movie" | undefined = undefined

      // 获取标志，传入forceRefresh参数
      const logoData = await this.getItemLogoFromId(mediaType, id, forceRefresh)

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

          // 如果有背景图，缓存它
          if (movieData.backdrop_path) {
            this.cacheBackdropPath(id, movieData.backdrop_path);
          }

          return {
            tmdbId: id,
            title: movieData.title,
            mediaType,
            posterUrl: movieData.poster_path ? `${this.IMAGE_BASE_URL}${movieData.poster_path}` : undefined,
            backdropUrl: movieData.backdrop_path ? `${this.BACKDROP_BASE_URL}${movieData.backdrop_path}` : undefined,
            backdropPath: movieData.backdrop_path,
            logoUrl: logoData.url || undefined,  // 添加标志URL
            logoPath: logoData.path || undefined,  // 添加标志路径
            platformUrl,
            weekday,
            recommendedCategory,
            voteAverage: movieData.vote_average === null ? undefined : movieData.vote_average,
            overview: movieData.overview === null ? undefined : movieData.overview
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

          // 提取网络信息
          const primaryNetwork = tvData.networks && tvData.networks.length > 0 ? tvData.networks[0] : null
          const networkId = primaryNetwork?.id
          const networkName = primaryNetwork?.name
          const networkLogoPath = primaryNetwork?.logo_path
          const networkLogoUrl = networkLogoPath ? `${this.NETWORK_LOGO_BASE_URL}${networkLogoPath}` : undefined

          // 如果有网络logo，缓存它
          if (networkId && networkLogoPath) {
            this.cacheNetworkLogoPath(networkId, networkLogoPath)
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
              genre.name.toLowerCase().includes('anime') ||
              genre.name.toLowerCase().includes('动画'));

            // 检查是否是儿童节目
            isKids = tvData.genres.some(genre =>
              genre.name.toLowerCase().includes('family') ||
              genre.name.toLowerCase().includes('children') ||
              genre.name.toLowerCase().includes('kids') ||
              genre.name.toLowerCase().includes('儿童') ||
              genre.name.toLowerCase().includes('家庭'));

            // 检查是否是综艺节目
            isVariety = tvData.genres.some(genre =>
              genre.name.toLowerCase().includes('reality') ||
              genre.name.toLowerCase().includes('talk') ||
              genre.name.toLowerCase().includes('variety') ||
              genre.name.toLowerCase().includes('综艺') ||
              genre.name.toLowerCase().includes('脱口秀'));
          }

          // 按照优先级确定分类
          if (isAnime) {
            recommendedCategory = "anime";
          } else if (isKids) {
            recommendedCategory = "kids";
          } else if (isVariety) {
            recommendedCategory = "variety";
          } else {
            // 默认为普通电视剧
            recommendedCategory = "tv";
          }

          // 如果有背景图，缓存它
          if (tvData.backdrop_path) {
            this.cacheBackdropPath(id, tvData.backdrop_path);
          }

          return {
            tmdbId: id,
            title: tvData.name,
            mediaType,
            posterUrl: tvData.poster_path ? `${this.IMAGE_BASE_URL}${tvData.poster_path}` : undefined,
            backdropUrl: tvData.backdrop_path ? `${this.BACKDROP_BASE_URL}${tvData.backdrop_path}` : undefined,
            backdropPath: tvData.backdrop_path,
            logoUrl: logoData.url || undefined,
            logoPath: logoData.path || undefined,
            networkId: networkId,
            networkName: networkName,
            networkLogoUrl: networkLogoUrl,
            totalEpisodes,
            seasons,
            platformUrl,
            weekday,
            recommendedCategory,
            voteAverage: tvData.vote_average === null ? undefined : tvData.vote_average,
            overview: tvData.overview === null ? undefined : tvData.overview
          }
        }

    } catch (error) {
      console.error(`[TMDBService] 获取TMDB数据失败:`, error);
      return null;
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

  // 缓存背景图路径
  private static cacheBackdropPath(id: string, backdropPath: string): void {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cacheData = {
        path: backdropPath,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error("缓存背景图路径失败:", error);
    }
  }

  // 从缓存获取背景图路径
  static getCachedBackdropPath(id: string): string | null {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cacheData = localStorage.getItem(cacheKey);
      
      if (!cacheData) return null;
      
      const { path, timestamp } = JSON.parse(cacheData);
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return path;
    } catch (error) {
      console.error("获取缓存背景图路径失败:", error);
      return null;
    }
  }

  // 预加载背景图
  static preloadBackdrop(backdropPath: string | null | undefined, size: BackdropSize = 'w1280'): void {
    if (!backdropPath) return;
    
    const url = this.getBackdropUrl(backdropPath, size);
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }

  // 获取不同尺寸的背景图URL
  static getBackdropUrl(backdropPath: string | null | undefined, size: BackdropSize | 'small' | 'large' | 'original' = 'large', forceRefresh: boolean = false): string | undefined {
    if (!backdropPath) return undefined;
    
    // 处理旧的size枚举
    let sizeValue: BackdropSize;
    switch (size) {
      case 'small':
        sizeValue = 'w780';
        break;
      case 'large':
        sizeValue = 'w1280';
        break;
      case 'original':
        sizeValue = 'original';
        break;
      default:
        sizeValue = size as BackdropSize;
    }
    
    const baseUrl = `https://image.tmdb.org/t/p/${sizeValue}${backdropPath}`;
    
    // 如果强制刷新，添加时间戳参数
    if (forceRefresh) {
      const timestamp = Date.now();
      return `${baseUrl}?t=${timestamp}`;
    }
    
    return baseUrl;
  }

  // 获取网络logo
  static async getNetworkLogo(networkId: number, forceRefresh: boolean = false): Promise<string | null> {
    try {
      // 如果不是强制刷新，先尝试从缓存获取
      if (!forceRefresh) {
        const cachedLogoPath = this.getCachedNetworkLogoPath(networkId)
        if (cachedLogoPath) {
          return `${this.NETWORK_LOGO_BASE_URL}${cachedLogoPath}`
        }
      }

      const apiKey = await this.getApiKey()
      
      // 使用传统fetch方式
      const response = await fetch(`${this.BASE_URL}/network/${networkId}?api_key=${apiKey}`)

      if (!response.ok) {
        throw new Error("获取TMDB网络数据失败")
      }

      const data = await response.json()
      const logoPath = data.logo_path

      if (logoPath) {
        // 缓存logo路径
        this.cacheNetworkLogoPath(networkId, logoPath)
        return `${this.NETWORK_LOGO_BASE_URL}${logoPath}`
      }
      
      return null
    } catch (error) {
      console.error("获取网络logo失败:", error)
      return null
    }
  }
}
import { TMDB_API_KEY_FALLBACK } from '@/lib/constants/constants';

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
  mediaType: "tv"
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
  recommendedCategory?: "anime" | "tv" | "kids" | "variety" | "short" | undefined
  voteAverage?: number | null | undefined
  overview?: string | null | undefined
}

export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

export class TMDBService {
  // 双域名配置：主域名和备用域名
  private static readonly PRIMARY_BASE_URL = "https://api.themoviedb.org/3"
  private static readonly FALLBACK_BASE_URL = "https://api.tmdb.org/3"
  // 直接使用TMDB的原始URL，不再使用代理
  private static readonly IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
  private static readonly BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"
  
  private static readonly LOGO_BASE_URL = "https://image.tmdb.org/t/p/w300"  // 添加标志基础URL
  private static readonly NETWORK_LOGO_BASE_URL = "https://image.tmdb.org/t/p/w300" // 网络Logo基础URL

  private static async getApiKey(): Promise<string> {
    return process.env.TMDB_API_KEY || TMDB_API_KEY_FALLBACK;
  }

  private static async fetchWithFallback(urlPath: string, options?: RequestInit): Promise<Response> {
    const apiKey = await this.getApiKey();
    const fullUrlPath = `${urlPath}${urlPath.includes('?') ? '&' : '?'}api_key=${apiKey}`;
    const primaryUrl = `${this.PRIMARY_BASE_URL}${fullUrlPath}`;
    
    try {
      return await fetch(primaryUrl, {
        ...options,
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          'Accept': 'application/json',
          ...options?.headers,
        }
      });
    } catch {
      const fallbackUrl = `${this.FALLBACK_BASE_URL}${fullUrlPath}`;
      return fetch(fallbackUrl, {
        ...options,
        headers: {
          'User-Agent': 'TMDB-Helper/1.0',
          'Accept': 'application/json',
          ...options?.headers,
        }
      });
    }
  }

  /**
   * 获取 Logo 路径
   * 注意：缓存逻辑已迁移到 imageCacheService，此方法仅返回原始路径
   */
  static async getItemLogoFromId(
    mediaType: "movie" | "tv",
    id: string
  ): Promise<{ url: string | null; path: string | null }> {
    try {
      const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
      const response = await this.fetchWithFallback(`/${endpoint}/${id}/images`);

      if (!response.ok) {
        throw new Error('获取TMDB图片数据失败');
      }

      const data = (await response.json()) as TMDBTVImagesResponse;

      // 优先获取中文标志，其次是英文标志，最后才是其他语言的标志
      const chineseLogo = data.logos.find(
        (logo) => logo.iso_639_1 === 'zh' || logo.iso_639_1 === 'zh-CN'
      );
      const englishLogo = data.logos.find((logo) => logo.iso_639_1 === 'en');
      const nullLangLogo = data.logos.find((logo) => logo.iso_639_1 === null);
      const firstLogo = data.logos[0];

      const logoPath =
        chineseLogo?.file_path ||
        englishLogo?.file_path ||
        nullLangLogo?.file_path ||
        firstLogo?.file_path ||
        null;

      return {
        url: null,
        path: logoPath,
      };
    } catch (error) {
      return { url: null, path: null };
    }
  }

  /**
   * 搜索电视剧
   */
  static async search(query: string, page: number = 1): Promise<any> {
    try {
      const response = await this.fetchWithFallback(
        `/search/multi?language=zh-CN&query=${encodeURIComponent(query)}&page=${page}&include_adult=true`
      );

      if (!response.ok) {
        throw new Error(`TMDB搜索请求失败: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
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

      const endpoint = "tv"

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 30000); // 30秒超时

      // 使用带备用域名的fetch
      const response = await this.fetchWithFallback(`/${endpoint}/${id}?language=zh-CN`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      
      // 记录API响应时间
      const endTime = performance.now();
      try {
        const { PerformanceOptimizer } = await import('../utils/performance-optimizer');
        PerformanceOptimizer.recordApiResponse(startTime, endTime);
      } catch (error) {
        // 忽略性能记录错误
      }

      if (!response.ok) {
        return null;
      }

      const data = await response.json()
      
      let platformUrl = ""
      let totalEpisodes = undefined
      let seasons: TMDBSeasonData[] = []
      let recommendedCategory: "anime" | "tv" | "kids" | "variety" | "short" | undefined = undefined

      // 获取标志，传入forceRefresh参数
      const logoData = await this.getItemLogoFromId(mediaType, id)

      // 只支持电视剧类型
      if (mediaType !== "tv") {
        return null
      }
      
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

      return {
        tmdbId: id,
        title: tvData.name,
        mediaType,
        posterUrl: tvData.poster_path ? `${this.IMAGE_BASE_URL}${tvData.poster_path}` : undefined,
        backdropUrl: tvData.backdrop_path ? `${this.BACKDROP_BASE_URL}${tvData.backdrop_path}` : undefined,
        backdropPath: tvData.backdrop_path,
        logoUrl: logoData.path ? `${this.LOGO_BASE_URL}${logoData.path}` : undefined,  // 添加标志URL
        logoPath: logoData.path || undefined,  // 添加标志路径
        platformUrl,
        weekday,
        totalEpisodes,
        seasons,
        recommendedCategory,
        networkId,
        networkName,
        networkLogoUrl,
        voteAverage: tvData.vote_average === null ? undefined : tvData.vote_average,
        overview: tvData.overview === null ? undefined : tvData.overview
      }
    } catch (error) {
      return null;
    }
  }

  private static parseUrl(url: string): { mediaType: "tv" | null; id: string | null } {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/").filter(Boolean)

      if (pathParts.length >= 2) {
        const mediaType: "tv" | null = pathParts[0] === "tv" ? "tv" : null
        const second = pathParts[1]
        if (!second) return { mediaType: null, id: null }
        const id = (second.split("-")[0] ?? null)
        return { mediaType, id }
      }

      return { mediaType: null, id: null }
    } catch (error) {
      return { mediaType: null, id: null }
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
    
    // 使用类中定义的基础URL
    let baseUrl;
    switch (sizeValue) {
      case 'w300':
      case 'w780':
        baseUrl = `${this.IMAGE_BASE_URL.replace('w500', sizeValue)}${backdropPath}`;
        break;
      case 'w1280':
        baseUrl = `${this.BACKDROP_BASE_URL}${backdropPath}`;
        break;
      case 'original':
        baseUrl = `https://image.tmdb.org/t/p/original${backdropPath}`;
        break;
      default:
        baseUrl = `${this.BACKDROP_BASE_URL}${backdropPath}`;
    }
    
    // 如果强制刷新，添加时间戳参数
    if (forceRefresh) {
      const timestamp = Date.now();
      return `${baseUrl}?t=${timestamp}`;
    }
    
    return baseUrl;
  }

  /**
   * 获取网络 Logo
   * 注意：缓存逻辑已迁移到 imageCacheService
   */
  static async getNetworkLogo(networkId: number): Promise<string | null> {
    try {
      const response = await this.fetchWithFallback(`/network/${networkId}`);

      if (!response.ok) {
        throw new Error('获取TMDB网络数据失败');
      }

      const data = await response.json();
      const logoPath = data.logo_path;

      if (logoPath) {
        return `${this.NETWORK_LOGO_BASE_URL}${logoPath}`;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

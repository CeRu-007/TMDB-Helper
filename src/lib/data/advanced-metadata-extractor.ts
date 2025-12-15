// 高级元数据提取器 - 参考 TMDB-Import 项目的实现思路
export interface AdvancedExtractedMetadata {
  // 基本信息
  title: string;
  originalTitle?: string;
  description?: string;
  year?: number;
  releaseDate?: string;
  endDate?: string;

  // 分类信息
  genre?: string[];
  tags?: string[];
  keywords?: string[];

  // 人员信息
  director?: string[];
  writer?: string[];
  producer?: string[];
  cast?: Array<{
    name: string;
    character?: string;
    order?: number;
  }>;

  // 技术信息
  duration?: number;
  language?: string[];
  country?: string[];
  network?: string[];
  studio?: string[];

  // 评分和统计
  rating?: {
    value: number;
    scale: number;
    source: string;
    count?: number;
  }[];

  // 剧集信息
  episodeCount?: number;
  seasonCount?: number;
  seasons?: Array<{
    number: number;
    name: string;
    episodeCount: number;
    airDate?: string;
  }>;

  // 图片资源
  images?: {
    poster?: string[];
    backdrop?: string[];
    logo?: string[];
    still?: string[];
  };

  // 视频资源
  trailers?: Array<{
    name: string;
    url: string;
    type: 'trailer' | 'teaser' | 'clip';
    quality?: string;
  }>;

  // 状态信息
  status?: 'ongoing' | 'completed' | 'cancelled' | 'upcoming';
  airTime?: {
    day: number;
    time: string;
    timezone?: string;
  };

  // 外部链接
  externalIds?: {
    imdb?: string;
    tmdb?: string;
    tvdb?: string;
    douban?: string;
  };

  // 平台特定信息
  platformSpecific?: {
    [platform: string]: any;
  };
}

export interface ExtractionConfig {
  useSelenium?: boolean;
  waitForDynamic?: boolean;
  extractImages?: boolean;
  extractTrailers?: boolean;
  extractCast?: boolean;
  maxRetries?: number;
  timeout?: number;
  userAgent?: string;
  proxy?: string;
}

export class AdvancedMetadataExtractor {
  private static readonly DEFAULT_CONFIG: ExtractionConfig = {
    useSelenium: false,
    waitForDynamic: true,
    extractImages: true,
    extractTrailers: true,
    extractCast: true,
    maxRetries: 3,
    timeout: 30000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  static async extractFromUrl(
    url: string,
    config: ExtractionConfig = {},
  ): Promise<{
    success: boolean;
    metadata?: AdvancedExtractedMetadata;
    error?: string;
    source: string;
    confidence: number;
    extractionTime: number;
  }> {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      const platform = this.detectPlatform(url);

      // 调用后端API进行高级提取
      const response = await fetch('/api/advanced-extract-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          platform,
          config: finalConfig,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const extractionTime = Date.now() - startTime;

      return {
        success: true,
        metadata: result.metadata,
        source: platform,
        confidence: result.confidence || 0.5,
        extractionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        source: this.detectPlatform(url),
        confidence: 0,
        extractionTime: Date.now() - startTime,
      };
    }
  }

  private static detectPlatform(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase();

    // 扩展平台检测
    const platformMap: Record<string, string> = {
      'netflix.com': 'netflix',
      'primevideo.com': 'prime',
      'amazon.com': 'prime',
      'amazon.cn': 'prime',
      'disneyplus.com': 'disney',
      'hulu.com': 'hulu',
      'hbomax.com': 'hbo',
      'max.com': 'hbo',
      'tv.apple.com': 'apple',
      'paramountplus.com': 'paramount',
      'peacocktv.com': 'peacock',
      'crunchyroll.com': 'crunchyroll',
      'funimation.com': 'funimation',
      'bilibili.com': 'bilibili',
      'iqiyi.com': 'iqiyi',
      'youku.com': 'youku',
      'v.qq.com': 'tencent',
      'mgtv.com': 'mango',
      'douban.com': 'douban',
      'imdb.com': 'imdb',
      'themoviedb.org': 'tmdb',
      'thetvdb.com': 'tvdb',
    };

    for (const [domain, platform] of Object.entries(platformMap)) {
      if (hostname.includes(domain)) {
        return platform;
      }
    }

    return 'generic';
  }

  // 计算高级置信度评分
  static calculateAdvancedConfidence(
    metadata: AdvancedExtractedMetadata,
  ): number {
    let score = 0;
    let maxScore = 0;

    // 基本信息权重
    const basicFields = [
      { field: 'title', weight: 0.2 },
      { field: 'description', weight: 0.15 },
      { field: 'year', weight: 0.1 },
      { field: 'genre', weight: 0.1 },
    ];

    basicFields.forEach(({ field, weight }) => {
      maxScore += weight;
      const value = metadata[field as keyof AdvancedExtractedMetadata];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        score += weight;
      }
    });

    // 人员信息权重
    if (metadata.director && metadata.director.length > 0) {
      score += 0.1;
    }
    if (metadata.cast && metadata.cast.length > 0) {
      score += 0.1;
    }
    maxScore += 0.2;

    // 技术信息权重
    if (metadata.duration) score += 0.05;
    if (metadata.language && metadata.language.length > 0) score += 0.05;
    if (metadata.country && metadata.country.length > 0) score += 0.05;
    maxScore += 0.15;

    // 图片资源权重
    if (metadata.images?.poster && metadata.images.poster.length > 0)
      score += 0.05;
    if (metadata.images?.backdrop && metadata.images.backdrop.length > 0)
      score += 0.05;
    maxScore += 0.1;

    // 评分信息权重
    if (metadata.rating && metadata.rating.length > 0) score += 0.1;
    maxScore += 0.1;

    return Math.min(score / maxScore, 1);
  }

  // 格式化高级元数据
  static formatAdvancedMetadata(metadata: AdvancedExtractedMetadata): string {
    const lines: string[] = [];

    // 基本信息
    if (metadata.title) lines.push(`标题: ${metadata.title}`);
    if (metadata.originalTitle && metadata.originalTitle !== metadata.title) {
      lines.push(`原标题: ${metadata.originalTitle}`);
    }
    if (metadata.year) lines.push(`年份: ${metadata.year}`);
    if (metadata.releaseDate) lines.push(`上映日期: ${metadata.releaseDate}`);
    if (metadata.endDate) lines.push(`完结日期: ${metadata.endDate}`);

    // 分类信息
    if (metadata.genre && metadata.genre.length > 0) {
      lines.push(`类型: ${metadata.genre.join(', ')}`);
    }
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`标签: ${metadata.tags.join(', ')}`);
    }

    // 人员信息
    if (metadata.director && metadata.director.length > 0) {
      lines.push(`导演: ${metadata.director.join(', ')}`);
    }
    if (metadata.writer && metadata.writer.length > 0) {
      lines.push(`编剧: ${metadata.writer.join(', ')}`);
    }
    if (metadata.cast && metadata.cast.length > 0) {
      const castNames = metadata.cast
        .slice(0, 10)
        .map((c) => (c.character ? `${c.name}(${c.character})` : c.name));
      lines.push(`主演: ${castNames.join(', ')}`);
    }

    // 技术信息
    if (metadata.duration) lines.push(`时长: ${metadata.duration}分钟`);
    if (metadata.language && metadata.language.length > 0) {
      lines.push(`语言: ${metadata.language.join(', ')}`);
    }
    if (metadata.country && metadata.country.length > 0) {
      lines.push(`国家/地区: ${metadata.country.join(', ')}`);
    }
    if (metadata.network && metadata.network.length > 0) {
      lines.push(`播出平台: ${metadata.network.join(', ')}`);
    }

    // 剧集信息
    if (metadata.episodeCount) lines.push(`总集数: ${metadata.episodeCount}`);
    if (metadata.seasonCount) lines.push(`季数: ${metadata.seasonCount}`);

    // 评分信息
    if (metadata.rating && metadata.rating.length > 0) {
      const ratings = metadata.rating.map(
        (r) =>
          `${r.source}: ${r.value}/${r.scale}${r.count ? ` (${r.count}人评价)` : ''}`,
      );
      lines.push(`评分: ${ratings.join(', ')}`);
    }

    // 状态信息
    if (metadata.status) {
      const statusMap: Record<string, string> = {
        ongoing: '连载中',
        completed: '已完结',
        cancelled: '已取消',
        upcoming: '即将播出',
      };
      lines.push(`状态: ${statusMap[metadata.status] || metadata.status}`);
    }

    // 播出时间
    if (metadata.airTime) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      lines.push(
        `播出时间: ${weekdays[metadata.airTime.day]} ${metadata.airTime.time}`,
      );
    }

    // 外部ID
    if (metadata.externalIds) {
      const ids = [];
      if (metadata.externalIds.imdb)
        ids.push(`IMDb: ${metadata.externalIds.imdb}`);
      if (metadata.externalIds.tmdb)
        ids.push(`TMDB: ${metadata.externalIds.tmdb}`);
      if (metadata.externalIds.douban)
        ids.push(`豆瓣: ${metadata.externalIds.douban}`);
      if (ids.length > 0) lines.push(`外部ID: ${ids.join(', ')}`);
    }

    // 剧情简介
    if (metadata.description) {
      lines.push('');
      lines.push('剧情简介:');
      lines.push(metadata.description);
    }

    return lines.join('\n');
  }

  // 合并多个来源的元数据
  static mergeMetadata(
    sources: AdvancedExtractedMetadata[],
  ): AdvancedExtractedMetadata {
    if (sources.length === 0) return {};
    if (sources.length === 1) return sources[0];

    const merged: AdvancedExtractedMetadata = {};

    // 合并基本字段（优先选择最完整的）
    const basicFields = [
      'title',
      'originalTitle',
      'description',
      'year',
      'releaseDate',
      'endDate',
      'status',
    ];
    basicFields.forEach((field) => {
      const values = sources
        .map((s) => s[field as keyof AdvancedExtractedMetadata])
        .filter(Boolean);
      if (values.length > 0) {
        merged[field as keyof AdvancedExtractedMetadata] = values[0] as any;
      }
    });

    // 合并数组字段（去重合并）
    const arrayFields = [
      'genre',
      'tags',
      'keywords',
      'director',
      'writer',
      'producer',
      'language',
      'country',
      'network',
      'studio',
    ];
    arrayFields.forEach((field) => {
      const allValues = sources.flatMap(
        (s) => (s[field as keyof AdvancedExtractedMetadata] as string[]) || [],
      );
      const uniqueValues = [...new Set(allValues)];
      if (uniqueValues.length > 0) {
        merged[field as keyof AdvancedExtractedMetadata] = uniqueValues as any;
      }
    });

    // 合并演员信息
    const allCast = sources.flatMap((s) => s.cast || []);
    const uniqueCast = allCast.filter(
      (cast, index, self) =>
        index === self.findIndex((c) => c.name === cast.name),
    );
    if (uniqueCast.length > 0) {
      merged.cast = uniqueCast.sort(
        (a, b) => (a.order || 999) - (b.order || 999),
      );
    }

    // 合并评分信息
    const allRatings = sources.flatMap((s) => s.rating || []);
    const uniqueRatings = allRatings.filter(
      (rating, index, self) =>
        index === self.findIndex((r) => r.source === rating.source),
    );
    if (uniqueRatings.length > 0) {
      merged.rating = uniqueRatings;
    }

    // 合并图片资源
    const allImages = sources.map((s) => s.images).filter(Boolean);
    if (allImages.length > 0) {
      merged.images = {
        poster: [...new Set(allImages.flatMap((img) => img?.poster || []))],
        backdrop: [...new Set(allImages.flatMap((img) => img?.backdrop || []))],
        logo: [...new Set(allImages.flatMap((img) => img?.logo || []))],
        still: [...new Set(allImages.flatMap((img) => img?.still || []))],
      };
    }

    // 合并预告片
    const allTrailers = sources.flatMap((s) => s.trailers || []);
    const uniqueTrailers = allTrailers.filter(
      (trailer, index, self) =>
        index === self.findIndex((t) => t.url === trailer.url),
    );
    if (uniqueTrailers.length > 0) {
      merged.trailers = uniqueTrailers;
    }

    // 合并外部ID
    const allExternalIds = sources.map((s) => s.externalIds).filter(Boolean);
    if (allExternalIds.length > 0) {
      merged.externalIds = Object.assign({}, ...allExternalIds);
    }

    // 选择最大的数值字段
    const numericFields = ['duration', 'episodeCount', 'seasonCount'];
    numericFields.forEach((field) => {
      const values = sources
        .map((s) => s[field as keyof AdvancedExtractedMetadata] as number)
        .filter(Boolean);
      if (values.length > 0) {
        merged[field as keyof AdvancedExtractedMetadata] = Math.max(
          ...values,
        ) as any;
      }
    });

    return merged;
  }
}

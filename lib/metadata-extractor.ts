export interface ExtractedMetadata {
  title: string
  originalTitle?: string
  description?: string
  year?: number
  genre?: string[]
  director?: string[]
  cast?: string[]
  duration?: number
  rating?: number
  posterUrl?: string
  backdropUrl?: string
  trailerUrl?: string
  language?: string
  country?: string
  network?: string
  episodeCount?: number
  seasonCount?: number
  status?: string
  airDate?: string
  endDate?: string
}

export interface MetadataExtractionResult {
  success: boolean
  metadata?: ExtractedMetadata
  error?: string
  source: string
  confidence: number // 添加置信度评分
}

export class MetadataExtractor {
  // 检测平台类型
  static detectPlatform(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname.includes("netflix.com")) return "netflix"
    if (hostname.includes("primevideo.com") || hostname.includes("amazon.")) return "prime"
    if (hostname.includes("disneyplus.com")) return "disney"
    if (hostname.includes("hulu.com")) return "hulu"
    if (hostname.includes("hbo.com") || hostname.includes("max.com")) return "hbo"
    if (hostname.includes("apple.com")) return "apple"
    if (hostname.includes("paramount.com")) return "paramount"
    if (hostname.includes("peacocktv.com")) return "peacock"
    if (hostname.includes("crunchyroll.com")) return "crunchyroll"
    if (hostname.includes("funimation.com")) return "funimation"
    if (hostname.includes("bilibili.com")) return "bilibili"
    if (hostname.includes("iqiyi.com")) return "iqiyi"
    if (hostname.includes("youku.com")) return "youku"
    if (hostname.includes("qq.com")) return "tencent"
    if (hostname.includes("mgtv.com")) return "mango"

    return "generic"
  }

  // 从URL提取元数据
  static async extractFromUrl(url: string): Promise<MetadataExtractionResult> {
    try {
      const platform = this.detectPlatform(url)

      // 调用后端API进行元数据提取
      const response = await fetch("/api/extract-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, platform }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      return {
        success: true,
        metadata: result.metadata,
        source: platform,
        confidence: result.confidence || 0.5,
      }
    } catch (error) {
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
        source: this.detectPlatform(url),
        confidence: 0,
      }
    }
  }

  // 构建TMDB上传URL
  static buildTMDBUploadUrl(metadata: ExtractedMetadata, tmdbId?: string): string {
    const baseUrl = "https://www.themoviedb.org"

    // 如果有TMDB ID，直接跳转到编辑页面
    if (tmdbId) {
      return `${baseUrl}/movie/${tmdbId}/edit?tab=images`
    }

    // 否则跳转到新建页面并预填数据
    const params = new URLSearchParams()

    if (metadata.title) params.set("title", metadata.title)
    if (metadata.originalTitle) params.set("original_title", metadata.originalTitle)
    if (metadata.description) params.set("overview", metadata.description)
    if (metadata.year) params.set("release_date", `${metadata.year}-01-01`)
    if (metadata.language) params.set("original_language", metadata.language)
    if (metadata.posterUrl) params.set("poster_url", metadata.posterUrl)
    if (metadata.backdropUrl) params.set("backdrop_url", metadata.backdropUrl)
    if (metadata.trailerUrl) params.set("trailer_url", metadata.trailerUrl)

    // 根据是否有集数判断是电影还是电视剧
    const mediaType = metadata.episodeCount ? "tv" : "movie"

    return `${baseUrl}/${mediaType}/new?${params.toString()}`
  }

  // 格式化元数据为可读格式
  static formatMetadata(metadata: ExtractedMetadata): string {
    const lines: string[] = []

    if (metadata.title) lines.push(`标题: ${metadata.title}`)
    if (metadata.originalTitle && metadata.originalTitle !== metadata.title) {
      lines.push(`原标题: ${metadata.originalTitle}`)
    }
    if (metadata.year) lines.push(`年份: ${metadata.year}`)
    if (metadata.genre && metadata.genre.length > 0) {
      lines.push(`类型: ${metadata.genre.join(", ")}`)
    }
    if (metadata.director && metadata.director.length > 0) {
      lines.push(`导演: ${metadata.director.join(", ")}`)
    }
    if (metadata.cast && metadata.cast.length > 0) {
      lines.push(`主演: ${metadata.cast.slice(0, 5).join(", ")}`)
    }
    if (metadata.duration) lines.push(`时长: ${metadata.duration}分钟`)
    if (metadata.episodeCount) lines.push(`集数: ${metadata.episodeCount}`)
    if (metadata.seasonCount) lines.push(`季数: ${metadata.seasonCount}`)
    if (metadata.network) lines.push(`制作方: ${metadata.network}`)
    if (metadata.language) lines.push(`语言: ${metadata.language}`)
    if (metadata.country) lines.push(`国家: ${metadata.country}`)
    if (metadata.rating) lines.push(`评分: ${metadata.rating}/10`)
    if (metadata.status) lines.push(`状态: ${metadata.status}`)
    if (metadata.airDate) lines.push(`首播: ${metadata.airDate}`)
    if (metadata.endDate) lines.push(`完结: ${metadata.endDate}`)

    if (metadata.description) {
      lines.push("")
      lines.push("剧情简介:")
      lines.push(metadata.description)
    }

    return lines.join("\n")
  }

  // 计算元数据完整性评分
  static calculateCompleteness(metadata: ExtractedMetadata): number {
    const fields = [
      "title",
      "description",
      "year",
      "genre",
      "director",
      "cast",
      "posterUrl",
      "language",
      "country",
      "rating",
    ]

    const filledFields = fields.filter((field) => {
      const value = metadata[field as keyof ExtractedMetadata]
      return value && (Array.isArray(value) ? value.length > 0 : true)
    })

    return filledFields.length / fields.length
  }
}

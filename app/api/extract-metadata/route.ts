import { type NextRequest, NextResponse } from "next/server"
import type { ExtractedMetadata } from "@/lib/metadata-extractor"
import { getPlatformParser } from "@/lib/platform-parsers"

export async function POST(request: NextRequest) {
  try {
    const { url, platform } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // 获取平台特定的解析器
    const parser = getPlatformParser(url)

    // 提取元数据
    const metadata = await extractMetadataFromUrl(url, platform, parser)

    // 计算置信度
    const confidence = calculateConfidence(metadata, parser !== null)

    return NextResponse.json({
      success: true,
      metadata,
      platform,
      confidence,
      parser: parser?.name || "通用解析器",
    })
  } catch (error) {
    console.error("元数据提取错误:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "元数据提取失败",
      },
      { status: 500 },
    )
  }
}

async function extractMetadataFromUrl(url: string, platform: string, parser: any): Promise<ExtractedMetadata> {
  try {
    // 获取页面内容
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      timeout: 15000, // 15秒超时
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // 使用平台特定的解析器
    let metadata: ExtractedMetadata = {}

    if (parser) {
      console.log(`使用 ${parser.name} 专用解析器`)
      const platformMetadata = parser.parse(html, url)
      metadata = { ...metadata, ...platformMetadata }
    }

    // 通用解析作为补充
    const genericMetadata = parseGenericMetadata(html, platform, url)
    metadata = { ...genericMetadata, ...metadata } // 平台特定的优先级更高

    // 清理和验证数据
    metadata = cleanMetadata(metadata)

    return metadata
  } catch (error) {
    console.error("抓取页面失败:", error)
    // 如果直接抓取失败，返回基于URL的基本信息
    return generateFallbackMetadata(url, platform)
  }
}

function parseGenericMetadata(html: string, platform: string, url: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {}

  // 提取标题
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    metadata.title = cleanTitle(titleMatch[1].trim(), platform)
  }

  // 提取Open Graph元数据
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
  if (ogTitle && !metadata.title) {
    metadata.title = cleanTitle(ogTitle[1].trim(), platform)
  }

  const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
  if (ogDescription) {
    metadata.description = ogDescription[1].trim()
  }

  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
  if (ogImage) {
    metadata.posterUrl = resolveUrl(ogImage[1], url)
  }

  // 提取Twitter Card元数据
  const twitterTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i)
  if (twitterTitle && !metadata.title) {
    metadata.title = cleanTitle(twitterTitle[1].trim(), platform)
  }

  const twitterDescription = html.match(/<meta\s+name="twitter:description"\s+content="([^"]+)"/i)
  if (twitterDescription && !metadata.description) {
    metadata.description = twitterDescription[1].trim()
  }

  const twitterImage = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i)
  if (twitterImage && !metadata.posterUrl) {
    metadata.posterUrl = resolveUrl(twitterImage[1], url)
  }

  // 提取JSON-LD结构化数据
  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi)
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
        const data = JSON.parse(jsonContent)

        if (data["@type"] === "Movie" || data["@type"] === "TVSeries" || data["@type"] === "VideoObject") {
          if (data.name && !metadata.title) metadata.title = data.name
          if (data.description && !metadata.description) metadata.description = data.description

          if (data.datePublished) {
            const year = new Date(data.datePublished).getFullYear()
            if (!isNaN(year)) metadata.year = year
          }

          if (data.genre) {
            metadata.genre = Array.isArray(data.genre) ? data.genre : [data.genre]
          }

          if (data.director) {
            metadata.director = Array.isArray(data.director)
              ? data.director.map((d: any) => d.name || d)
              : [data.director.name || data.director]
          }

          if (data.actor) {
            metadata.cast = Array.isArray(data.actor)
              ? data.actor.map((a: any) => a.name || a)
              : [data.actor.name || data.actor]
          }

          if (data.duration) {
            // 解析ISO 8601持续时间格式 (PT1H30M)
            const durationMatch = data.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
            if (durationMatch) {
              const hours = Number.parseInt(durationMatch[1] || "0")
              const minutes = Number.parseInt(durationMatch[2] || "0")
              metadata.duration = hours * 60 + minutes
            }
          }

          if (data.numberOfEpisodes) metadata.episodeCount = data.numberOfEpisodes
          if (data.numberOfSeasons) metadata.seasonCount = data.numberOfSeasons

          if (data.aggregateRating) {
            metadata.rating = data.aggregateRating.ratingValue
          }

          if (data.image) {
            const imageUrl = Array.isArray(data.image) ? data.image[0] : data.image
            if (!metadata.posterUrl) metadata.posterUrl = resolveUrl(imageUrl, url)
          }
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }
  }

  // 提取其他常见元数据
  const descriptionMeta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
  if (descriptionMeta && !metadata.description) {
    metadata.description = descriptionMeta[1].trim()
  }

  // 提取年份
  if (!metadata.year) {
    const yearMatch =
      html.match(/(?:年份|Year|发布|Release)[^>]*>.*?(\d{4})/i) || html.match(/(\d{4})\s*年/) || html.match(/20\d{2}/)
    if (yearMatch) {
      const year = Number.parseInt(yearMatch[1])
      if (year >= 1900 && year <= new Date().getFullYear() + 5) {
        metadata.year = year
      }
    }
  }

  return metadata
}

function cleanTitle(title: string, platform: string): string {
  // 移除平台名称和常见后缀
  const platformNames = [
    "Netflix",
    "Prime Video",
    "Disney+",
    "Hulu",
    "HBO",
    "Apple TV+",
    "哔哩哔哩",
    "爱奇艺",
    "优酷",
    "腾讯视频",
    "芒果TV",
  ]

  let cleanedTitle = title

  // 移除平台名称
  for (const platformName of platformNames) {
    const regex = new RegExp(`\\s*[-|_]\\s*${platformName}.*$`, "i")
    cleanedTitle = cleanedTitle.replace(regex, "")
  }

  // 移除常见后缀
  cleanedTitle = cleanedTitle
    .replace(/\s*[-|_]\s*(在线观看|免费观看|高清|HD|4K).*$/i, "")
    .replace(/\s*[-|_]\s*第\d+季.*$/i, "")
    .replace(/\s*$$\d{4}$$.*$/i, "")
    .trim()

  return cleanedTitle
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

function cleanMetadata(metadata: ExtractedMetadata): ExtractedMetadata {
  // 清理和验证元数据
  const cleaned = { ...metadata }

  // 清理标题
  if (cleaned.title) {
    cleaned.title = cleaned.title.trim().replace(/\s+/g, " ")
  }

  // 清理描述
  if (cleaned.description) {
    cleaned.description = cleaned.description.trim().replace(/\s+/g, " ")
    // 限制描述长度
    if (cleaned.description.length > 1000) {
      cleaned.description = cleaned.description.substring(0, 997) + "..."
    }
  }

  // 验证年份
  if (cleaned.year && (cleaned.year < 1900 || cleaned.year > new Date().getFullYear() + 5)) {
    delete cleaned.year
  }

  // 清理数组字段
  if (cleaned.genre) {
    cleaned.genre = cleaned.genre.filter((g) => g && g.trim()).map((g) => g.trim())
    if (cleaned.genre.length === 0) delete cleaned.genre
  }

  if (cleaned.director) {
    cleaned.director = cleaned.director.filter((d) => d && d.trim()).map((d) => d.trim())
    if (cleaned.director.length === 0) delete cleaned.director
  }

  if (cleaned.cast) {
    cleaned.cast = cleaned.cast.filter((c) => c && c.trim()).map((c) => c.trim())
    if (cleaned.cast.length === 0) delete cleaned.cast
  }

  // 验证URL
  if (cleaned.posterUrl && !isValidUrl(cleaned.posterUrl)) {
    delete cleaned.posterUrl
  }

  if (cleaned.backdropUrl && !isValidUrl(cleaned.backdropUrl)) {
    delete cleaned.backdropUrl
  }

  return cleaned
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function generateFallbackMetadata(url: string, platform: string): ExtractedMetadata {
  // 当无法抓取页面时，基于URL生成基本元数据
  const metadata: ExtractedMetadata = {}

  // 尝试从URL中提取标题
  const urlPath = new URL(url).pathname
  const segments = urlPath.split("/").filter(Boolean)

  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1]
    // 清理URL段作为标题
    metadata.title = lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim()
  }

  metadata.description = `从 ${platform} 平台获取的内容`

  return metadata
}

function calculateConfidence(metadata: ExtractedMetadata, hasSpecificParser: boolean): number {
  let confidence = 0

  // 基础分数
  if (hasSpecificParser) confidence += 0.3

  // 根据提取到的字段数量计算
  const fields = ["title", "description", "year", "genre", "director", "cast", "posterUrl"]
  const filledFields = fields.filter((field) => {
    const value = metadata[field as keyof ExtractedMetadata]
    return value && (Array.isArray(value) ? value.length > 0 : true)
  })

  confidence += (filledFields.length / fields.length) * 0.7

  return Math.min(confidence, 1)
}

function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ]

  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

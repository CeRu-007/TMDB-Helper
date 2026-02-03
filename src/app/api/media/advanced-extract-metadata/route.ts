import { type NextRequest, NextResponse } from "next/server"
import type { AdvancedExtractedMetadata, ExtractionConfig } from "@/lib/data/advanced-metadata-extractor"
import { ApiResponse } from "@/types/common"
import { TIMEOUT_10S, TIMEOUT_30S } from "@/lib/constants/constants"

// JSON-LD 数据结构类型
interface JsonLdPerson {
  name: string;
  character?: string;
}

// API 数据结构类型
interface BilibiliData {
  data?: {
    title?: string;
    desc?: string;
    pic?: string;
    owner?: {
      name?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 提取器配置类型
interface ExtractorConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  parser: (data: unknown, originalUrl: string) => AdvancedExtractedMetadata;
}

export async function POST(request: NextRequest) {
  try {
    const { url, platform, config } = await request.json()

    if (!url) {
      return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: "MISSING_URL",
          message: "URL is required",
          timestamp: Date.now()
        },
        timestamp: Date.now()
      } as any,
      { status: 400 }
    )
    }

    // 执行多层次提取
    const extractionResults = await performMultiLayerExtraction(url, platform, config)

    // 合并结果
    const mergedMetadata = mergeExtractionResults(extractionResults)

    // 计算最终置信度
    const confidence = calculateFinalConfidence(extractionResults, mergedMetadata)

    return NextResponse.json<ApiResponse<{
      metadata: AdvancedExtractedMetadata;
      platform: string;
      confidence: number;
      extractionLayers: number;
      sources: string[];
    }>>({
      success: true,
      data: {
        metadata: mergedMetadata,
        platform: platform as string,
        confidence,
        extractionLayers: extractionResults.length,
        sources: extractionResults.map((r) => r.source),
      }
    } as any)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "高级元数据提取失败"

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: "EXTRACTION_ERROR",
          message: errorMessage,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      } as any,
      { status: 500 }
    )
  }
}

async function performMultiLayerExtraction(
  url: string,
  platform: string,
  config: ExtractionConfig,
): Promise<
  Array<{
    source: string
    metadata: AdvancedExtractedMetadata
    confidence: number
  }>
> {
  const results = []

  try {
    // 第一层：基础HTML解析
    
    const basicResult = await extractBasicMetadata(url, platform, config)
    if (basicResult.metadata) {
      results.push({
        source: "basic-html",
        metadata: basicResult.metadata,
        confidence: basicResult.confidence,
      })
    }

    // 第二层：平台特定解析
    
    const platformResult = await extractPlatformSpecificMetadata(url, platform, config)
    if (platformResult.metadata) {
      results.push({
        source: `platform-${platform}`,
        metadata: platformResult.metadata,
        confidence: platformResult.confidence,
      })
    }

    // 第三层：动态内容解析（模拟Selenium行为）
    if (config.waitForDynamic) {
      
      const dynamicResult = await extractDynamicMetadata(url, platform, config)
      if (dynamicResult.metadata) {
        results.push({
          source: "dynamic-content",
          metadata: dynamicResult.metadata,
          confidence: dynamicResult.confidence,
        })
      }
    }

    // 第四层：外部API补充
    
    const externalResult = await extractFromExternalAPIs(url, platform, results[0]?.metadata)
    if (externalResult.metadata) {
      results.push({
        source: "external-api",
        metadata: externalResult.metadata,
        confidence: externalResult.confidence,
      })
    }
  } catch (error) {
    
  }

  return results
}

async function extractBasicMetadata(
  url: string,
  platform: string,
  config: ExtractionConfig,
): Promise<{ metadata?: AdvancedExtractedMetadata; confidence: number }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent || getRandomUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(config.timeout || TIMEOUT_30S),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const metadata = parseAdvancedHTML(html, url, platform)

    return {
      metadata,
      confidence: calculateBasicConfidence(metadata),
    }
  } catch (error) {

    return { confidence: 0 }
  }
}

async function extractPlatformSpecificMetadata(
  url: string,
  platform: string,
  config: ExtractionConfig,
): Promise<{ metadata?: AdvancedExtractedMetadata; confidence: number }> {
  try {
    // 根据平台使用特定的提取策略
    const extractor = getPlatformExtractor(platform)
    if (!extractor) {
      return { confidence: 0 }
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": extractor.userAgent || config.userAgent || getRandomUserAgent(),
        Accept: extractor.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: extractor.referer || url,
        ...extractor.customHeaders,
      },
      signal: AbortSignal.timeout(config.timeout || TIMEOUT_30S),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const metadata = await extractor.extract!(html, url, config)

    return {
      metadata,
      confidence: calculatePlatformConfidence(metadata, platform),
    }
  } catch (error) {

    return { confidence: 0 }
  }
}

async function extractDynamicMetadata(
  url: string,
  platform: string,
  config: ExtractionConfig,
): Promise<{ metadata?: AdvancedExtractedMetadata; confidence: number }> {
  try {
    // 模拟动态加载的内容提取
    // 在实际实现中，这里可以集成Puppeteer或Playwright

    // 尝试获取可能的AJAX端点
    const ajaxEndpoints = getAjaxEndpoints(platform, url)
    let bestMetadata: AdvancedExtractedMetadata = { title: "" }
    let bestConfidence = 0

    for (const endpoint of ajaxEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method || "GET",
          headers: {
            "User-Agent": config.userAgent || getRandomUserAgent(),
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            Referer: url,
            ...endpoint.headers,
          },
          signal: AbortSignal.timeout(TIMEOUT_10S),
        })

        if (response.ok) {
          const data = await response.json()
          const metadata = endpoint.parser(data, url)
          const confidence = calculateDynamicConfidence(metadata)

          if (confidence > bestConfidence) {
            bestMetadata = metadata
            bestConfidence = confidence
          }
        }
      } catch (error) {

      }
    }

    if (Object.keys(bestMetadata).length > 1) {
      return {
        metadata: bestMetadata,
        confidence: bestConfidence,
      }
    }
    return { confidence: bestConfidence }
  } catch (error) {

    return { confidence: 0 }
  }
}

async function extractFromExternalAPIs(
  _url: string,
  _platform: string,
  existingMetadata?: AdvancedExtractedMetadata,
): Promise<{ metadata?: AdvancedExtractedMetadata; confidence: number }> {
  try {
    const metadata: AdvancedExtractedMetadata = { title: "" }

    // 如果已有标题，尝试从外部API获取补充信息
    if (existingMetadata?.title) {
      // 这里可以集成TMDB API、IMDb API等
      // 由于API密钥限制，这里只做示例

      // 示例：从TMDB搜索补充信息
      const tmdbResult = await searchTMDB(existingMetadata.title, existingMetadata.year)
      if (tmdbResult) {
        Object.assign(metadata, tmdbResult)
      }
    }

    if (Object.keys(metadata).length > 1) {
      return {
        metadata,
        confidence: calculateExternalConfidence(metadata),
      }
    }
    return { confidence: calculateExternalConfidence(metadata) }
  } catch (error) {

    return { confidence: 0 }
  }
}

function parseAdvancedHTML(html: string, url: string, platform: string): AdvancedExtractedMetadata {
  const metadata: AdvancedExtractedMetadata = { title: "" }

  // 提取基本信息
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    metadata.title = cleanTitle(titleMatch[1]!.trim(), platform)
  }

  // 提取Open Graph数据
  const ogData = extractOpenGraphData(html)
  Object.assign(metadata, ogData)

  // 提取JSON-LD数据
  const jsonLdData = extractJsonLdData(html)
  Object.assign(metadata, jsonLdData)

  // 提取微数据
  const microdataData = extractMicrodataData(html)
  Object.assign(metadata, microdataData)

  // 提取结构化评分
  const ratings = extractRatings(html)
  if (ratings.length > 0) {
    metadata.rating = ratings
  }

  // 提取图片资源
  if (metadata.images || true) {
    // 根据配置决定是否提取
    metadata.images = extractImages(html, url)
  }

  // 提取视频资源
  const trailers = extractTrailers(html, url)
  if (trailers.length > 0) {
    metadata.trailers = trailers
  }

  return metadata
}

function extractOpenGraphData(html: string): Partial<AdvancedExtractedMetadata> {
  const metadata: Partial<AdvancedExtractedMetadata> = {}

  const ogMatches = html.match(/<meta\s+property="og:([^"]+)"\s+content="([^"]+)"/gi) || []

  for (const match of ogMatches) {
    const propertyMatch = match.match(/property="og:([^"]+)"/)
    const contentMatch = match.match(/content="([^"]+)"/)

    if (propertyMatch && contentMatch) {
      const property = propertyMatch[1]
      const content = contentMatch[1]!

      switch (property) {
        case "title":
          if (!metadata.title) metadata.title = content
          break
        case "description":
          if (!metadata.description) metadata.description = content
          break
        case "image":
          if (!metadata.images) metadata.images = {} as any
          if (!metadata.images!.poster) metadata.images!.poster = []
          metadata.images!.poster!.push(content)
          break
        case "video:release_date":
          metadata.releaseDate = content
          break
        case "video:duration":
          metadata.duration = Number.parseInt(content || "0")
          break
        case "video:tag":
          if (!metadata.tags) metadata.tags = []
          metadata.tags!.push(content)
          break
      }
    }
  }

  return metadata
}

function extractJsonLdData(html: string): Partial<AdvancedExtractedMetadata> {
  const metadata: Partial<AdvancedExtractedMetadata> = {}

  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi) || []

  for (const match of jsonLdMatches) {
    try {
      const jsonContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
      const data = JSON.parse(jsonContent)

      if (data["@type"] === "Movie" || data["@type"] === "TVSeries") {
        if (data.name && !metadata.title) metadata.title = data.name
        if (data.description && !metadata.description) metadata.description = data.description
        if (data.datePublished && !metadata.releaseDate) metadata.releaseDate = data.datePublished

        if (data.genre) {
          metadata.genre = Array.isArray(data.genre) ? data.genre : [data.genre]
        }

        if (data.director) {
          metadata.director = Array.isArray(data.director)
            ? data.director.map((d: JsonLdPerson) => d.name || String(d))
            : [data.director.name || String(data.director)]
        }

        if (data.actor) {
          metadata.cast = Array.isArray(data.actor)
            ? data.actor.map((a: JsonLdPerson, index: number) => ({
                name: a.name || String(a),
                character: a.character,
                order: index,
              }))
            : [
                {
                  name: data.actor.name || data.actor,
                  character: data.actor.character,
                  order: 0,
                },
              ]
        }

        if (data.aggregateRating) {
          if (!metadata.rating) metadata.rating = []
          metadata.rating.push({
            value: data.aggregateRating.ratingValue,
            scale: data.aggregateRating.bestRating || 10,
            source: "structured-data",
            count: data.aggregateRating.ratingCount,
          })
        }
      }
    } catch (error) {
      
    }
  }

  return metadata
}

function extractMicrodataData(html: string): Partial<AdvancedExtractedMetadata> {
  const metadata: Partial<AdvancedExtractedMetadata> = {}

  // 提取微数据标记
  const itemscopeMatches =
    html.match(/<[^>]+itemscope[^>]+itemtype="[^"]*(?:Movie|TVSeries)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi) || []

  for (const match of itemscopeMatches) {
    const nameMatch = match.match(/itemprop="name"[^>]*>([^<]+)</i)
    if (nameMatch && !metadata.title) {
      metadata.title = nameMatch[1]!.trim()
    }

    const descMatch = match.match(/itemprop="description"[^>]*>([^<]+)</i)
    if (descMatch && !metadata.description) {
      metadata.description = descMatch[1]!.trim()
    }
  }

  return metadata
}

function extractRatings(html: string): Array<{
  value: number
  scale: number
  source: string
  count?: number
}> {
  const ratings = []

  // 常见评分模式
  const ratingPatterns = [
    { pattern: /评分[：:]\s*([0-9.]+)\/([0-9]+)/i, source: "网站评分" },
    { pattern: /rating[：:]\s*([0-9.]+)\/([0-9]+)/i, source: "Rating" },
    { pattern: /([0-9.]+)\s*分/i, source: "评分", scale: 10 },
    { pattern: /★+\s*([0-9.]+)/i, source: "星级评分", scale: 5 },
  ]

  for (const { pattern, source, scale } of ratingPatterns) {
    const match = html.match(pattern)
    if (match) {
      ratings.push({
        value: Number.parseFloat(match[1]!),
        scale: scale || Number.parseInt(match[2] || "10") || 10,
        source,
      })
    }
  }

  return ratings
}

function extractImages(
  html: string,
  baseUrl: string,
): {
  poster?: string[]
  backdrop?: string[]
  logo?: string[]
  still?: string[]
} {
  const images = {
    poster: [] as string[],
    backdrop: [] as string[],
    logo: [] as string[],
    still: [] as string[],
  }

  // 提取各种图片
  const imgMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/gi) || []

  for (const match of imgMatches) {
    const srcMatch = match.match(/src="([^"]+)"/)
    const altMatch = match.match(/alt="([^"]*)"/)
    const classMatch = match.match(/class="([^"]*)"/)

    if (srcMatch) {
      const src = resolveUrl(srcMatch[1]!, baseUrl)
      const alt = altMatch ? altMatch[1]!.toLowerCase() : ""
      const className = classMatch ? classMatch[1]!.toLowerCase() : ""

      // 根据特征分类图片
      if (alt.includes("poster") || className.includes("poster") || src.includes("poster")) {
        images.poster.push(src)
      } else if (alt.includes("backdrop") || className.includes("backdrop") || src.includes("backdrop")) {
        images.backdrop.push(src)
      } else if (alt.includes("logo") || className.includes("logo") || src.includes("logo")) {
        images.logo.push(src)
      } else if (alt.includes("still") || className.includes("still") || src.includes("still")) {
        images.still.push(src)
      }
    }
  }

  return images
}

function extractTrailers(
  html: string,
  baseUrl: string,
): Array<{
  name: string
  url: string
  type: "trailer" | "teaser" | "clip"
  quality?: string
}> {
  const trailers: Array<{
    name: string
    url: string
    type: "trailer" | "teaser" | "clip"
    quality?: string
  }> = []

  // 提取视频链接
  const videoMatches = html.match(/<video[^>]+src="([^"]+)"[^>]*>|<source[^>]+src="([^"]+)"[^>]*>/gi) || []

  for (const match of videoMatches) {
    const srcMatch = match.match(/src="([^"]+)"/)
    if (srcMatch) {
      const src = resolveUrl(srcMatch[1]!, baseUrl)
      trailers.push({
        name: "预告片",
        url: src,
        type: "trailer",
      })
    }
  }

  return trailers
}

// 辅助函数
function cleanTitle(title: string, _platform: string): string {
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

  let cleaned = title

  for (const platformName of platformNames) {
    const regex = new RegExp(`\\s*[-|_]\\s*${platformName}.*$`, "i")
    cleaned = cleaned.replace(regex, "")
  }

  return cleaned.trim()
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ]

  return userAgents[Math.floor(Math.random() * userAgents.length)]!
}

function getPlatformExtractor(platform: string): {
  userAgent?: string;
  customHeaders?: Record<string, string>;
  endpoints?: ExtractorConfig[];
  accept?: string;
  referer?: string;
  extract?: (html: string, url: string, config: ExtractionConfig) => Promise<AdvancedExtractedMetadata>;
} | null {
  // 返回平台特定的提取器配置
  const extractors: Record<string, {
    userAgent?: string;
    customHeaders?: Record<string, string>;
    endpoints?: ExtractorConfig[];
    accept?: string;
    referer?: string;
    extract?: (html: string, url: string, config: ExtractionConfig) => Promise<AdvancedExtractedMetadata>;
  }> = {
    netflix: {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      customHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      extract: async (html: string, url: string, _config: ExtractionConfig) => {
        // Netflix特定的提取逻辑
        return extractNetflixMetadata(html, url)
      },
    },
    bilibili: {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      customHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      extract: async (html: string, url: string, _config: ExtractionConfig) => {
        return extractBilibiliMetadata(html, url)
      },
    },
    // 可以继续添加其他平台
  }

  return extractors[platform] || null
}

function getAjaxEndpoints(
  platform: string,
  url: string,
): ExtractorConfig[] {
  const endpoints: ExtractorConfig[] = []

  // 根据平台返回可能的AJAX端点
  if (platform === "bilibili") {
    const bvMatch = url.match(/\/video\/(BV\w+)/)
    if (bvMatch) {
      endpoints.push({
        url: "https://api.bilibili.com/x/web-interface/view?bvid=" + bvMatch[1],
        parser: (data: unknown, _originalUrl: string) => {
          const bilibiliData = data as BilibiliData;
          return ({
            title: bilibiliData.data?.title || "",
            description: bilibiliData.data?.desc || "",
            duration: Math.round(((bilibiliData.data?.duration as number) || 0) / 60),
            // ... 更多字段
          } as AdvancedExtractedMetadata);
        },
      })
    }
  }

  return endpoints
}

async function searchTMDB(_title: string, _year?: number): Promise<Partial<AdvancedExtractedMetadata> | null> {
  // 这里可以集成TMDB API搜索
  // 由于需要API密钥，这里只做示例
  return null
}

function extractNetflixMetadata(html: string, _url: string): AdvancedExtractedMetadata {
  // Netflix特定的提取逻辑
  const metadata: AdvancedExtractedMetadata = { title: "" }

  // 提取Netflix的React上下文数据
  const reactContextMatch = html.match(/netflix\.reactContext\s*=\s*({.+?});/)
  if (reactContextMatch) {
    try {
      JSON.parse(reactContextMatch[1]!)
      // 解析Netflix特有的数据结构
      // ... 具体实现
    } catch (error) {

    }
  }

  return metadata
}

function extractBilibiliMetadata(html: string, _url: string): AdvancedExtractedMetadata {
  // Bilibili特定的提取逻辑
  const metadata: AdvancedExtractedMetadata = { title: "" }

  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/)
  if (initialStateMatch) {
    try {
      const initialState = JSON.parse(initialStateMatch[1]!)

      if (initialState.videoData) {
        const videoData = initialState.videoData
        metadata.title = videoData.title
        metadata.description = videoData.desc
        metadata.duration = Math.round(videoData.duration / 60)

        if (videoData.pic) {
          metadata.images = { poster: [videoData.pic] } as any
        }

        if (videoData.owner) {
          metadata.director = [videoData.owner.name]
        }
      }
    } catch (error) {

    }
  }

  return metadata
}

function calculateBasicConfidence(metadata: AdvancedExtractedMetadata): number {
  let score = 0
  if (metadata.title) score += 0.3
  if (metadata.description) score += 0.2
  if (metadata.year || metadata.releaseDate) score += 0.1
  if (metadata.genre && metadata.genre.length > 0) score += 0.1
  if (metadata.director && metadata.director.length > 0) score += 0.1
  if (metadata.cast && metadata.cast.length > 0) score += 0.1
  if (metadata.images?.poster && metadata.images.poster.length > 0) score += 0.1
  return Math.min(score, 1)
}

function calculatePlatformConfidence(metadata: AdvancedExtractedMetadata, _platform: string): number {
  const baseConfidence = calculateBasicConfidence(metadata)
  // 平台特定的提取通常更准确
  return Math.min(baseConfidence * 1.2, 1)
}

function calculateDynamicConfidence(metadata: AdvancedExtractedMetadata): number {
  const baseConfidence = calculateBasicConfidence(metadata)
  // 动态内容通常包含更完整的信息
  return Math.min(baseConfidence * 1.1, 1)
}

function calculateExternalConfidence(metadata: AdvancedExtractedMetadata): number {
  return calculateBasicConfidence(metadata) * 0.9 // 外部API可能不够准确
}

function mergeExtractionResults(
  results: Array<{
    source: string
    metadata: AdvancedExtractedMetadata
    confidence: number
  }>,
): AdvancedExtractedMetadata {
  if (results.length === 0) return { title: "" }
  if (results.length === 1) return results[0]!.metadata

  // 按置信度排序
  const sortedResults = results.sort((a, b) => b.confidence - a.confidence)

  // 合并元数据，高置信度的优先
  const merged: AdvancedExtractedMetadata = { title: "" }

  for (const result of sortedResults) {
    for (const [key, value] of Object.entries(result.metadata)) {
      if (value && !merged[key as keyof AdvancedExtractedMetadata]) {
        (merged as any)[key] = value
      }
    }
  }

  return merged
}

function calculateFinalConfidence(
  results: Array<{ source: string; metadata: AdvancedExtractedMetadata; confidence: number }>,
  mergedMetadata: AdvancedExtractedMetadata,
): number {
  if (results.length === 0) return 0

  // 计算加权平均置信度
  const totalWeight = results.reduce((sum, result) => sum + result.confidence, 0)
  const weightedConfidence =
    results.reduce((sum, result) => sum + result.confidence * result.confidence, 0) / totalWeight

  // 考虑数据完整性
  const completeness = calculateBasicConfidence(mergedMetadata)

  // 考虑数据源数量（更多来源通常意味着更高可信度）
  const sourceBonus = Math.min(results.length * 0.1, 0.3)

  return Math.min(weightedConfidence * completeness + sourceBonus, 1)
}

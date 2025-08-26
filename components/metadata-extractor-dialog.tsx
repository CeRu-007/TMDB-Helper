"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Tv,
  Clock,
  Star,
  Users,
  Calendar,
  MapPin,
  Info,
  Upload,
  Copy,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react"
import { MetadataExtractor, type MetadataExtractionResult } from "@/lib/metadata-extractor"
import type { TMDBItem } from "@/lib/storage"

interface MetadataExtractorDialogProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MetadataExtractorDialog({ item, open, onOpenChange }: MetadataExtractorDialogProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MetadataExtractionResult | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const handleExtractMetadata = async () => {
    if (!item.platformUrl) {
      alert("该词条没有设置播出平台地址")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const extractionResult = await MetadataExtractor.extractFromUrl(item.platformUrl)
      setResult(extractionResult)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "提取失败",
        source: "unknown",
        confidence: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadToTMDB = () => {
    if (!result?.metadata) return

    const tmdbUrl = MetadataExtractor.buildTMDBUploadUrl(result.metadata, item.tmdbId)
    window.open(tmdbUrl, "_blank")
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type}已复制`)
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      console.error("复制失败:", error)
    }
  }

  const copyMetadataText = () => {
    if (!result?.metadata) return
    const formattedText = MetadataExtractor.formatMetadata(result.metadata)
    copyToClipboard(formattedText, "元数据")
  }

  const platform = item.platformUrl ? MetadataExtractor.detectPlatform(item.platformUrl) : "unknown"
  const completeness = result?.metadata ? MetadataExtractor.calculateCompleteness(result.metadata) : 0

  // 获取平台显示名称
  const getPlatformDisplayName = (platform: string) => {
    const platformNames: Record<string, string> = {
      netflix: "Netflix",
      prime: "Prime Video",
      disney: "Disney+",
      hulu: "Hulu",
      hbo: "HBO Max",
      apple: "Apple TV+",
      bilibili: "哔哩哔哩",
      iqiyi: "爱奇艺",
      youku: "优酷",
      tencent: "腾讯视频",
      mango: "芒果TV",
      generic: "通用平台",
    }
    return platformNames[platform] || platform
  }

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  // 获取置信度描述
  const getConfidenceDescription = (confidence: number) => {
    if (confidence >= 0.8) return "高质量"
    if (confidence >= 0.6) return "中等质量"
    return "低质量"
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>智能元数据提取与上传</span>
              <Badge variant="outline">{item.title}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 源信息和状态 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    源信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">播出平台</div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {getPlatformDisplayName(platform)}
                      </Badge>
                      {item.platformUrl && (
                        <Button variant="outline" size="sm" onClick={() => window.open(item.platformUrl, "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">TMDB ID</div>
                    <span className="font-mono text-sm">{item.tmdbId || "未设置"}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">地址</div>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded break-all block">
                      {item.platformUrl || "未设置"}
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* 提取状态 */}
              {result && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      提取状态
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{result.success ? "提取成功" : "提取失败"}</span>
                    </div>

                    {result.success && result.metadata && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">数据完整性</span>
                            <span className="text-sm font-medium">{Math.round(completeness * 100)}%</span>
                          </div>
                          <Progress value={completeness * 100} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">置信度</span>
                            <span className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                              {Math.round(result.confidence * 100)}%
                            </span>
                          </div>
                          <Progress value={result.confidence * 100} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{getConfidenceDescription(result.confidence)}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleExtractMetadata}
                disabled={loading || !item.platformUrl}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
                {loading ? "智能提取中..." : "开始智能提取"}
              </Button>
            </div>

            {/* 提取结果 */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2 text-red-600" />
                      )}
                      提取结果
                      {result.success && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {getConfidenceDescription(result.confidence)}
                        </Badge>
                      )}
                    </div>
                    {result.success && result.metadata && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={copyMetadataText}>
                          <Copy className="h-4 w-4 mr-1" />
                          复制
                        </Button>
                        <Button onClick={handleUploadToTMDB} className="bg-green-600 hover:bg-green-700" size="sm">
                          <Upload className="h-4 w-4 mr-1" />
                          上传到TMDB
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.success && result.metadata ? (
                    <div className="space-y-6">
                      {/* 基本信息 */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">标题</div>
                            <div className="font-medium">{result.metadata.title}</div>
                            {result.metadata.originalTitle &&
                              result.metadata.originalTitle !== result.metadata.title && (
                                <div className="text-sm text-gray-500">原标题: {result.metadata.originalTitle}</div>
                              )}
                          </div>

                          {result.metadata.year && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">年份</div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{result.metadata.year}</span>
                              </div>
                            </div>
                          )}

                          {result.metadata.genre && result.metadata.genre.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">类型</div>
                              <div className="flex flex-wrap gap-1">
                                {result.metadata.genre.map((g, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.metadata.duration && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">时长</div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>{result.metadata.duration} 分钟</span>
                              </div>
                            </div>
                          )}

                          {(result.metadata.episodeCount || result.metadata.seasonCount) && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">集数信息</div>
                              <div className="flex items-center space-x-1">
                                <Tv className="h-4 w-4 text-gray-400" />
                                <span>
                                  {result.metadata.seasonCount && `${result.metadata.seasonCount}季`}
                                  {result.metadata.episodeCount && ` ${result.metadata.episodeCount}集`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {result.metadata.rating && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">评分</div>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span>{result.metadata.rating}/10</span>
                              </div>
                            </div>
                          )}

                          {result.metadata.language && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">语言</div>
                              <span>{result.metadata.language}</span>
                            </div>
                          )}

                          {result.metadata.country && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">国家/地区</div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{result.metadata.country}</span>
                              </div>
                            </div>
                          )}

                          {result.metadata.network && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">制作方</div>
                              <span>{result.metadata.network}</span>
                            </div>
                          )}

                          {result.metadata.status && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">状态</div>
                              <Badge variant="outline">{result.metadata.status}</Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* 人员信息 */}
                      {(result.metadata.director || result.metadata.cast) && (
                        <div className="space-y-4">
                          {result.metadata.director && result.metadata.director.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-2">导演</div>
                              <div className="flex flex-wrap gap-1">
                                {result.metadata.director.map((d, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {d}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.metadata.cast && result.metadata.cast.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-2">主演</div>
                              <div className="flex flex-wrap gap-1">
                                {result.metadata.cast.slice(0, 10).map((c, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {c}
                                  </Badge>
                                ))}
                                {result.metadata.cast.length > 10 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{result.metadata.cast.length - 10} 更多
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 剧情简介 */}
                      {result.metadata.description && (
                        <>
                          <Separator />
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-2">剧情简介</div>
                            <ScrollArea className="h-32">
                              <p className="text-sm leading-relaxed">{result.metadata.description}</p>
                            </ScrollArea>
                          </div>
                        </>
                      )}

                      {/* 图片预览 */}
                      {(result.metadata.posterUrl || result.metadata.backdropUrl) && (
                        <>
                          <Separator />
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-2">图片</div>
            <div className="grid grid-cols-2 gap-4">
                              {result.metadata.posterUrl && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">海报</div>
                                  <img
                                    src={result.metadata.posterUrl || "/placeholder.svg"}
                                    alt="海报"
                                    className="w-full h-48 object-cover rounded border"
                                  />
                                </div>
                              )}
                              {result.metadata.backdropUrl && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">背景图</div>
                                  <img
                                    src={result.metadata.backdropUrl || "/placeholder.svg"}
                                    alt="背景图"
                                    className="w-full h-48 object-cover rounded border"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <h3 className="text-lg font-medium mb-2">提取失败</h3>
                      <p className="text-sm text-gray-500 mb-4">{result.error}</p>
                      <div className="text-xs text-gray-400">
                        <p>可能的原因：</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>网站有反爬虫保护</li>
                          <li>需要登录才能访问</li>
                          <li>网络连接问题</li>
                          <li>页面结构不支持自动解析</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 使用说明 */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">智能提取说明</p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>系统会自动识别平台类型并使用专门的解析规则</li>
                      <li>支持Netflix、Prime Video、Disney+、Bilibili等主流平台</li>
                      <li>提取成功后会显示数据完整性和置信度评分</li>
                      <li>点击"上传到TMDB"将自动打开TMDB编辑页面并预填数据</li>
                      <li>可以复制元数据文本用于手动填写或备份</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 复制反馈 */}
      {copyFeedback && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{copyFeedback}</span>
          </div>
        </div>
      )}
    </>
  )
}

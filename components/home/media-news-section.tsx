"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  Key, 
  Calendar,
  Film,
  Star,
  Clock,
  ExternalLink
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MediaNewsItem {
  id: string
  title: string
  originalTitle?: string
  releaseDate: string
  posterUrl?: string
  overview?: string
  mediaType: 'movie' | 'tv'
  voteAverage?: number
}

interface MediaNewsSectionProps {
  type: 'upcoming' | 'recent'
  title: string
  items: MediaNewsItem[]
  loading: boolean
  error: string | null
  lastUpdated: string | null
  isMissingApiKey: boolean
  selectedRegion: string
  onRegionChange: (region: string) => void
  onRefresh: () => void
  onShowSettings: () => void
}

const REGIONS = [
  { id: "CN", name: "中国大陆", icon: "🇨🇳" },
  { id: "HK", name: "香港", icon: "🇭🇰" },
  { id: "TW", name: "台湾", icon: "🇹🇼" },
  { id: "JP", name: "日本", icon: "🇯🇵" },
  { id: "KR", name: "韩国", icon: "🇰🇷" },
  { id: "US", name: "美国", icon: "🇺🇸" },
  { id: "GB", name: "英国", icon: "🇬🇧" },
]

export function MediaNewsSection({
  type,
  title,
  items,
  loading,
  error,
  lastUpdated,
  isMissingApiKey,
  selectedRegion,
  onRegionChange,
  onRefresh,
  onShowSettings
}: MediaNewsSectionProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getMediaTypeIcon = (mediaType: string) => {
    return mediaType === 'movie' ? <Film className="h-3 w-3" /> : <Calendar className="h-3 w-3" />
  }

  const getMediaTypeName = (mediaType: string) => {
    return mediaType === 'movie' ? '电影' : '电视剧'
  }

  return (
    <div className="space-y-4">
      {/* 标题和控制栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {lastUpdated}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* 区域选择 */}
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  <div className="flex items-center space-x-2">
                    <span>{region.icon}</span>
                    <span className="text-sm">{region.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">刷新</span>
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert className="border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-700 dark:text-red-300">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              {isMissingApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowSettings}
                  className="ml-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700"
                >
                  <Key className="h-3 w-3 mr-1" />
                  配置API
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 加载状态 */}
      {loading && !error && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      )}

      {/* 内容网格 */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.slice(0, 12).map((item) => (
            <Card key={item.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* 海报 */}
                  <div className="aspect-[2/3] relative bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    {item.posterUrl ? (
                      <Image
                        src={item.posterUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                        {getMediaTypeIcon(item.mediaType)}
                      </div>
                    )}
                    
                    {/* 评分徽章 */}
                    {item.voteAverage && item.voteAverage > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-black/70 text-white text-xs">
                          <Star className="h-2 w-2 mr-1 fill-current" />
                          {item.voteAverage.toFixed(1)}
                        </Badge>
                      </div>
                    )}

                    {/* 媒体类型徽章 */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {getMediaTypeName(item.mediaType)}
                      </Badge>
                    </div>
                  </div>

                  {/* 标题 */}
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                      {item.title}
                    </h3>
                    {item.originalTitle && item.originalTitle !== item.title && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {item.originalTitle}
                      </p>
                    )}
                  </div>

                  {/* 上映日期 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(item.releaseDate)}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && items.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-600 mb-2">
            {type === 'upcoming' ? <Calendar className="h-8 w-8 mx-auto" /> : <Film className="h-8 w-8 mx-auto" />}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            暂无{type === 'upcoming' ? '即将上线' : '近期开播'}的内容
          </p>
        </div>
      )}

      {/* 查看更多 */}
      {!loading && !error && items.length > 12 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            查看更多 ({items.length - 12} 个)
          </Button>
        </div>
      )}
    </div>
  )
}
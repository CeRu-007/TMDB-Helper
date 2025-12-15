"use client"

import { useState } from "react"
import { Badge } from "@/components/common/badge"
import { ExternalLink, MousePointer2, Zap } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"
import { Button } from "@/components/common/button"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

interface MediaCardProps {
  item: TMDBItem
  onClick: () => void
  showAirTime?: boolean
}

export default function MediaCard({ item, onClick, showAirTime = false }: MediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  // 判断是否每日更新
  const isDailyUpdate = item.isDailyUpdate === true || (item.isDailyUpdate === undefined && (item.category === "tv" || item.category === "short"))

  // 获取进度
  const getProgress = () => {
    // 移除电影类型检查，只支持电视剧

    if (!item.episodes || item.episodes.length === 0) {
      return 0
    }

    const completed = item.episodes.filter(ep => ep.completed).length
    return item.totalEpisodes ? (completed / item.totalEpisodes) * 100 : 0
  }

  // 评分设置为null，修复右下角评分问题
  const rating = null

  // 添加completedEpisodes变量定义
  const completedEpisodes = item.episodes?.filter((ep) => ep.completed).length || 0

  // 获取播出时间
  const getAirTime = (weekday: number) => {
    const airTime = item.airTime || "19:00"
    // 将原始weekday（0-6，0是周日）转换为我们的数组索引（0-6，0是周一，6是周日）
    const adjustedWeekday = weekday === 0 ? 6 : weekday - 1
    return `${WEEKDAYS[adjustedWeekday]} ${airTime}`
  }

  // 获取仅时间部分
  const getTimeOnly = () => {
    return item.airTime || "19:00"
  }

  // 检查是否有第二播出日
  const hasSecondWeekday = typeof item.secondWeekday === 'number' && item.secondWeekday >= 0;

  // 获取更新信息文本 - 针对多集剧集优化
  const getUpdateText = () => {
    // 移除电影类型检查，只支持电视剧
    // 已完结的剧集显示"全X集"或"已完结"
    if (item.status === "completed") {
      // 如果有总集数，显示"全X集"
      if (item.totalEpisodes) {
        return `全${item.totalEpisodes}集`
      }
      // 没有总集数就显示"已完结"
      return "已完结"
    }

    // 连载中的剧集显示进度
    // 如果有多季信息，显示最新一季的进度
    if (item.seasons && item.seasons.length > 0) {
      // 找到最新的季（季数最大的）
      const latestSeason = [...item.seasons].sort((a, b) => b.seasonNumber - a.seasonNumber)[0];

      // 计算最新一季的完成集数 - 添加安全检查确保episodes存在
      const latestSeasonCompletedEpisodes = latestSeason?.episodes && latestSeason.episodes.length > 0
        ? latestSeason.episodes.filter((ep) => ep.completed).length
        : 0

      return `更新至第${latestSeasonCompletedEpisodes}集`
    }
    // 单季剧集显示总进度
    return `更新至第${completedEpisodes}集`
  }

  // 获取完结日期（取updatedAt）
  const getCompletionDate = () => {
    try {
      const date = new Date(item.updatedAt)
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    } catch {
      return null
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleCardClick = () => {
    setIsClicked(true)
    onClick()
    // 快速重置点击状态
    setTimeout(() => setIsClicked(false), 80)
  }

  return (
    <div
      className="cursor-pointer group"
      data-media-card="true"
      data-item={JSON.stringify(item)}
    >
      {/* 播出时间标签 - 电视剧和短剧只显示每日更新标签，其他分类显示日期时间 */}
      {showAirTime && (
        <div className="mb-2 flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
          {/* 已完结条目显示完结日期标签 */}
          {item.status === "completed" ? (
            <Badge className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
              {getCompletionDate() ? `${getCompletionDate()} 完结` : "已完结"}
            </Badge>
          ) : (
            <>
              {/* 电视剧和短剧显示每日更新标签和播出时间标签 */}
              {isDailyUpdate ? (
                <Badge className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center whitespace-nowrap">
                  <Zap className="h-3 w-3 mr-1 animate-pulse" />
                  每日 {getTimeOnly()}
                </Badge>
              ) : (
                // 合并显示所有播出日
                <Badge
                  className={`text-white text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    // 如果任何一个播出日是今天，使用特殊颜色
                    (item.weekday === new Date().getDay() || (hasSecondWeekday && item.secondWeekday === new Date().getDay()))
                      ? "bg-red-500 animate-pulse" 
                      : "bg-green-500"
                  }`}
                >
                  {/* 获取所有播出日的星期几（不包含时间） */}
                  {(() => {
                    const airTime = item.airTime || "19:00";
                    const weekdays = [];
                    
                    // 处理主要播出日
                    const adjustedWeekday1 = item.weekday === 0 ? 6 : item.weekday - 1;
                    weekdays.push(WEEKDAYS[adjustedWeekday1]);
                    
                    // 处理第二播出日
                    if (hasSecondWeekday) {
                      const adjustedWeekday2 = item.secondWeekday === 0 ? 6 : (item.secondWeekday as number) - 1;
                      weekdays.push(WEEKDAYS[adjustedWeekday2]);
                    }
                    
                    // 返回合并后的字符串
                    return `${weekdays.join('')} ${airTime}`;
                  })()}
                </Badge>
              )}
            </>
          )}
        </div>
      )}

      {/* 海报容器 - 关键修改：确保所有悬停效果都在这个容器内 */}
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-150 ${
          isClicked
            ? "scale-95 brightness-110"
            : "group-hover:scale-[1.02] group-hover:shadow-xl dark:group-hover:shadow-blue-900/30"
        }`}
        onClick={handleCardClick}
      >
        {/* 骨架层 */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        )}

        {/* 海报图片 */}
        <img
          src={!imageError ? item.posterUrl : "/placeholder.svg?height=300&width=200"}
          alt={item.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onError={handleImageError}
          onLoad={() => setImageLoaded(true)}
        />

        {/* 悬停遮罩层 - 严格限制在海报容器内 */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          {/* 点击提示 - 调整位置确保不超出边界 */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-md px-3 py-2 border border-white/20 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
              <div className="flex items-center justify-center space-x-2">
                <MousePointer2 className="h-3 w-3 text-blue-600" />
                <p className="text-xs font-medium text-gray-900">点击查看详情</p>
              </div>
            </div>
          </div>

          {/* 快捷操作按钮 - 移到最右上角 */}
          <div className="absolute top-2 right-2 flex flex-col space-y-1 transform translate-x-1 group-hover:translate-x-0 transition-transform duration-200">
            {/* TMDB跳转按钮 */}
            {item.tmdbUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(item.tmdbUrl, "_blank")
                }}
                className="bg-blue-500/90 hover:bg-blue-600 text-white text-xs px-2 py-1 h-6 backdrop-blur-sm border-0 shadow-md"
                title="访问TMDB页面"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                TMDB
              </Button>
            )}

            {/* 播出平台跳转按钮 */}
            {item.platformUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(item.platformUrl, "_blank")
                }}
                className="bg-green-500/90 hover:bg-green-600 text-white text-xs px-2 py-1 h-6 backdrop-blur-sm border-0 shadow-md"
                title="访问播出平台"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                播出平台
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 标题和更新信息 - 移到海报容器外部，确保不受悬停效果影响 */}
      <div className="mt-2 space-y-1 relative z-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{getUpdateText()}</p>
      </div>
    </div>
  )
}
'use client'

import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Separator } from '@/shared/components/ui/separator'
import { Heart, ExternalLink } from 'lucide-react'
import { ScheduleEpisode } from '../types/schedule'
import { ScheduleImage } from './schedule-image'
import { cn } from '@/lib/utils'

interface ScheduleDetailPanelProps {
  episode: ScheduleEpisode | null
  isFollowing: boolean
  onToggleFollowing: () => void
  onClose: () => void
}

export function ScheduleDetailPanel({ 
  episode, 
  isFollowing, 
  onToggleFollowing, 
  onClose 
}: ScheduleDetailPanelProps) {
  if (!episode) {
    return (
      <div className="border-l bg-white dark:bg-gray-800 w-0 overflow-hidden transition-all duration-300 ease-in-out" />
    )
  }

  return (
    <div className="border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 w-80 flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700/50 flex-shrink-0">
        <ScheduleImage
          src={episode.cover}
          alt={episode.title}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm rounded-full h-8 w-8"
          onClick={onClose}
        >
          ×
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{episode.title}</h3>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                "bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-0 shadow-sm",
                episode.published
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              )}>
                {episode.published ? '已更新' : '待更新'}
              </Badge>
              <span className="text-sm text-gray-500">
                {episode.pubIndex.startsWith('更新') ? episode.pubIndex : `更新至${episode.pubIndex}`}
              </span>
            </div>
          </div>

          <Separator className="bg-gray-100 dark:bg-gray-800" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">更新时间</span>
              <span className="text-sm font-medium">{episode.pubTime}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-gray-500">平台</span>
              {episode.platforms && episode.platforms.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {episode.platforms.map((platform, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">
                      {platform}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium">{episode.platform || '未知'}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">类型</span>
              <div className="flex gap-1">
                {episode.types?.map(type => (
                  <Badge key={type} variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-100 dark:bg-gray-800" />

          <div className="space-y-2">
            <Button
              className={cn(
                "w-full shadow-sm transition-colors",
                isFollowing
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-blue-500 hover:bg-blue-600"
              )}
              onClick={onToggleFollowing}
            >
              <Heart className={cn("h-4 w-4 mr-2", isFollowing && "fill-current")} />
              {isFollowing ? '已追番' : '追番'}
            </Button>
            {episode.platformUrls && Object.keys(episode.platformUrls).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(episode.platformUrls).map(([platform, url]) => (
                  <Button
                    key={platform}
                    variant="outline"
                    className="w-full border-gray-200 dark:border-gray-700"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    去观看（{platform}）
                  </Button>
                ))}
              </div>
            ) : episode.url && (
              <Button
                variant="outline"
                className="w-full border-gray-200 dark:border-gray-700"
                onClick={() => window.open(episode.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                去观看
              </Button>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">简介</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              暂无简介信息
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
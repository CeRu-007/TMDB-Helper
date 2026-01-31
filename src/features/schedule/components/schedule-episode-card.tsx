'use client'

import React from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Clock, Heart, Play } from 'lucide-react'
import { ScheduleEpisode } from '../types/schedule'
import { ScheduleImage } from './schedule-image'
import { cn } from '@/lib/utils'

interface ScheduleEpisodeCardProps {
  episode: ScheduleEpisode
  isFollowing: boolean
  onToggleFollowing: () => void
  onClick: () => void
  isCompact: boolean
}

export function ScheduleEpisodeCard({ 
  episode, 
  isFollowing, 
  onToggleFollowing, 
  onClick, 
  isCompact 
}: ScheduleEpisodeCardProps) {
  function handleToggleFollowing(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleFollowing()
  }

  return (
    <div 
      className={cn(
        "group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50",
        isCompact ? "p-2.5" : "p-3"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700/50",
        isCompact ? "aspect-[3/4] mb-2" : "aspect-[16/9] mb-3"
      )}>
        <ScheduleImage
          src={episode.cover}
          alt={episode.title}
          className="group-hover:scale-105 transition-transform duration-300"
          fallbackClassName="w-full h-full"
        />
        
        <div className="absolute top-2 left-2">
          <Badge
            className={cn(
              "text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-0 shadow-sm",
              episode.published
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {episode.published ? '已更新' : '待更新'}
          </Badge>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center gap-2 pb-3">
          {episode.url && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation()
                window.open(episode.url, '_blank')
              }}
            >
              <Play className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="secondary" 
            className={cn("h-8 w-8 p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800", isFollowing && "text-rose-500")}
            onClick={handleToggleFollowing}
          >
            <Heart className={cn("h-4 w-4", isFollowing && "fill-current")} />
          </Button>
        </div>
      </div>

      <div className={cn("space-y-1", isCompact && "space-y-0.5")}>
        <h4 className={cn(
          "font-medium line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {episode.title}
        </h4>
        <div className="flex items-center justify-between">
          <span className={cn(
            "font-medium",
            episode.published ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
            isCompact ? "text-[10px]" : "text-xs"
          )}>
            更新至{episode.pubIndex}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {episode.pubTime.substring(0, 5)}
          </span>
        </div>
      </div>
    </div>
  )
}
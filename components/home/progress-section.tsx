"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, PlayCircle, Clock, Star } from 'lucide-react'
import { WeekdayNavigation } from './weekday-navigation'
import { useData } from '@/components/client-data-provider'
import { TMDBItem } from '@/lib/storage'
import MediaCard from '@/components/media-card'
import { UseHomeStateReturn } from '@/hooks/use-home-state'
import { LayoutType } from '@/lib/layout-preferences'

interface ProgressSectionProps {
  homeState: UseHomeStateReturn
  currentLayout: LayoutType
  categories: Array<{ id: string; name: string; icon: React.ReactNode }>
}

export function ProgressSection({ homeState, currentLayout, categories }: ProgressSectionProps) {
  const { items, loading } = useData()

  // 根据分类筛选词条
  const filterItemsByCategory = (items: TMDBItem[]) => {
    if (homeState.selectedCategory === "all") return items
    
    return items.filter(item => {
      if (item.category) {
        return item.category === homeState.selectedCategory
      }
      
      // 备用逻辑
      const title = item.title.toLowerCase()
      const notes = item.notes?.toLowerCase() || ""
      
      switch(homeState.selectedCategory) {
        case "anime":
          return title.includes("动漫") || notes.includes("动漫")
        case "tv":
          return item.mediaType === "tv" && 
                 !title.includes("动漫") && !notes.includes("动漫") &&
                 !title.includes("综艺") && !notes.includes("综艺")
        case "kids":
          return title.includes("少儿") || notes.includes("少儿")
        case "variety":
          return title.includes("综艺") || notes.includes("综艺")
        case "short":
          return title.includes("短剧") || notes.includes("短剧")
        case "movie":
          return item.mediaType === "movie"
        default:
          return true
      }
    })
  }

  const getItemsByStatus = (status: "ongoing" | "completed") => {
    return filterItemsByCategory(items.filter((item) => item.status === status))
  }

  const ongoingItems = getItemsByStatus("ongoing")
  const completedItems = getItemsByStatus("completed")

  // 统计数据
  const totalItems = ongoingItems.length + completedItems.length
  const completedCount = completedItems.length
  const completionRate = totalItems > 0 ? (completedCount / totalItems) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PlayCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">进行中</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {ongoingItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">已完成</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {completedItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">总计</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">完成率</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {completionRate.toFixed(1)}%
                </p>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 进度标签页 */}
      <Tabs defaultValue="ongoing">
        <TabsList>
          <TabsTrigger value="ongoing" className="flex items-center space-x-2">
            <PlayCircle className="h-4 w-4" />
            <span>进行中 ({ongoingItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>已完成 ({completedItems.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          {ongoingItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ongoingItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onClick={() => homeState.setSelectedItem(item)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                暂无进行中的词条
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {completedItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onClick={() => homeState.setSelectedItem(item)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                暂无已完成的词条
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
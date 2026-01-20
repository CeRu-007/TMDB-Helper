"use client"

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { TMDBItem } from '@/lib/data/storage'
import { WEEKDAYS } from '@/lib/constants/weekdays'
import { Calendar, Clock, CheckCircle2 } from 'lucide-react'

interface WeekdayNavigationProps {
  selectedDayFilter: "recent" | number
  onDayFilterChange: (filter: "recent" | number) => void
  filteredItems: TMDBItem[]
  categories: Array<{ id: string; name: string }>
  selectedCategory: string
  activeTab?: string
  onActiveTabChange?: (tab: string) => void
  currentDay?: number
}

export function WeekdayNavigation({
  selectedDayFilter,
  onDayFilterChange,
  filteredItems,
  categories,
  selectedCategory,
  activeTab,
  onActiveTabChange,
  currentDay = 0
}: WeekdayNavigationProps) {
  const containerClasses = "bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-10"

  // 获取指定日期的词条数量
  const getItemsByDay = (items: TMDBItem[], day: number) => {
    return items.filter((item) =>
      item.weekday === day ||
      (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
    )
  }

  return (
    <div className={containerClasses}>
      <div className="mx-auto px-6">
        <div className="flex justify-between items-center py-3">
          {/* 左侧：日期导航按钮 */}
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => onDayFilterChange("recent")}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDayFilter === "recent"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              最近更新
            </button>

            {WEEKDAYS.map((day, index) => {
              // 将我们的索引（0=周一，6=周日）转换回JS的日期（0=周日，1=周一）
              const jsWeekday = index === 6 ? 0 : index + 1
              const dayItems = getItemsByDay(filteredItems, jsWeekday)
              const isToday = index === currentDay
              const isSelected = selectedDayFilter === jsWeekday

              return (
                <button
                  key={day}
                  onClick={() => onDayFilterChange(jsWeekday)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? isToday
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${isToday ? "!border-2 !border-yellow-400 relative z-10" : ""}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{day}</span>
                    {isToday && <Calendar className="h-3 w-3 text-yellow-600" />}
                    {dayItems.length > 0 && (
                      <span className="bg-gray-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 右侧：状态选择器 */}
          {activeTab && onActiveTabChange && (
            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">状态:</span>
              <Select value={activeTab} onValueChange={onActiveTabChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="ongoing">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>连载中</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>已完结</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 如果没有状态选择器，显示当前筛选信息 */}
          {(!activeTab || !onActiveTabChange) && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {selectedCategory === "all"
                  ? "全部分类"
                  : categories.find(c => c.id === selectedCategory)?.name || "未知分类"
                }
              </span>
              <span>•</span>
              <span>
                {selectedDayFilter === "recent"
                  ? "最近更新"
                  : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}播出`
                }
              </span>
              <span>•</span>
              <span>{filteredItems.length} 个词条</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
"use client"

import React from 'react'
import { Button } from '@/components/common/button'
import { Badge } from '@/components/common/badge'
import { TMDBItem } from '@/lib/data/storage'

interface WeekdayNavigationProps {
  selectedDayFilter: "recent" | number
  onDayFilterChange: (filter: "recent" | number) => void
  filteredItems: TMDBItem[]
  categories: Array<{ id: string; name: string }>
  selectedCategory: string
}

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

export function WeekdayNavigation({
  selectedDayFilter,
  onDayFilterChange,
  filteredItems,
  categories,
  selectedCategory
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
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              最近更新
            </button>
            
            {WEEKDAYS.map((day, index) => {
              const dayItems = getItemsByDay(filteredItems, index)
              const isSelected = selectedDayFilter === index
              
              return (
                <button
                  key={index}
                  onClick={() => onDayFilterChange(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {day}
                  {dayItems.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 text-xs ${
                        isSelected 
                          ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200" 
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {dayItems.length}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* 右侧：当前筛选信息 */}
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
                : `${WEEKDAYS[selectedDayFilter as number]}播出`
              }
            </span>
            <span>•</span>
            <span>{filteredItems.length} 个词条</span>
          </div>
        </div>
      </div>
    </div>
  )
}
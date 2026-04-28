"use client"

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"
import { TMDBItem } from '@/lib/data/storage'
import { Calendar, Clock, CheckCircle2 } from 'lucide-react'

interface WeekdayNavigationProps {
  selectedDayFilter: "recent" | number
  onDayFilterChange: (filter: "recent" | number) => void
  filteredItems: TMDBItem[]
  categories: Array<{ id: string; name: string }>
  selectedCategory: string
  onCategoryChange?: (category: string) => void
  activeTab?: string
  onActiveTabChange?: (tab: string) => void
  currentDay?: number
}

function getDayButtonClasses(isSelected: boolean, isToday: boolean): string {
  const baseClasses = "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all"

  if (isSelected) {
    return `${baseClasses} bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ${
      isToday ? "!border-2 !border-yellow-400 relative z-10" : "border border-blue-300 dark:border-blue-600"
    }`
  }

  return `${baseClasses} text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 ${
    isToday ? "!border-2 !border-yellow-400 relative z-10" : ""
  }`
}

export function WeekdayNavigation({
  selectedDayFilter,
  onDayFilterChange,
  filteredItems,
  categories,
  selectedCategory,
  onCategoryChange,
  activeTab,
  onActiveTabChange,
  currentDay = 0
}: WeekdayNavigationProps) {
  const { t } = useTranslation('media')
  const [mounted, setMounted] = useState(false)
  const [localCurrentDay, setLocalCurrentDay] = useState(currentDay)

  const WEEKDAYS = [
    t('weekdaysList.monday'),
    t('weekdaysList.tuesday'),
    t('weekdaysList.wednesday'),
    t('weekdaysList.thursday'),
    t('weekdaysList.friday'),
    t('weekdaysList.saturday'),
    t('weekdaysList.sunday'),
  ]

  useEffect(() => {
    setMounted(true)
    const jsDay = new Date().getDay()
    const adjustedDay = jsDay === 0 ? 6 : jsDay - 1
    setLocalCurrentDay(adjustedDay)
  }, [])

  const getItemsByDay = (items: TMDBItem[], day: number) => {
    return items.filter((item) =>
      item.weekday === day ||
      (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-10">
      <div className="mx-auto px-6">
        <div className="flex justify-between items-center py-3 gap-4">
          <ScrollAreaPrimitive.Root className="flex-1 whitespace-nowrap overflow-hidden">
            <ScrollAreaPrimitive.Viewport className="h-full w-full">
              <div className="flex space-x-1">
                <button
                  onClick={() => onDayFilterChange("recent")}
                  className={getDayButtonClasses(selectedDayFilter === "recent", false)}
                >
                  {t("recentlyUpdated", { ns: "common" })}
                </button>

                {WEEKDAYS.map((day, index) => {
                  const jsWeekday = index === 6 ? 0 : index + 1
                  const dayItems = getItemsByDay(filteredItems, jsWeekday)
                  const isToday = mounted && index === localCurrentDay
                  const isSelected = selectedDayFilter === jsWeekday

                  return (
                    <button
                      key={day}
                      onClick={() => onDayFilterChange(jsWeekday)}
                      className={getDayButtonClasses(isSelected, isToday)}
                      suppressHydrationWarning
                    >
                      <div className="flex items-center space-x-1">
                        <span>{day}</span>
                        {isToday && <Calendar className="h-3 w-3 text-yellow-600" suppressHydrationWarning />}
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
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.ScrollAreaScrollbar
              orientation="horizontal"
              className="flex h-3 touch-none select-none flex-col border-t border-t-transparent p-[2px] transition-colors"
            >
              <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-gray-400/70 dark:bg-gray-500/70 hover:bg-gray-500/80 dark:hover:bg-gray-400/80" />
            </ScrollAreaPrimitive.ScrollAreaScrollbar>
          </ScrollAreaPrimitive.Root>

          <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
            {onCategoryChange && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("category", { ns: "common" })}:</span>
                <Select value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder={t("all", { ns: "common" })} />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.id === 'all' ? t("all", { ns: "common" }) : t(`categoryNames.${category.id}`, { ns: "media" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab && onActiveTabChange && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("status", { ns: "common" })}:</span>
                <Select value={activeTab} onValueChange={onActiveTabChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="ongoing">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{t("ongoing", { ns: "common" })}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t("completed", { ns: "common" })}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {(!activeTab || !onActiveTabChange) && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {selectedCategory === "all"
                  ? t("all", { ns: "common" })
                  : t(`categoryNames.${selectedCategory}`, { ns: "media" })
                }
              </span>
              <span>•</span>
              <span>
                {selectedDayFilter === "recent"
                  ? t("recentlyUpdated", { ns: "common" })
                  : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}${t("aired", { ns: "common" })}`
                }
              </span>
              <span>•</span>
              <span>{t("itemsCount", { count: filteredItems.length, ns: "common" })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
"use client"

import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/lib/utils'
import { TMDBItem } from '@/lib/data/storage'
import { getPlatformInfo } from '@/lib/utils'
import { Search, SlidersHorizontal, X, LayoutGrid, Sparkles, Tv, Baby, Popcorn, Ticket, Radio } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { CachedImage } from '@/shared/components/ui/cached-image'

interface FilterDropdownProps {
  items: TMDBItem[]
  categories: Array<{ id: string; name: string }>
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="h-3.5 w-3.5" />,
  anime: <Sparkles className="h-3.5 w-3.5" />,
  tv: <Tv className="h-3.5 w-3.5" />,
  kids: <Baby className="h-3.5 w-3.5" />,
  variety: <Popcorn className="h-3.5 w-3.5" />,
  short: <Ticket className="h-3.5 w-3.5" />,
}

interface PlatformOption {
  id: string
  name: string
  logoUrl?: string
  iconType: string
  count: number
}

function extractPlatforms(items: TMDBItem[]): PlatformOption[] {
  const platformMap = new Map<string, PlatformOption>()

  for (const item of items) {
    let platformId: string | undefined
    let platformName: string | undefined
    let logoUrl: string | undefined
    let iconType = 'generic'

    if (item.networkName) {
      platformId = item.networkName.toLowerCase().replace(/[^a-z0-9]/g, '')
      platformName = item.networkName
      logoUrl = item.networkLogoUrl
      iconType = platformId
    }

    if (!platformId && item.platformUrl) {
      const info = getPlatformInfo(item.platformUrl)
      if (info) {
        platformId = info.icon
        platformName = info.name
        iconType = info.icon
      }
    }

    if (!platformId) continue

    const existing = platformMap.get(platformId)
    if (existing) {
      existing.count++
      if (!existing.logoUrl && logoUrl) {
        existing.logoUrl = logoUrl
      }
    } else {
      platformMap.set(platformId, {
        id: platformId,
        name: platformName || platformId,
        logoUrl,
        iconType,
        count: 1,
      })
    }
  }

  return Array.from(platformMap.values()).sort((a, b) => b.count - a.count)
}

export function FilterDropdown({ items, categories }: FilterDropdownProps) {
  const { t } = useTranslation('media')
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const selectedCategory = useUIStore((s) => s.selectedCategory)
  const setSelectedCategory = useUIStore((s) => s.setSelectedCategory)
  const selectedPlatform = useUIStore((s) => s.selectedPlatform)
  const setSelectedPlatform = useUIStore((s) => s.setSelectedPlatform)

  const platforms = useMemo(() => extractPlatforms(items), [items])

  const hasActiveFilter = selectedCategory !== 'all' || selectedPlatform !== 'all' || searchQuery.trim() !== ''

  const activeFilterCount = [
    selectedCategory !== 'all' ? 1 : 0,
    selectedPlatform !== 'all' ? 1 : 0,
    searchQuery.trim() ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedPlatform('all')
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md transition-colors border",
            hasActiveFilter
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{t("filter", { ns: "common" })}</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 z-10 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchItems")}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("category", { ns: "common" })}
            </span>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                {t("all", { ns: "common" })}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedCategory === category.id
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {CATEGORY_ICONS[category.id] || <LayoutGrid className="h-3.5 w-3.5" />}
                <span>{category.id === 'all' ? t("all", { ns: "common" }) : t(`categoryNames.${category.id}`, { ns: "media" })}</span>
              </button>
            ))}
          </div>
        </div>

        {platforms.length > 0 && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("platform", { ns: "common" })}
              </span>
              {selectedPlatform !== 'all' && (
                <button
                  onClick={() => setSelectedPlatform('all')}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  {t("all", { ns: "common" })}
                </button>
              )}
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              <button
                onClick={() => setSelectedPlatform('all')}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  selectedPlatform === 'all'
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Radio className="h-4 w-4 flex-shrink-0" />
                <span>{t("all", { ns: "common" })}</span>
              </button>
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    selectedPlatform === platform.id
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                    {platform.logoUrl ? (
                      <CachedImage
                        src={platform.logoUrl}
                        alt={platform.name}
                        className="h-4 w-4 object-contain"
                      />
                    ) : (
                      <Radio className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="truncate flex-1 text-left">{platform.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{platform.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasActiveFilter && (
          <div className="p-3 border-t">
            <button
              onClick={clearAllFilters}
              className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
            >
              {t("clearAllFilters", { ns: "common" })}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

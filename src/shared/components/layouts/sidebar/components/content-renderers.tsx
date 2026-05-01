import React from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { logger } from "@/lib/utils/logger"
import { TMDBItem } from "@/types/tmdb-item"
import {
  Calendar,
  PlayCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Plus,
  ExternalLink
} from "lucide-react"
import { SubtitleEpisodeGenerator } from "@/features/episode-generation/components/subtitle-episode-generator"
import { HardSubtitleExtractor } from "@/features/image-processing/components/hard-subtitle-extractor"
import { IndependentMaintenance } from "@/features/media-maintenance/components/independent-maintenance"
import { AiChat } from "@/features/ai/components/ai-chat"
import { ImageRecognition } from "@/features/image-processing/components/image-recognition"
import { ItemDetailDialog } from "@/features/media-maintenance/components/item-detail-dialog"
import { TMDBGuide } from "@/features/tmdb-import/guide"
import StreamingPlatformNav from "@/features/streaming-nav/components/streaming-platform-nav"
import { SidebarRegionNavigation } from "./sidebar-region-navigation"
import { ScheduleView } from "@/features/schedule/components/schedule-view"
import { toast } from "@/lib/hooks/use-toast"

interface MediaNewsItem {
  id: number
  title: string
  mediaType: 'movie' | 'tv'
  posterPath?: string | null
  releaseDate: string
  overview?: string
  voteAverage?: number
}

interface ContentRenderersProps {
  contentKey: string
  selectedItem: TMDBItem | null
  onUpdateItem: (item: TMDBItem) => void
  onDeleteItem: (id: string) => void
  onBackToList: () => void
  onOpenGlobalSettings: (section?: string) => void
  onQuickAddItem: (item: MediaNewsItem) => void
  children: React.ReactNode

  // Media news props
  upcomingItems: MediaNewsItem[]
  recentItems: MediaNewsItem[]
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null | undefined
  recentError: string | null | undefined
  upcomingLastUpdated: string | null | undefined
  recentLastUpdated: string | null | undefined
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  isMissingApiKey: boolean
  upcomingItemsByRegion: Record<string, MediaNewsItem[]>
  recentItemsByRegion: Record<string, MediaNewsItem[]>
  existingItems: TMDBItem[]
  fetchUpcomingItems: (silent?: boolean, retryCount?: number, region?: string) => void
  fetchRecentItems: (silent?: boolean, retryCount?: number, region?: string) => void
  setSelectedRegion: (region: string) => void

  // Components
  ApiKeySetupGuide: React.ComponentType
  VideoScreenshot: React.ComponentType
  ImageCropper: React.ComponentType
}

export function ContentRenderers({
  contentKey,
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  onBackToList,
  onOpenGlobalSettings,
  onQuickAddItem,
  children,

  // Media news
  upcomingItems,
  recentItems,
  loadingUpcoming,
  loadingRecent,
  upcomingError,
  recentError,
  upcomingLastUpdated,
  recentLastUpdated,
  selectedRegion,
  mediaNewsType,
  isMissingApiKey,
  upcomingItemsByRegion,
  recentItemsByRegion,
  existingItems,
  fetchUpcomingItems,
  fetchRecentItems,
  setSelectedRegion,

  // Components
  ApiKeySetupGuide,
  VideoScreenshot,
  ImageCropper
}: ContentRenderersProps) {
  const { t } = useTranslation("nav.news")

  // Render item detail page
  if (selectedItem && contentKey === 'item-detail') {
    return (
      <div className="h-full overflow-hidden">
        <ItemDetailDialog
          item={selectedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) onBackToList()
          }}
          onUpdate={onUpdateItem}
          onDelete={onDeleteItem}
          displayMode="inline"
        />
      </div>
    )
  }

  // Render maintenance content (包括 maintenance-list 和原有的分类子菜单)
  if ((contentKey === 'maintenance-list' || (contentKey.startsWith('maintenance-') && contentKey !== 'maintenance-independent'))) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-4 h-full overflow-y-auto">
        <div
          onClick={(e) => {
            const target = e.target as HTMLElement
            const mediaCard = target.closest('[data-media-card]')
            if (mediaCard) {
              const itemData = mediaCard.getAttribute('data-item')
              if (itemData) {
                try {
                  JSON.parse(itemData)
                } catch (error) {
                  logger.error('Failed to parse item data:', error)
                }
              }
            }
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  // Render independent maintenance
  if (contentKey === 'maintenance-independent') {
    return (
      <div className="h-full">
        <IndependentMaintenance onShowSettingsDialog={onOpenGlobalSettings} />
      </div>
    )
  }

  // Content - episode generator
  if (contentKey === 'content-episode-generator') {
    return (
      <div className="h-full">
        <SubtitleEpisodeGenerator
          onOpenGlobalSettings={onOpenGlobalSettings}
        />
      </div>
    )
  }

  // Content - AI chat
  if (contentKey === 'content-ai-chat') {
    return (
      <div className="h-full">
        <AiChat />
      </div>
    )
  }

  // Content - hard subtitle extract
  if (contentKey === 'content-hard-subtitle-extract') {
    return (
      <div className="h-full">
        <HardSubtitleExtractor />
      </div>
    )
  }

  // Tools - image recognition
  if (contentKey === 'tools-image-recognition' || contentKey === 'tools-image-recognition-recognize') {
    return (
      <div className="h-full">
        <ImageRecognition />
      </div>
    )
  }

  // News - upcoming
  if (contentKey === 'news-upcoming') {
    return renderUpcomingContent({
      upcomingItems,
      loadingUpcoming,
      upcomingError,
      upcomingLastUpdated,
      selectedRegion,
      mediaNewsType,
      isMissingApiKey,
      upcomingItemsByRegion,
      existingItems,
      fetchUpcomingItems,
      setSelectedRegion,
      onQuickAddItem,
      ApiKeySetupGuide,
      t
    })
  }

  // News - streaming nav
  if (contentKey === 'news-streaming-nav') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="min-h-full">
          <StreamingPlatformNav />
        </div>
      </div>
    )
  }

  // News - recent
  if (contentKey === 'news-recent') {
    return renderRecentContent({
      recentItems,
      loadingRecent,
      recentError,
      recentLastUpdated,
      selectedRegion,
      mediaNewsType,
      isMissingApiKey,
      recentItemsByRegion,
      existingItems,
      fetchRecentItems,
      setSelectedRegion,
      onQuickAddItem,
      ApiKeySetupGuide,
      t
    })
  }

  // News - schedule
  if (contentKey === 'news-schedule') {
    return (
      <div className="h-full overflow-hidden">
        <ScheduleView />
      </div>
    )
  }

  // Image - extract
  if (contentKey === 'image-extract') {
    const VideoScreenshotComponent = VideoScreenshot as React.ComponentType<{ onOpenGlobalSettings?: (section?: string) => void }>
    return <VideoScreenshotComponent onOpenGlobalSettings={onOpenGlobalSettings} />
  }

  // Image - crop
  if (contentKey === 'image-crop') {
    return (
      <div className="h-full w-full overflow-hidden">
        <ImageCropper />
      </div>
    )
  }

  // Tools - tmdb guide
  if (contentKey === 'tools-tmdb-guide') {
    return <TMDBGuide activeSection="general" />
  }

  // Default - no content selected
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-lg border border-gray-200 dark:border-gray-700 max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
          {t("selectMenu")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t("selectMenuDesc")}
        </p>
      </div>
    </div>
  )
}

// Helper function to render upcoming content
function renderUpcomingContent({
  upcomingItems,
  loadingUpcoming,
  upcomingError,
  upcomingLastUpdated,
  selectedRegion,
  mediaNewsType,
  isMissingApiKey,
  upcomingItemsByRegion,
  existingItems,
  fetchUpcomingItems,
  setSelectedRegion,
  onQuickAddItem,
  ApiKeySetupGuide,
  t
}: {
  upcomingItems: MediaNewsItem[]
  loadingUpcoming: boolean
  upcomingError: string | null | undefined
  upcomingLastUpdated: string | null | undefined
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  isMissingApiKey: boolean
  upcomingItemsByRegion: Record<string, MediaNewsItem[]>
  existingItems: TMDBItem[]
  fetchUpcomingItems: (silent?: boolean, retryCount?: number, region?: string) => void
  setSelectedRegion: (region: string) => void
  onQuickAddItem: (item: MediaNewsItem) => void
  ApiKeySetupGuide: React.ComponentType
  t: TFunction<"nav.news">
}) {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Content header */}
      <div className="flex items-center mb-6">
        <div className="relative mr-3">
          <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
        <div>
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {t("upcoming")}
            </h2>
            {upcomingItems.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                {upcomingItems.filter(upcomingItem =>
                  !existingItems.some(item =>
                    item.tmdbId === upcomingItem.id.toString() &&
                    item.mediaType === upcomingItem.mediaType
                  )
                ).length}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {upcomingLastUpdated ? `${t("lastUpdate")}: ${upcomingLastUpdated}` : t("upcomingDesc")}
          </p>
        </div>
      </div>

      {/* Region navigation */}
      <SidebarRegionNavigation
        selectedRegion={selectedRegion}
        mediaNewsType={mediaNewsType}
        upcomingItemsByRegion={upcomingItemsByRegion as any}
        recentItemsByRegion={{} as any}
        existingItems={existingItems}
        onRefresh={() => fetchUpcomingItems(false, 0, selectedRegion)}
        onRegionSelect={setSelectedRegion}
        isLoading={loadingUpcoming}
      />

      {/* Media news content */}
      <div>
        {isMissingApiKey && <ApiKeySetupGuide />}

        {loadingUpcoming ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("mediaNewsSection.loading")}</p>
            </div>
          </div>
        ) : upcomingError ? (
          <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex flex-col items-center text-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                {upcomingError}
              </p>
              <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                {isMissingApiKey
                  ? t("mediaNewsSection.configureApiKey")
                  : t("checkNetworkOrRetry")}
              </p>
              <Button
                onClick={() => fetchUpcomingItems(false, 0, selectedRegion)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("mediaNewsSection.refresh")}
              </Button>
            </div>
          </div>
        ) : upcomingItems.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-1">
              {t("mediaNewsSection.noContentUpcoming")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {t("mediaNewsSection.noContentUpcoming")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {upcomingItems
              .filter(upcomingItem =>
                !existingItems.some(item =>
                  item.tmdbId === upcomingItem.id.toString() &&
                  item.mediaType === upcomingItem.mediaType
                )
              )
              .map((item) => (
                <MediaNewsCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  onQuickAdd={onQuickAddItem}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to render recent content
function renderRecentContent({
  recentItems,
  loadingRecent,
  recentError,
  recentLastUpdated,
  selectedRegion,
  mediaNewsType,
  isMissingApiKey,
  recentItemsByRegion,
  existingItems,
  fetchRecentItems,
  setSelectedRegion,
  onQuickAddItem,
  ApiKeySetupGuide,
  t
}: {
  recentItems: MediaNewsItem[]
  loadingRecent: boolean
  recentError: string | null | undefined
  recentLastUpdated: string | null | undefined
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  isMissingApiKey: boolean
  recentItemsByRegion: Record<string, MediaNewsItem[]>
  existingItems: TMDBItem[]
  fetchRecentItems: (silent?: boolean, retryCount?: number, region?: string) => void
  setSelectedRegion: (region: string) => void
  onQuickAddItem: (item: MediaNewsItem) => void
  ApiKeySetupGuide: React.ComponentType
  t: TFunction<"nav.news">
}) {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Content header */}
      <div className="flex items-center mb-6">
        <div className="relative mr-3">
          <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
            <PlayCircle className="h-5 w-5" />
          </div>
        </div>
        <div>
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {t("recent")}
            </h2>
            {recentItems.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                {recentItems.filter(recentItem =>
                  !existingItems.some(item =>
                    item.tmdbId === recentItem.id.toString() &&
                    item.mediaType === recentItem.mediaType
                  )
                ).length}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {recentLastUpdated ? `${t("lastUpdate")}: ${recentLastUpdated}` : t("recentDesc")}
          </p>
        </div>
      </div>

      {/* Region navigation */}
      <SidebarRegionNavigation
        selectedRegion={selectedRegion}
        mediaNewsType={mediaNewsType}
        upcomingItemsByRegion={{} as any}
        recentItemsByRegion={recentItemsByRegion as any}
        existingItems={existingItems}
        onRefresh={() => fetchRecentItems(false, 0, selectedRegion)}
        onRegionSelect={setSelectedRegion}
        isLoading={loadingRecent}
      />

      {/* Media news content */}
      <div>
        {isMissingApiKey && <ApiKeySetupGuide />}

        {loadingRecent ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("mediaNewsSection.loading")}</p>
            </div>
          </div>
        ) : recentError ? (
          <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex flex-col items-center text-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                {recentError}
              </p>
              <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                {isMissingApiKey
                  ? t("mediaNewsSection.configureApiKey")
                  : t("checkNetworkOrRetry")}
              </p>
              <Button
                onClick={() => fetchRecentItems(false, 0, selectedRegion)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("mediaNewsSection.refresh")}
              </Button>
            </div>
          </div>
        ) : recentItems.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-1">
              {t("mediaNewsSection.noContentRecent")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {t("mediaNewsSection.noContentRecent")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {recentItems
              .filter(recentItem =>
                !existingItems.some(item =>
                  item.tmdbId === recentItem.id.toString() &&
                  item.mediaType === recentItem.mediaType
                )
              )
              .map((item) => (
                <MediaNewsCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  onQuickAdd={onQuickAddItem}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Media news card component
function MediaNewsCard({ item, onQuickAdd }: { item: MediaNewsItem; onQuickAdd: (item: MediaNewsItem) => void }) {
  const { t, i18n } = useTranslation("nav.news")

  const isUpcoming = new Date(item.releaseDate) > new Date()
  const badgeColor = isUpcoming ? "bg-blue-500" : "bg-green-500"

  const today = new Date()
  const releaseDate = new Date(item.releaseDate)
  const daysDiff = Math.abs(Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  const timeText = isUpcoming
    ? daysDiff <= 0 ? t("mediaNewsSection.todayUpoming") : daysDiff === 1 ? t("mediaNewsSection.tomorrowUpoming") : `${daysDiff}${t("mediaNewsSection.daysLaterUpoming")}`
    : daysDiff <= 0 ? t("mediaNewsSection.todayAired") : daysDiff === 1 ? t("mediaNewsSection.yesterdayAired") : `${daysDiff}${t("mediaNewsSection.daysAgoAired")}`

  const localeMap: Record<string, string> = {
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-HK': 'zh-HK',
    'en-US': 'en-US',
    'ja-JP': 'ja-JP',
    'ko-KR': 'ko-KR'
  }
  const currentLocale = localeMap[i18n.language] || 'zh-CN'

  function handleAddClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onQuickAdd(item)
  }

  return (
    <div className="group">
      {/* Release date badge */}
      <div className="mb-2">
        <Badge className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full`}>
          {new Date(item.releaseDate).toLocaleDateString(currentLocale)}
        </Badge>
      </div>

      {/* Poster container */}
      <div className="block cursor-pointer" title={item.title}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl dark:group-hover:shadow-blue-900/40">
          <img
            src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "/placeholder.svg"}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
            {/* Hover buttons */}
            <div className="flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
              <button
                className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-blue-500/50 group-hover:rotate-3"
                title={t("mediaNewsSection.addToMaintenanceList")}
                onClick={handleAddClick}
              >
                <Plus className="h-5 w-5" />
              </button>

              <a
                href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-800/80 hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-gray-800/50 group-hover:-rotate-3"
                title={t("mediaNewsSection.viewOnTmdb")}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>

            {/* Time text */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="text-xs font-medium text-white/95 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                {item.mediaType === 'movie' ? t("mediaNewsSection.movie") : t("mediaNewsSection.tv")}
                <span className="mx-1">·</span>
                {timeText}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 space-y-1 relative z-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">{item.mediaType === 'movie' ? t("mediaNewsSection.movie") : t("mediaNewsSection.tv")}</span>
            <span className="mx-1">·</span>
            <span className="flex items-center">{timeText}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState, memo, useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/shared/components/ui/badge"
import { ExternalLink, MousePointer2, Zap, Clock, Settings } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"
import { Button } from "@/shared/components/ui/button"
import { CachedImage } from "@/shared/components/ui/cached-image"
import { CLICK_RESET_DELAY, TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZE } from "@/lib/constants/constants"
import { getTimeFromCron } from "@/lib/utils/cron-utils"
import { CardDrawer } from "./card-drawer"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"
import { safeJsonParse } from "@/lib/utils"

interface MediaCardProps {
  item: TMDBItem
  itemId: string
  onItemClick: (itemId: string) => void
  showAirTime?: boolean
}

interface ScheduleTaskInfo {
  enabled: boolean;
  cron: string;
}

function MediaCardComponent({ item, itemId, onItemClick, showAirTime = false }: MediaCardProps) {
  const { t } = useTranslation('media')
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [scheduleTask, setScheduleTask] = useState<ScheduleTaskInfo | null>(null)
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false)
  const [tmdbButtonBehavior, setTmdbButtonBehavior] = useState<'detail' | 'search'>('detail')
  const cardRef = useRef<HTMLDivElement>(null)

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
    async function loadScheduleTask() {
      try {
        const response = await fetch(`/api/schedule/tasks?itemId=${itemId}`)
        const data = await response.json()
        if (data.success && data.data) {
          setScheduleTask({
            enabled: data.data.enabled,
            cron: data.data.cron,
          })
        }
      } catch {
        // ignore error
      }
    }
    loadScheduleTask()
  }, [itemId])

  useEffect(() => {
    async function loadTmdbButtonBehavior() {
      try {
        const savedSettings = await ClientConfigManager.getItem("general_settings")
        if (savedSettings) {
          const parsed = safeJsonParse<{ tmdbButtonBehavior?: 'detail' | 'search' }>(savedSettings)
          if (parsed?.tmdbButtonBehavior) {
            setTmdbButtonBehavior(parsed.tmdbButtonBehavior)
          }
        }
      } catch {
        // ignore error, use default
      }
    }
    loadTmdbButtonBehavior()

    // 监听配置更新事件
    const handleSettingsUpdate = (event: CustomEvent<{ tmdbButtonBehavior?: 'detail' | 'search' }>) => {
      if (event.detail?.tmdbButtonBehavior) {
        setTmdbButtonBehavior(event.detail.tmdbButtonBehavior)
      }
    }

    window.addEventListener('general-settings-updated', handleSettingsUpdate as EventListener)
    return () => window.removeEventListener('general-settings-updated', handleSettingsUpdate as EventListener)
  }, [])

  const posterUrl = item.posterUrl || `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZE}/placeholder.jpg`

  const isDailyUpdate = Boolean(
    item.isDailyUpdate ||
    (item.isDailyUpdate === undefined && (item.category === "tv" || item.category === "short"))
  )

  const getProgress = (): number => {
    if (!item.seasons?.length) return 0;

    const totalCompleted = item.seasons.reduce(
      (sum, season) => sum + (season.currentEpisode || 0),
      0
    );
    const totalEpisodes = item.seasons.reduce(
      (sum, season) => sum + season.totalEpisodes,
      0
    );

    return totalEpisodes > 0 ? (totalCompleted / totalEpisodes) * 100 : 0;
  };

  const completedEpisodes = item.seasons?.reduce(
    (sum, season) => sum + (season.currentEpisode || 0),
    0
  ) ?? 0;

  const getTimeOnly = (): string => item.airTime ?? "19:00";

  const hasSecondWeekday = typeof item.secondWeekday === 'number' && item.secondWeekday >= 0;

  const getAirTimeDisplay = (): string => {
    const airTime = getTimeOnly();
    const weekdays: string[] = [];

    if (item.weekday !== undefined && item.weekday !== null) {
      const adjustedWeekday1 = item.weekday === 0 ? 6 : item.weekday - 1;
      weekdays.push(WEEKDAYS[adjustedWeekday1]);
    }

    if (hasSecondWeekday) {
      const adjustedWeekday2 = item.secondWeekday === 0 ? 6 : item.secondWeekday - 1;
      weekdays.push(WEEKDAYS[adjustedWeekday2]);
    }

    return `${weekdays.join('')} ${airTime}`;
  };

  const getUpdateText = (): string => {
    if (item.status === "completed") {
      return item.totalEpisodes ? t("totalEpisodes", { count: item.totalEpisodes, ns: "media" }) : t("completed", { ns: "media" });
    }

    if (item.seasons?.length) {
      const latestSeason = item.seasons.reduce(
        (latest, season) =>
          season.seasonNumber > (latest?.seasonNumber ?? -1) ? season : latest,
        null as typeof item.seasons[0] | null
      );

      return t("maintainedToEpisode", { count: latestSeason?.currentEpisode ?? 0, ns: "media" });
    }

    return t("maintainedToEpisode", { count: completedEpisodes, ns: "media" });
  };

  const getCompletionDate = (): string | null => {
    try {
      return new Date(item.updatedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const handleImageError = useCallback((): void => {
    setImageError(true);
  }, []);

  const handleCardClick = (): void => {
    setIsClicked(true);
    onItemClick(itemId);
    setTimeout(() => setIsClicked(false), CLICK_RESET_DELAY);
  };

  return (
    <div
      ref={cardRef}
      className="cursor-pointer group relative"
      data-media-card="true"
      data-item={JSON.stringify(item)}
    >
      {showAirTime && (
        <div className="mb-2 flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
          {item.status === "completed" ? (
            <Badge className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
              {getCompletionDate() ? `${getCompletionDate()} ${t("completedShort", { ns: "media" })}` : t("completed", { ns: "media" })}
            </Badge>
          ) : (
            <>
              {isDailyUpdate ? (
                <Badge className={`text-white text-xs px-2 py-1 rounded-full flex items-center whitespace-nowrap ${scheduleTask?.enabled ? "bg-purple-500" : "bg-blue-500"}`}>
                  {scheduleTask?.enabled ? (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      {t("daily", { ns: "media" })} {getTimeOnly()} <span className="mx-1">·</span> {getTimeFromCron(scheduleTask.cron)}
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1 animate-pulse" />
                      {t("daily", { ns: "media" })} {getTimeOnly()}
                    </>
                  )}
                </Badge>
              ) : (
                <Badge className={`text-white text-xs px-2 py-1 rounded-full flex items-center whitespace-nowrap ${scheduleTask?.enabled ? "bg-purple-500" : (item.weekday === new Date().getDay() || (hasSecondWeekday && item.secondWeekday === new Date().getDay())) ? "bg-red-500 animate-pulse" : "bg-green-500"}`}>
                  {scheduleTask?.enabled ? (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      {getAirTimeDisplay()} <span className="mx-1">·</span> {getTimeFromCron(scheduleTask.cron)}
                    </>
                  ) : (
                    getAirTimeDisplay()
                  )}
                </Badge>
              )}
            </>
          )}
        </div>
      )}

      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-150 ${
          isClicked
            ? "scale-95 brightness-110"
            : "group-hover:scale-[1.02] group-hover:shadow-xl dark:group-hover:shadow-blue-900/30"
        }`}
        onClick={handleCardClick}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        )}

        <CachedImage
          src={
            !imageError
              ? posterUrl
              : `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZE}/placeholder.jpg`
          }
          alt={item.title}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={handleImageError}
          onLoad={() => setImageLoaded(true)}
          showSkeleton={true}
        />

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-md px-3 py-2 border border-white/20 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
              <div className="flex items-center justify-center space-x-2">
                <MousePointer2 className="h-3 w-3 text-blue-600" />
                <p className="text-xs font-medium text-gray-900">{t("clickToViewDetails", { ns: "media" })}</p>
              </div>
            </div>
          </div>

          <div className="absolute top-2 right-2 flex flex-col space-y-1 transform translate-x-1 group-hover:translate-x-0 transition-transform duration-200">
            {item.tmdbUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  if (tmdbButtonBehavior === 'search' && item.title) {
                    const searchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(item.title)}`
                    window.open(searchUrl, "_blank")
                  } else {
                    window.open(item.tmdbUrl, "_blank")
                  }
                }}
                className="bg-blue-500/90 hover:bg-blue-600 text-white text-xs px-2 py-1 h-6 backdrop-blur-sm border-0 shadow-md"
                title={t("visitTmdbPage", { ns: "media" })}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {t("tmdb", { ns: "media" })}
              </Button>
            )}

            {item.platformUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(item.platformUrl, "_blank")
                }}
                className="bg-green-500/90 hover:bg-green-600 text-white text-xs px-2 py-1 h-6 backdrop-blur-sm border-0 shadow-md"
                title={t("visitStreamingPlatform", { ns: "media" })}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {t("streamingPlatform", { ns: "media" })}
              </Button>
            )}

            {scheduleTask?.enabled && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  setScheduleDrawerOpen(true)
                }}
                className="bg-purple-500/90 hover:bg-purple-600 text-white text-xs px-2 py-1 h-6 backdrop-blur-sm border-0 shadow-md"
                title={t("scheduleTask", { ns: "media" })}
              >
                <Settings className="h-3 w-3 mr-1" />
                {t("scheduled", { ns: "media" })}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1 relative z-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{getUpdateText()}</p>
      </div>

      <CardDrawer
        item={item as any}
        open={scheduleDrawerOpen}
        onOpenChange={setScheduleDrawerOpen}
        cardRef={cardRef}
      />
    </div>
  )
}

export default memo(MediaCardComponent, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item
})
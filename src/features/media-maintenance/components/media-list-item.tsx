'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ExternalLink, Zap, Clock, Settings } from 'lucide-react';
import type { TMDBItem } from '@/lib/data/storage';
import { CachedImage } from '@/shared/components/ui/cached-image';
import {
  CLICK_RESET_DELAY,
  TMDB_IMAGE_BASE_URL,
  TMDB_POSTER_SIZE,
} from '@/lib/constants/constants';
import { cn, safeJsonParse } from '@/lib/utils';
import { getTimeFromCron } from '@/lib/utils/cron-utils';
import { CardDrawer } from './card-drawer';
import { ClientConfigManager } from '@/lib/utils/client-config-manager';

interface MediaListItemProps {
  item: TMDBItem;
  onItemClick: (itemId: string) => void;
}

interface ScheduleTaskInfo {
  enabled: boolean;
  cron: string;
}

function MediaListItemComponent({ item, onItemClick }: MediaListItemProps) {
  const { t, i18n } = useTranslation('media');
  const [imageError, setImageError] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [scheduleTask, setScheduleTask] = useState<ScheduleTaskInfo | null>(null);
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [tmdbButtonBehavior, setTmdbButtonBehavior] = useState<'detail' | 'search'>('detail');
  const cardRef = useRef<HTMLDivElement>(null);

  const WEEKDAYS = [
    t('weekdaysList.monday'),
    t('weekdaysList.tuesday'),
    t('weekdaysList.wednesday'),
    t('weekdaysList.thursday'),
    t('weekdaysList.friday'),
    t('weekdaysList.saturday'),
    t('weekdaysList.sunday'),
  ];

  useEffect(() => {
    async function loadScheduleTask() {
      try {
        const response = await fetch(`/api/schedule/tasks?itemId=${item.id}`);
        const data = await response.json();
        if (data.success && data.data) {
          setScheduleTask({
            enabled: data.data.enabled,
            cron: data.data.cron,
          });
        }
      } catch {
        // ignore error
      }
    }
    loadScheduleTask();
  }, [item.id]);

  useEffect(() => {
    async function loadTmdbButtonBehavior() {
      try {
        const savedSettings = await ClientConfigManager.getItem('general_settings');
        if (savedSettings) {
          const parsed = safeJsonParse<{ tmdbButtonBehavior?: 'detail' | 'search' }>(savedSettings);
          if (parsed?.tmdbButtonBehavior) {
            setTmdbButtonBehavior(parsed.tmdbButtonBehavior);
          }
        }
      } catch {
        // ignore error, use default
      }
    }
    loadTmdbButtonBehavior();

    const handleSettingsUpdate = (
      event: CustomEvent<{ tmdbButtonBehavior?: 'detail' | 'search' }>
    ) => {
      if (event.detail?.tmdbButtonBehavior) {
        setTmdbButtonBehavior(event.detail.tmdbButtonBehavior);
      }
    };

    window.addEventListener('general-settings-updated', handleSettingsUpdate as EventListener);
    return () =>
      window.removeEventListener('general-settings-updated', handleSettingsUpdate as EventListener);
  }, []);

  const backdropUrl = item.backdropUrl || item.backdropPath
    ? `${TMDB_IMAGE_BASE_URL}/w780${item.backdropPath}`
    : null;
  const posterUrl = item.posterUrl || `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZE}/placeholder.jpg`;
  const displayImage = backdropUrl || posterUrl;

  const isDailyUpdate = Boolean(
    item.isDailyUpdate ||
    (item.isDailyUpdate === undefined && (item.category === 'tv' || item.category === 'short'))
  );

  const completedEpisodes =
    item.seasons?.reduce((sum, season) => sum + (season.currentEpisode || 0), 0) ?? 0;

  const totalEpisodes =
    item.totalEpisodes || item.seasons?.reduce((sum, season) => sum + season.totalEpisodes, 0) || 0;

  const hasSecondWeekday = typeof item.secondWeekday === 'number' && item.secondWeekday >= 0;

  const isAiringToday = item.weekday === new Date().getDay() ||
    (hasSecondWeekday && item.secondWeekday! === new Date().getDay());

  const getProgressPercent = (): number => {
    if (totalEpisodes > 0) {
      return Math.round((completedEpisodes / totalEpisodes) * 100);
    }
    return 0;
  };

  const getProgressText = (): string => {
    if (item.status === 'completed') {
      return item.totalEpisodes
        ? t('totalEpisodes', { count: item.totalEpisodes, ns: 'media' })
        : t('completed', { ns: 'media' });
    }
    if (item.seasons?.length) {
      const latestSeason = item.seasons.reduce(
        (latest, season) => (season.seasonNumber > (latest?.seasonNumber ?? -1) ? season : latest),
        null as (typeof item.seasons)[0] | null
      );
      return t('maintainedToEpisode', { count: latestSeason?.currentEpisode ?? 0, ns: 'media' });
    }
    return t('maintainedToEpisode', { count: completedEpisodes, ns: 'media' });
  };

  const getAirTimeDisplay = (): string => {
    const airTime = item.airTime ?? '19:00';
    const weekdays: string[] = [];

    if (item.weekday !== undefined && item.weekday !== null) {
      const adjustedWeekday1 = item.weekday === 0 ? 6 : item.weekday - 1;
      weekdays.push(WEEKDAYS[adjustedWeekday1]);
    }

    if (hasSecondWeekday) {
      const adjustedWeekday2 = item.secondWeekday === 0 ? 6 : item.secondWeekday! - 1;
      weekdays.push(WEEKDAYS[adjustedWeekday2]);
    }

    return `${weekdays.join('')} ${airTime}`;
  };

  const getCompletionDate = (): string | null => {
    try {
      return new Date(item.updatedAt).toLocaleDateString(i18n.language || 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const getScheduleText = (): string | null => {
    if (item.status === 'completed') return null;

    if (scheduleTask?.enabled) {
      return `${getAirTimeDisplay()} · ${getTimeFromCron(scheduleTask.cron)}`;
    }
    if (isDailyUpdate) {
      return `${t('daily', { ns: 'media' })} ${item.airTime ?? '19:00'}`;
    }
    return getAirTimeDisplay();
  };

  const handleClick = useCallback(() => {
    setIsClicked(true);
    onItemClick(item.id);
    setTimeout(() => setIsClicked(false), CLICK_RESET_DELAY);
  }, [item.id, onItemClick]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group',
        'bg-zinc-900 shadow-lg hover:shadow-2xl transition-all duration-300',
        isClicked && 'scale-[0.98]'
      )}
      data-media-card="true"
      data-item={JSON.stringify(item)}
      onClick={handleClick}
    >
      {/* Background image */}
      {!imageError && (
        <div className="absolute inset-0">
          <CachedImage
            src={displayImage}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            showSkeleton={true}
          />
        </div>
      )}

      {/* Bottom gradient + text */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div
          className="px-3.5 pt-12 pb-2"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
          }}
        >
          <h3 className="font-medium text-[13px] text-white leading-snug line-clamp-1 drop-shadow-sm">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className={cn(
              isAiringToday ? 'text-red-400' : 'text-white/60'
            )}>
              {item.status === 'completed'
                ? (getCompletionDate() || t('completed', { ns: 'media' }))
                : (getScheduleText() || '\u00A0')
              }
            </span>

            {item.status !== 'completed' && totalEpisodes > 0 && (
              <span className="text-white/50 tabular-nums">{getProgressText()}</span>
            )}
          </div>
        </div>

        {/* Progress bar - flush bottom */}
        {item.status !== 'completed' && totalEpisodes > 0 && (
          <div className="h-1 bg-black/40">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
        )}
      </div>

      {/* Completed indicator */}
      {item.status === 'completed' && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/70 z-10" />
      )}

      {/* Hover action buttons */}
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-md pointer-events-auto">
          {item.tmdbUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (tmdbButtonBehavior === 'search' && item.title) {
                  const searchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(item.title)}`;
                  window.open(searchUrl, '_blank');
                } else {
                  window.open(item.tmdbUrl, '_blank');
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
              title={t('visitTmdbPage', { ns: 'media' })}
            >
              <ExternalLink className="h-3 w-3" />
              TMDB
            </button>
          )}

          {(() => {
            const url = item.defaultPlatformUrl || item.platformUrls?.[0];
            if (!url) return null;
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
                title={t('visitStreamingPlatform', { ns: 'media' })}
              >
                <ExternalLink className="h-3 w-3" />
                {t('streamingPlatform', { ns: 'media' })}
              </button>
            );
          })()}

          {scheduleTask?.enabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScheduleDrawerOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
              title={t('scheduleTask', { ns: 'media' })}
            >
              <Settings className="h-3 w-3" />
              {t('scheduled', { ns: 'media' })}
            </button>
          )}
        </div>
      </div>

      <CardDrawer
        item={item as any}
        open={scheduleDrawerOpen}
        onOpenChange={setScheduleDrawerOpen}
        cardRef={cardRef}
      />
    </div>
  );
}

export default memo(MediaListItemComponent, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item;
});

'use client';

import { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Clock,
  Calendar,
  ArrowRight,
  Sparkles,
  Package,
  Info,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Markdown } from '@/shared/components/ui/markdown';
import { useUpdateCheck } from '@/lib/hooks/use-update-check';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage } from '@/lib/i18n';

const LOCALE_MAP: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-HK',
  'en-US': 'en-US',
  'ja-JP': 'ja-JP',
  'ko-KR': 'ko-KR',
};

export function VersionUpdatePanel() {
  const { t } = useTranslation('settings');
  const {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseInfo,
    lastChecked,
    isLoading,
    error,
    isCached,
    checkForUpdates,
  } = useUpdateCheck();

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkForUpdates();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getCurrentLanguage(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLastChecked = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return t('helpPanel.justNow');
    }
    if (minutes < 60) {
      return t('helpPanel.minutesAgo', { n: minutes });
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return t('helpPanel.hoursAgo', { n: hours });
    }
    return t('helpPanel.daysAgo', { n: Math.floor(hours / 24) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t('helpPanel.versionUpdate')}</h2>
          <p className="text-sm text-muted-foreground">{t('helpPanel.checkUpdateDesc')}</p>
        </div>
        <Button
          variant={hasUpdate ? 'default' : 'outline'}
          size="sm"
          onClick={() => checkForUpdates({ force: true })}
          disabled={isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          {t('helpPanel.checkNow')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className="p-1.5 rounded-md bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t('helpPanel.currentVersion')}
            </div>
            <div className="text-lg font-semibold truncate">{currentVersion}</div>
          </div>
          {!hasUpdate && !isLoading && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
        </div>

        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border bg-card',
            hasUpdate && 'border-primary bg-primary/5'
          )}
        >
          <div className={cn('p-1.5 rounded-md', hasUpdate ? 'bg-primary' : 'bg-muted')}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : hasUpdate ? (
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Package className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs text-muted-foreground">{t('helpPanel.latestVersion')}</span>
              {hasUpdate && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                  {t('helpPanel.hasUpdate')}
                </Badge>
              )}
            </div>
            <div className={cn('text-lg font-semibold truncate', hasUpdate && 'text-primary')}>
              {latestVersion}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {isCached && !error && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {t('helpPanel.cachedDataTime', { time: formatLastChecked(lastChecked) })}
        </div>
      )}

      {hasUpdate && releaseInfo && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(releaseInfo.html_url, '_blank')}
          >
            <Download className="h-3.5 w-3.5" />
            {t('helpPanel.downloadNewVersion')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')
            }
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('helpPanel.viewAllVersions')}
          </Button>
        </div>
      )}

      <Separator />

      {releaseInfo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t('helpPanel.releaseNotes')}</CardTitle>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {releaseInfo.name}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(releaseInfo.published_at)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="rounded-lg border h-[400px]">
              <ScrollArea className="h-full w-full">
                <div className="p-4">
                  <Markdown className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                    {releaseInfo.body || t('helpPanel.noReleaseNotes')}
                  </Markdown>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{t('helpPanel.viewHistoryVersions')}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper/releases', '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
          GitHub
        </Button>
      </div>
    </div>
  );
}

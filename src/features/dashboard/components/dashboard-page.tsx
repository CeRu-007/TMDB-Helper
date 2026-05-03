"use client"

import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDashboardData } from '../hooks/use-dashboard-data'
import { useShareImage } from '../hooks/use-share-image'
import { ProfileCard } from './profile-card'
import { MilestoneTimeline } from './milestone-timeline'
import { FunFacts } from './fun-facts'
import { AchievementBadges } from './achievement-badges'
import { MonthlyComparison } from './monthly-comparison'
import { SmartSuggestions } from './smart-suggestions'
import { StatsCards } from './stats-cards'
import { CategoryChart } from './category-chart'
import { WeekdayChart } from './weekday-chart'
import { CompletionProgressList } from './completion-progress-list'
import { RecentUpdatesList } from './recent-updates-list'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { ArrowsClockwise, Spinner, Image, DownloadSimple, ShareNetwork, WarningCircle } from '@phosphor-icons/react'

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const { data, loading, error, refresh } = useDashboardData()
  const { generating, previewOpen, imageDataUrl, error: shareError, openPreview, closePreview, downloadImage, shareImage } = useShareImage()
  const contentRef = useRef<HTMLDivElement>(null)

  const handleGenerate = () => {
    if (contentRef.current) {
      openPreview(contentRef.current)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm">
            <ArrowsClockwise className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleGenerate} disabled={generating} title={generating ? t('generating') : t('generateImage')}>
              {generating ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Image className="h-4 w-4" weight="bold" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} title={t('refresh')}>
              <ArrowsClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div ref={contentRef} className="space-y-6">
          <ProfileCard profile={data.profile} />

          <SmartSuggestions suggestions={data.smartSuggestions} />

          <StatsCards data={data.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart data={data.profile.categoryDistribution} />
            <WeekdayChart data={data.weekdayDistribution} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompletionProgressList items={data.completionProgress} />
            <RecentUpdatesList items={data.recentUpdatedItems} />
          </div>

          <FunFacts facts={data.funFacts} />

          <AchievementBadges achievements={data.achievements} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MilestoneTimeline milestones={data.milestones} />
            <MonthlyComparison data={data.monthlyComparison} />
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview() }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('previewTitle')}</DialogTitle>
            <DialogDescription>{t('previewDesc')}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 overflow-y-auto max-h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
            {shareError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <WarningCircle className="h-10 w-10 text-amber-500" weight="duotone" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('generateFailed')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs text-center">{shareError}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="mt-2">
                  {t('retry')}
                </Button>
              </div>
            ) : (
              imageDataUrl && (
                <img src={imageDataUrl} alt="Preview" className="w-full h-auto rounded shadow-sm" />
              )
            )}
          </div>
          {!shareError && imageDataUrl && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={downloadImage}>
                <DownloadSimple className="h-4 w-4 mr-2" weight="bold" />
                {t('download')}
              </Button>
              <Button size="sm" onClick={shareImage} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <ShareNetwork className="h-4 w-4 mr-2" weight="bold" />
                {t('share')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

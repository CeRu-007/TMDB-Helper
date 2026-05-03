"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDashboardData } from '../hooks/use-dashboard-data'
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
import { ArrowsClockwise, Spinner } from '@phosphor-icons/react'

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const { data, loading, error, refresh } = useDashboardData()

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
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <ArrowsClockwise className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>

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
  )
}

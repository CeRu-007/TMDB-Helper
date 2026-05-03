"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Progress } from '@/shared/components/ui/progress'

interface CompletionProgressListProps {
  items: Array<{
    id: string
    title: string
    category: string | null
    posterUrl: string | null
    totalEpisodes: number
    completedEpisodes: number
    progress: number
  }>
}

function getProgressBg(progress: number): string {
  if (progress >= 90) return '[&>div]:bg-green-500'
  if (progress >= 60) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

function getProgressColor(progress: number): string {
  if (progress >= 90) return 'text-green-600 dark:text-green-400'
  if (progress >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function CompletionProgressList({ items }: CompletionProgressListProps) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        {t('completionProgress')}
      </h3>
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">{t('allCompleted')}</div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate pr-2">{item.title}</span>
                  <span className={`text-xs font-medium flex-shrink-0 ${getProgressColor(item.progress)}`}>
                    {item.completedEpisodes}/{item.totalEpisodes}
                  </span>
                </div>
                <Progress value={item.progress} className={`h-1.5 ${getProgressBg(item.progress)}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

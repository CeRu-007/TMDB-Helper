"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'

interface RecentUpdatesListProps {
  items: Array<{
    id: string
    title: string
    category: string | null
    posterUrl: string | null
    updatedAt: string
    completed: number
  }>
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString()
}

const CATEGORY_STYLES: Record<string, string> = {
  anime: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  tv: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  kids: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  variety: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  short: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function RecentUpdatesList({ items }: RecentUpdatesListProps) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        {t('recentUpdates')}
      </h3>
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">{t('noData')}</div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.title}</span>
                  {item.category && (
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_STYLES[item.category] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {t(`categories.${item.category}`, item.category)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatRelativeTime(item.updatedAt)}
                  {item.completed ? ` · ${t('stats.completed')}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

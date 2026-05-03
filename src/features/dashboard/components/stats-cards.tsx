"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import type { DashboardData } from '../types/dashboard'
import {
  Database,
  CheckCircle,
  Clock,
  ArrowsClockwise,
  CalendarCheck,
} from '@phosphor-icons/react'

interface StatsCardsProps {
  data: DashboardData['stats']
}

export function StatsCards({ data }: StatsCardsProps) {
  const { t } = useTranslation('dashboard')

  const cards = [
    {
      label: t('stats.totalItems'),
      value: data.totalItems,
      icon: Database,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('stats.completed'),
      value: data.completedItems,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      sub: `${data.completionRate}%`,
    },
    {
      label: t('stats.inProgress'),
      value: data.inProgressItems,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: t('stats.todayUpdated'),
      value: data.todayUpdatedItems,
      icon: ArrowsClockwise,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: t('stats.scheduleTasks'),
      value: data.enabledScheduleTasks,
      icon: CalendarCheck,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      textColor: 'text-teal-600 dark:text-teal-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const IconComp = card.icon
        return (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                  {card.sub && (
                    <span className={`text-sm font-medium ${card.textColor}`}>{card.sub}</span>
                  )}
                </div>
              </div>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <IconComp className={card.textColor} size={18} weight="duotone" />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />
          </div>
        )
      })}
    </div>
  )
}

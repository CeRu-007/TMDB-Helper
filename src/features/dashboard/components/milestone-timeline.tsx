"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { DynamicIcon } from './dynamic-icon'

interface MilestoneTimelineProps {
  milestones: Array<{
    date: string
    title: string
    description: string
    icon: string
  }>
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const { t } = useTranslation('dashboard')

  if (milestones.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('milestones.title')}</h3>
        <div className="flex items-center justify-center h-[120px] text-gray-400 text-sm">{t('noData')}</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('milestones.title')}</h3>
      <div className="relative pl-8 space-y-4 max-h-[360px] overflow-y-auto">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
        {milestones.map((milestone, index) => (
          <div key={index} className="relative">
            <div className="absolute -left-5 top-1 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 flex items-center justify-center">
              <DynamicIcon name={milestone.icon} className="text-blue-500 dark:text-blue-400" size={12} weight="fill" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t(`milestones.${milestone.title}`, milestone.title)}
              </p>
              {milestone.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{milestone.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(milestone.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

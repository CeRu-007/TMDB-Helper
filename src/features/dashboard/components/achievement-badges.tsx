"use client"

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { DynamicIcon } from './dynamic-icon'

interface AchievementBadgesProps {
  achievements: Array<{
    id: string
    icon: string
    name: string
    description: string
    unlocked: boolean
    unlockedAt?: string
  }>
}

const ACHIEVEMENT_COLORS: Record<string, string> = {
  first_step: 'text-emerald-500',
  fifty_items: 'text-blue-500',
  hundred_items: 'text-violet-500',
  five_hundred: 'text-amber-500',
  lightning: 'text-yellow-500',
  ai_pioneer: 'text-cyan-500',
  perfectionist: 'text-rose-500',
  episode_master: 'text-orange-500',
  scheduler: 'text-teal-500',
  automator: 'text-indigo-500',
  veteran: 'text-stone-500',
  long_runner: 'text-sky-500',
  thousand_episodes: 'text-pink-500',
  all_categories: 'text-fuchsia-500',
}

export function AchievementBadges({ achievements }: AchievementBadgesProps) {
  const { t } = useTranslation('dashboard')
  const [selected, setSelected] = useState<typeof achievements[0] | null>(null)

  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('achievements.title')}</h3>
        <span className="text-xs text-gray-400">
          {unlockedCount}/{achievements.length} {t('achievements.unlocked')}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {achievements.map((achievement) => {
          const colorClass = ACHIEVEMENT_COLORS[achievement.id] || 'text-gray-500'
          return (
            <button
              key={achievement.id}
              onClick={() => setSelected(achievement)}
              className={`flex flex-col items-center p-3 rounded-lg transition-all cursor-pointer ${
                achievement.unlocked
                  ? 'bg-white dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md'
                  : 'bg-gray-50 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700 opacity-40 hover:opacity-60'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 ${
                achievement.unlocked
                  ? 'bg-gray-50 dark:bg-gray-600/30'
                  : 'bg-gray-100 dark:bg-gray-600/30'
              }`}>
                {achievement.unlocked ? (
                  <DynamicIcon name={achievement.icon} className={colorClass} size={22} weight="duotone" />
                ) : (
                  <Lock className="text-gray-400 dark:text-gray-500" size={22} weight="fill" />
                )}
              </div>
              <p className="text-[10px] text-center text-gray-600 dark:text-gray-400 leading-tight">
                {t(`achievements.${achievement.name}`)}
              </p>
            </button>
          )
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selected.unlocked
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'bg-gray-100 dark:bg-gray-600/30'
                  }`}>
                    {selected.unlocked ? (
                      <DynamicIcon name={selected.icon} className={ACHIEVEMENT_COLORS[selected.id] || 'text-gray-500'} size={32} weight="duotone" />
                    ) : (
                      <Lock className="text-gray-400 dark:text-gray-500" size={32} weight="fill" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-base">
                      {t(`achievements.${selected.name}`)}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      {selected.unlocked ? t('achievements.unlocked') : t('achievements.locked')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('achievements.condition')}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {t(`achievements.${selected.description}`)}
                  </p>
                </div>
                {selected.unlocked && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <DynamicIcon name="check-circle" className="text-green-500" size={16} weight="fill" />
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {selected.unlockedAt
                        ? t('achievements.unlockedAt', { date: new Date(selected.unlockedAt).toLocaleDateString() })
                        : t('achievements.unlocked')}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

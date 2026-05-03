"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/shared/components/user-identity-provider'
import { UserAvatarImage } from '@/shared/components/ui/smart-avatar'
import { DynamicIcon } from './dynamic-icon'

interface ProfileCardProps {
  profile: {
    type: string
    totalItems: number
    completedItems: number
    completionRate: number
    topCategory: string | null
    topCategoryRate: number
    automatedItems: number
    automationRate: number
    peakHour: number | null
    peakWeekday: number | null
    firstItemTitle: string | null
    firstItemDate: string | null
    topPosterUrls: string[]
    categoryDistribution: Array<{ category: string; count: number }>
  }
}

const PROFILE_STYLES: Record<string, { gradient: string; bgGlow: string; icon: string }> = {
  anime_guardian: { gradient: 'from-purple-500 to-pink-500', bgGlow: 'bg-purple-500', icon: 'sword' },
  drama_hunter: { gradient: 'from-blue-500 to-cyan-500', bgGlow: 'bg-blue-500', icon: 'tv' },
  kids_protector: { gradient: 'from-green-500 to-emerald-500', bgGlow: 'bg-green-500', icon: 'baby' },
  variety_master: { gradient: 'from-amber-500 to-orange-500', bgGlow: 'bg-amber-500', icon: 'mic-2' },
  short_runner: { gradient: 'from-red-500 to-rose-500', bgGlow: 'bg-red-500', icon: 'timer' },
  specialist: { gradient: 'from-indigo-500 to-violet-500', bgGlow: 'bg-indigo-500', icon: 'target' },
  perfectionist: { gradient: 'from-yellow-400 to-amber-500', bgGlow: 'bg-yellow-400', icon: 'sparkles' },
  automator: { gradient: 'from-cyan-500 to-teal-500', bgGlow: 'bg-cyan-500', icon: 'settings' },
  night_owl: { gradient: 'from-slate-600 to-indigo-800', bgGlow: 'bg-slate-600', icon: 'moon' },
  veteran: { gradient: 'from-stone-500 to-amber-700', bgGlow: 'bg-stone-500', icon: 'mountain' },
  explorer: { gradient: 'from-teal-500 to-blue-500', bgGlow: 'bg-teal-500', icon: 'compass' },
}

function PosterMosaic({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null

  const count = urls.length

  if (count === 1) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img src={urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-0.5 overflow-hidden">
        {urls.map((url, i) => (
          <div key={i} className="overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }

  if (count <= 4) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        {urls.slice(0, 4).map((url, i) => (
          <div key={i} className="overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }

  if (count <= 6) {
    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden">
        {urls.slice(0, 6).map((url, i) => (
          <div key={i} className="overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 overflow-hidden">
      {urls.slice(0, 9).map((url, i) => (
        <div key={i} className="overflow-hidden">
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  )
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { t } = useTranslation('dashboard')
  const { userInfo } = useUser()
  const style = PROFILE_STYLES[profile.type] || PROFILE_STYLES.explorer
  const hasPosters = profile.topPosterUrls.length > 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
      {hasPosters ? (
        <>
          <PosterMosaic urls={profile.topPosterUrls} />
          <div className="absolute inset-0 bg-black/50 dark:bg-black/60" />
          <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-20 mix-blend-overlay`} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </>
      ) : (
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-r ${style.gradient} opacity-10`} />
      )}

      <div className="relative p-6">
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className={`absolute inset-0 ${style.bgGlow} blur-xl opacity-30 rounded-full`} />
            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg overflow-hidden ring-4 ring-white/30 dark:ring-gray-800/50`}>
              {userInfo?.avatarUrl ? (
                <UserAvatarImage
                  src={userInfo.avatarUrl}
                  displayName={userInfo.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DynamicIcon name={style.icon} className="text-white" size={36} weight="duotone" />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br ${style.gradient} shadow-md flex items-center justify-center border border-white/30 dark:border-gray-700`}>
              <DynamicIcon name={style.icon} className="text-white" size={16} weight="fill" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm mb-1 ${hasPosters ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.yourType')}</p>
            <h2 className={`text-xl font-bold mb-2 drop-shadow-sm ${hasPosters ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              {t(`profile.types.${profile.type}.name`)}
            </h2>
            <p className={`text-sm drop-shadow-sm ${hasPosters ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
              {t(`profile.types.${profile.type}.desc`)}
            </p>
          </div>
        </div>

        <div className={`mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4 ${hasPosters ? 'pt-4 border-t border-white/15' : ''}`}>
          <div className="text-center">
            <p className={`text-2xl font-bold drop-shadow-sm ${hasPosters ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{profile.totalItems}</p>
            <p className={`text-xs ${hasPosters ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.totalItems')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400 drop-shadow-sm">{profile.completionRate}%</p>
            <p className={`text-xs ${hasPosters ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.completionRate')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400 drop-shadow-sm">{profile.automationRate}%</p>
            <p className={`text-xs ${hasPosters ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.automationRate')}</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold drop-shadow-sm ${hasPosters ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              {profile.peakHour !== null ? `${String(profile.peakHour).padStart(2, '0')}:00` : '-'}
            </p>
            <p className={`text-xs ${hasPosters ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.peakHour')}</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold drop-shadow-sm ${hasPosters ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              {profile.peakWeekday !== null ? t(`weekdays.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][profile.peakWeekday]}`) : '-'}
            </p>
            <p className={`text-xs ${hasPosters ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{t('profile.peakWeekday')}</p>
          </div>
        </div>

        {profile.firstItemTitle && (
          <div className={`mt-4 pt-4 ${hasPosters ? 'border-t border-white/15' : 'border-t border-gray-100 dark:border-gray-700'}`}>
            <p className={`text-xs ${hasPosters ? 'text-white/60' : 'text-gray-400'}`}>
              {t('profile.firstItem', { title: profile.firstItemTitle, date: profile.firstItemDate ? new Date(profile.firstItemDate).toLocaleDateString() : '' })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

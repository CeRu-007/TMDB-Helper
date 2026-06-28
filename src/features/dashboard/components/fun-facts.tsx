"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { DynamicIcon } from './dynamic-icon'

interface FunFactsProps {
  facts: Array<{
    key: string
    value: string | number
    label: string
    icon: string
  }>
}

const FACT_COLORS: Record<string, string> = {
  episodes_done: 'text-blue-500',
  automated_items: 'text-cyan-500',
  categories: 'text-violet-500',
  total_seasons: 'text-amber-500',
  most_invested: 'text-orange-500',
  task_success_rate: 'text-emerald-500',
  peak_day: 'text-rose-500',
  peak_day_date: 'text-teal-500',
  most_edited: 'text-pink-500',
}

export function FunFacts({ facts }: FunFactsProps) {
  const { t } = useTranslation('dashboard')

  if (facts.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 md:p-5">
      <h3 className="text-sm font-medium text-foreground mb-3 md:mb-4">{t('funFacts.title')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        {facts.map((fact) => {
          const colorClass = FACT_COLORS[fact.key] || 'text-muted-foreground'
          return (
            <div
              key={fact.key}
              className="flex flex-col items-center p-3 rounded-lg bg-muted/30 text-center"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${colorClass} bg-opacity-10`}>
                <DynamicIcon name={fact.icon} className={colorClass} size={22} weight="bold" />
              </div>
              <p className="text-lg font-bold text-foreground truncate max-w-full">{fact.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{t(`funFacts.${fact.label}`, fact.label)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Warning, Lightbulb, Info, CheckCircle } from '@phosphor-icons/react'

interface SmartSuggestionsProps {
  suggestions: Array<{
    type: string
    message: string
    priority: number
  }>
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bgClass: string; textClass: string; borderClass: string }> = {
  warning: {
    icon: Warning,
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  tip: {
    icon: Lightbulb,
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  info: {
    icon: Info,
    bgClass: 'bg-muted/50',
    textClass: 'text-foreground',
    borderClass: 'border-border',
  },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    textClass: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-200 dark:border-green-800',
  },
}

export function SmartSuggestions({ suggestions }: SmartSuggestionsProps) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 md:p-5">
      <h3 className="text-sm font-medium text-foreground mb-3 md:mb-4">
        {t('smartSuggestions')}
      </h3>
      {suggestions.length === 0 ? (
        <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
          {t('noSuggestions')}
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => {
            const config = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.info
            const Icon = config.icon
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgClass} ${config.borderClass}`}
              >
                <Icon className="mt-0.5 flex-shrink-0" size={18} weight="duotone" />
                <p className={`text-sm ${config.textClass}`}>{suggestion.message}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

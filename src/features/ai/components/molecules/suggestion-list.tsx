import React from 'react'
import { SuggestionChip } from '../atoms/suggestion-chip'
import { useTranslation } from "react-i18next"

interface SuggestionListProps {
  suggestions?: string[]
  onSuggestionClick: (suggestion: string) => void
}

export function SuggestionList({ suggestions, onSuggestionClick }: SuggestionListProps) {
  const { t } = useTranslation("ai-chat")
  const defaultSuggestions = [
    t("plotSummary"),
    t("plotDetails"),
    t("worldBuilding")
  ]

  const displaySuggestions = suggestions && suggestions.length > 0
    ? [t("plotSummary"), ...suggestions]
    : defaultSuggestions

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        {displaySuggestions.map((suggestion, index) => (
          <SuggestionChip
            key={index}
            label={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
          />
        ))}
      </div>
    </div>
  )
}

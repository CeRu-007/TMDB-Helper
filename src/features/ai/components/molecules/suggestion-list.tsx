import React from 'react'
import { SuggestionChip } from '../atoms/suggestion-chip'

interface SuggestionListProps {
  suggestions?: string[]
  onSuggestionClick: (suggestion: string) => void
}

export function SuggestionList({ suggestions, onSuggestionClick }: SuggestionListProps) {
  const defaultSuggestions = [
    '一句话概括剧情',
    '深入探讨剧情细节',
    '了解世界观设定'
  ]

  const displaySuggestions = suggestions && suggestions.length > 0
    ? ['一句话概括剧情', ...suggestions]
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

import React from 'react'
import { ChevronRight } from "lucide-react"

interface SuggestionChipProps {
  label: string
  onClick: () => void
}

export function SuggestionChip({ label, onClick }: SuggestionChipProps) {
  return (
    <button
      className="px-4 py-2 text-left bg-muted hover:bg-accent border border-border rounded-xl transition-all group active:scale-[0.98] inline-flex items-center self-start"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  )
}

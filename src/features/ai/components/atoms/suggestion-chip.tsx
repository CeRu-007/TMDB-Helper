import React from 'react'
import { ChevronRight } from "lucide-react"

interface SuggestionChipProps {
  label: string
  onClick: () => void
}

export function SuggestionChip({ label, onClick }: SuggestionChipProps) {
  return (
    <button
      className="px-4 py-2 text-left bg-[#f7f7f7] dark:bg-[#1e1e1e] hover:bg-[#f0f0f0] dark:hover:bg-[#2d2d2d] border border-[#e0e0e0] dark:border-[#3a3a3a] rounded-xl transition-all group active:scale-[0.98] active:bg-[#e8e8e8] dark:active:bg-[#353535] inline-flex items-center self-start"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  )
}

"use client"

import type { ThemeConfig } from "@/lib/themes/types"

interface ThemePreviewCardProps {
  theme: ThemeConfig
  isSelected: boolean
  onSelect: (themeId: string) => void
}

export function ThemePreviewCard({ theme, isSelected, onSelect }: ThemePreviewCardProps) {
  const colorDots = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.muted,
    theme.colors.destructive,
  ]

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`
        relative w-full p-3 rounded-lg border-2 text-left transition-all
        ${isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-muted-foreground/30"
        }
      `}
    >
      {/* Color preview dots */}
      <div className="flex gap-1.5 mb-2">
        {colorDots.map((color, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        ))}
      </div>

      {/* Theme info */}
      <div className="text-sm font-medium">{theme.name}</div>
      {theme.description && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {theme.description}
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  )
}
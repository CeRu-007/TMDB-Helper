'use client';

import { useTranslation } from 'react-i18next';
import type { ThemeConfig } from '@/lib/themes/types';

interface ThemePreviewCardProps {
  theme: ThemeConfig;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
}

export function ThemePreviewCard({ theme, isSelected, onSelect }: ThemePreviewCardProps) {
  const { t } = useTranslation('settings');
  const themeName = t(`themes.${theme.id}.name`, { defaultValue: theme.name });
  const themeDescription = theme.description
    ? t(`themes.${theme.id}.description`, { defaultValue: theme.description })
    : undefined;

  const colorDots = [
    { key: 'primary', color: theme.colors.primary },
    { key: 'accent', color: theme.colors.accent },
    { key: 'card', color: theme.colors.card },
    { key: 'foreground', color: theme.colors.foreground },
    { key: 'destructive', color: theme.colors.destructive },
  ];

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`
        relative w-full p-3 rounded-lg border-2 text-left transition-all
        ${
          isSelected
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-muted-foreground/30'
        }
      `}
    >
      {/* Color preview dots */}
      <div className="flex gap-1.5 mb-2">
        {colorDots.map(({ color, key }) => (
          <div
            key={key}
            className="w-4 h-4 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/20"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        ))}
      </div>

      {/* Theme info */}
      <div className="text-sm font-medium">{themeName}</div>
      {themeDescription && (
        <div className="text-xs text-muted-foreground mt-0.5">{themeDescription}</div>
      )}

      {/* Selected indicator */}
      {isSelected && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
    </button>
  );
}

import type { ThemeConfig } from '../../types';

export const forestTheme: ThemeConfig = {
  id: 'forest',
  name: 'Forest',
  description: '森林自然主题',
  appearance: 'dark',
  colors: {
    background: '140 15% 8%',
    foreground: '130 20% 88%',
    card: '140 15% 12%',
    cardForeground: '130 20% 88%',
    popover: '140 15% 12%',
    popoverForeground: '130 20% 88%',
    primary: '130 55% 45%',
    primaryForeground: '140 15% 8%',
    secondary: '140 12% 16%',
    secondaryForeground: '130 20% 88%',
    muted: '140 12% 16%',
    mutedForeground: '140 10% 55%',
    accent: '45 60% 50%',
    accentForeground: '140 15% 8%',
    destructive: '0 65% 55%',
    destructiveForeground: '130 20% 88%',
    border: '140 12% 18%',
    input: '140 12% 18%',
    ring: '130 55% 45%',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 'medium',
  },
  border: {
    radius: 'md',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(180deg, hsl(140 15% 8%) 0%, hsl(120 18% 6%) 100%)',
    opacity: 1,
    blur: 0,
  },
};

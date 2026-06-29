import type { ThemeConfig } from '../../types';

export const oceanTheme: ThemeConfig = {
  id: 'ocean',
  name: 'Ocean',
  description: '深海渐变主题',
  appearance: 'dark',
  colors: {
    background: '200 25% 8%',
    foreground: '195 40% 90%',
    card: '200 25% 12%',
    cardForeground: '195 40% 90%',
    popover: '200 25% 12%',
    popoverForeground: '195 40% 90%',
    primary: '190 80% 50%',
    primaryForeground: '200 25% 8%',
    secondary: '200 18% 16%',
    secondaryForeground: '195 40% 90%',
    muted: '200 18% 16%',
    mutedForeground: '200 12% 55%',
    accent: '160 55% 48%',
    accentForeground: '200 25% 8%',
    destructive: '0 70% 55%',
    destructiveForeground: '195 40% 90%',
    border: '200 18% 18%',
    input: '200 18% 18%',
    ring: '190 80% 50%',
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
    value: 'linear-gradient(180deg, hsl(200 25% 8%) 0%, hsl(210 30% 6%) 100%)',
    opacity: 1,
    blur: 0,
  },
};

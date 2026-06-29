import type { ThemeConfig } from '../../types';

export const sunsetTheme: ThemeConfig = {
  id: 'sunset',
  name: 'Sunset',
  description: '日落渐变主题',
  appearance: 'dark',
  colors: {
    background: '15 20% 10%',
    foreground: '30 30% 90%',
    card: '15 20% 14%',
    cardForeground: '30 30% 90%',
    popover: '15 20% 14%',
    popoverForeground: '30 30% 90%',
    primary: '15 85% 55%',
    primaryForeground: '15 20% 10%',
    secondary: '15 15% 18%',
    secondaryForeground: '30 30% 90%',
    muted: '15 15% 18%',
    mutedForeground: '15 10% 55%',
    accent: '340 65% 55%',
    accentForeground: '15 20% 10%',
    destructive: '0 70% 55%',
    destructiveForeground: '30 30% 90%',
    border: '15 15% 20%',
    input: '15 15% 20%',
    ring: '15 85% 55%',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 'medium',
  },
  border: {
    radius: 'lg',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(15 20% 10%) 0%, hsl(350 20% 12%) 50%, hsl(25 25% 8%) 100%)',
    opacity: 1,
    blur: 0,
  },
};

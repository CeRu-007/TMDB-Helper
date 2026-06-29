import type { ThemeConfig } from '../../types';

export const rosePineTheme: ThemeConfig = {
  id: 'rose-pine',
  name: 'Rose Pine',
  description: '柔和玫瑰色调',
  appearance: 'dark',
  author: 'Rose Pine',
  colors: {
    background: '240 20% 10%',
    foreground: '230 20% 88%',
    card: '240 20% 14%',
    cardForeground: '230 20% 88%',
    popover: '240 20% 14%',
    popoverForeground: '230 20% 88%',
    primary: '340 50% 65%',
    primaryForeground: '240 20% 10%',
    secondary: '240 15% 18%',
    secondaryForeground: '230 20% 88%',
    muted: '240 15% 18%',
    mutedForeground: '230 12% 58%',
    accent: '170 45% 55%',
    accentForeground: '240 20% 10%',
    destructive: '0 65% 55%',
    destructiveForeground: '230 20% 88%',
    border: '240 15% 20%',
    input: '240 15% 20%',
    ring: '340 50% 65%',
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
    value: 'linear-gradient(135deg, hsl(240 20% 10%) 0%, hsl(300 15% 10%) 100%)',
    opacity: 1,
    blur: 0,
  },
};

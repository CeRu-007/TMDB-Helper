import type { ThemeConfig } from '../../types';

export const gruvboxDarkTheme: ThemeConfig = {
  id: 'gruvbox-dark',
  name: 'Gruvbox Dark',
  description: '复古暖色调',
  appearance: 'dark',
  author: 'Gruvbox',
  colors: {
    background: '25 12% 10%',
    foreground: '40 40% 85%',
    card: '25 12% 14%',
    cardForeground: '40 40% 85%',
    popover: '25 12% 14%',
    popoverForeground: '40 40% 85%',
    primary: '35 80% 60%',
    primaryForeground: '25 12% 10%',
    secondary: '25 10% 18%',
    secondaryForeground: '40 40% 85%',
    muted: '25 10% 18%',
    mutedForeground: '25 8% 55%',
    accent: '140 45% 50%',
    accentForeground: '25 12% 10%',
    destructive: '0 65% 55%',
    destructiveForeground: '40 40% 85%',
    border: '25 10% 20%',
    input: '25 10% 20%',
    ring: '35 80% 60%',
  },
  typography: {
    fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
    fontSize: 'medium',
  },
  border: {
    radius: 'md',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(180deg, hsl(25 12% 10%) 0%, hsl(15 15% 8%) 100%)',
    opacity: 1,
    blur: 0,
  },
};

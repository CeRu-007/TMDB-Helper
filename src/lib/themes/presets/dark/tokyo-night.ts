import type { ThemeConfig } from '../../types'

export const tokyoNightTheme: ThemeConfig = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  description: '深蓝紫夜景风格',
  appearance: 'dark',
  colors: {
    background: '232 25% 10%',
    foreground: '225 25% 90%',
    card: '232 25% 14%',
    cardForeground: '225 25% 90%',
    popover: '232 25% 14%',
    popoverForeground: '225 25% 90%',
    primary: '218 60% 70%',
    primaryForeground: '232 25% 10%',
    secondary: '232 20% 18%',
    secondaryForeground: '225 25% 90%',
    muted: '232 20% 18%',
    mutedForeground: '225 15% 58%',
    accent: '330 50% 65%',
    accentForeground: '225 25% 90%',
    destructive: '0 60% 55%',
    destructiveForeground: '225 25% 90%',
    border: '232 20% 20%',
    input: '232 20% 20%',
    ring: '218 60% 70%',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'medium',
  },
  border: {
    radius: 'md',
  },
  background: {
    type: 'solid',
    value: '232 25% 10%',
    opacity: 1,
    blur: 0,
  },
}

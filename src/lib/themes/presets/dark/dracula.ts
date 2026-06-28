import type { ThemeConfig } from '../../types'

export const draculaTheme: ThemeConfig = {
  id: 'dracula',
  name: 'Dracula',
  description: '紫色主调，高对比度',
  appearance: 'dark',
  colors: {
    background: '240 10% 6%',
    foreground: '240 10% 95%',
    card: '240 8% 12%',
    cardForeground: '240 10% 95%',
    popover: '240 8% 12%',
    popoverForeground: '240 10% 95%',
    primary: '270 76% 68%',
    primaryForeground: '240 10% 6%',
    secondary: '240 6% 18%',
    secondaryForeground: '240 10% 95%',
    muted: '240 6% 18%',
    mutedForeground: '240 5% 60%',
    accent: '320 60% 50%',
    accentForeground: '240 10% 95%',
    destructive: '0 70% 55%',
    destructiveForeground: '240 10% 95%',
    border: '240 6% 20%',
    input: '240 6% 20%',
    ring: '270 76% 68%',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'medium',
  },
  border: {
    radius: 'lg',
  },
  background: {
    type: 'solid',
    value: '240 10% 6%',
    opacity: 1,
    blur: 0,
  },
}

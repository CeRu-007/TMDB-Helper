import type { ThemeConfig } from '../../types'

export const materialOceanTheme: ThemeConfig = {
  id: 'material-ocean',
  name: 'Material Ocean',
  description: 'Material Design 深海蓝',
  appearance: 'dark',
  author: 'Material',
  colors: {
    background: '210 22% 10%',
    foreground: '198 50% 90%',
    card: '210 22% 14%',
    cardForeground: '198 50% 90%',
    popover: '210 22% 14%',
    popoverForeground: '198 50% 90%',
    primary: '200 100% 55%',
    primaryForeground: '210 22% 10%',
    secondary: '210 18% 18%',
    secondaryForeground: '198 50% 90%',
    muted: '210 18% 18%',
    mutedForeground: '200 15% 60%',
    accent: '160 60% 50%',
    accentForeground: '210 22% 10%',
    destructive: '0 70% 55%',
    destructiveForeground: '198 50% 90%',
    border: '210 18% 20%',
    input: '210 18% 20%',
    ring: '200 100% 55%',
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
    value: 'linear-gradient(180deg, hsl(210 22% 10%) 0%, hsl(215 25% 8%) 100%)',
    opacity: 1,
    blur: 0,
  },
}

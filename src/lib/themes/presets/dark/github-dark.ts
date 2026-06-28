import type { ThemeConfig } from '../../types'

export const githubDarkTheme: ThemeConfig = {
  id: 'github-dark',
  name: 'GitHub Dark',
  description: 'GitHub 深色主题风格',
  appearance: 'dark',
  author: 'GitHub',
  colors: {
    background: '220 13% 7%',
    foreground: '210 40% 96%',
    card: '220 13% 10%',
    cardForeground: '210 40% 96%',
    popover: '220 13% 10%',
    popoverForeground: '210 40% 96%',
    primary: '212 92% 55%',
    primaryForeground: '220 13% 7%',
    secondary: '220 10% 16%',
    secondaryForeground: '210 40% 96%',
    muted: '220 10% 16%',
    mutedForeground: '215 15% 58%',
    accent: '212 92% 55%',
    accentForeground: '220 13% 7%',
    destructive: '0 72% 55%',
    destructiveForeground: '210 40% 96%',
    border: '220 10% 18%',
    input: '220 10% 18%',
    ring: '212 92% 55%',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 'medium',
  },
  border: {
    radius: 'md',
  },
  background: {
    type: 'solid',
    value: '220 13% 7%',
    opacity: 1,
    blur: 0,
  },
}

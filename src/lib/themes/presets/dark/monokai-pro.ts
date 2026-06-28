import type { ThemeConfig } from '../../types'

export const monokaiProTheme: ThemeConfig = {
  id: 'monokai-pro',
  name: 'Monokai Pro',
  description: '经典编辑器风格，温暖色调',
  appearance: 'dark',
  author: 'Monokai',
  colors: {
    background: '240 8% 12%',
    foreground: '240 14% 90%',
    card: '240 8% 16%',
    cardForeground: '240 14% 90%',
    popover: '240 8% 16%',
    popoverForeground: '240 14% 90%',
    primary: '35 92% 62%',
    primaryForeground: '240 8% 12%',
    secondary: '240 6% 20%',
    secondaryForeground: '240 14% 90%',
    muted: '240 6% 20%',
    mutedForeground: '240 8% 55%',
    accent: '180 62% 55%',
    accentForeground: '240 8% 12%',
    destructive: '0 72% 55%',
    destructiveForeground: '240 14% 90%',
    border: '240 6% 22%',
    input: '240 6% 22%',
    ring: '35 92% 62%',
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 'medium',
  },
  border: {
    radius: 'md',
  },
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(240 8% 12%) 0%, hsl(260 8% 14%) 100%)',
    opacity: 1,
    blur: 0,
  },
}

import type { ThemeConfig } from '../../types'

export const defaultDarkTheme: ThemeConfig = {
  id: 'default-dark',
  name: '默认深色',
  description: '项目默认深色主题',
  appearance: 'dark',
  colors: {
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    card: '222.2 84% 4.9%',
    cardForeground: '210 40% 98%',
    popover: '222.2 84% 4.9%',
    popoverForeground: '210 40% 98%',
    primary: '217.2 91.2% 59.8%',
    primaryForeground: '222.2 84% 4.9%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    accent: '217.2 32.6% 17.5%',
    accentForeground: '210 40% 98%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '210 40% 98%',
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '224.3 76.3% 94.1%',
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
    value: '222.2 84% 4.9%',
    opacity: 1,
    blur: 0,
  },
}

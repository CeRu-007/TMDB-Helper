import type { ThemeConfig } from '../../types'

export const defaultLightTheme: ThemeConfig = {
  id: 'default-light',
  name: '默认浅色',
  description: '项目默认浅色主题',
  appearance: 'light',
  colors: {
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    card: '0 0% 100%',
    cardForeground: '222.2 84% 4.9%',
    popover: '0 0% 100%',
    popoverForeground: '222.2 84% 4.9%',
    primary: '221.2 83.2% 53.3%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96%',
    secondaryForeground: '222.2 84% 4.9%',
    muted: '210 40% 96%',
    mutedForeground: '215.4 16.3% 46.9%',
    accent: '210 40% 96%',
    accentForeground: '222.2 84% 4.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '221.2 83.2% 53.3%',
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
    value: '0 0% 100%',
    opacity: 1,
    blur: 0,
  },
}

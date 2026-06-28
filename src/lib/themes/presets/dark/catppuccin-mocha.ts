import type { ThemeConfig } from '../../types'

export const catppuccinMochaTheme: ThemeConfig = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  description: '柔和暖色调',
  appearance: 'dark',
  colors: {
    background: '240 21% 12%',
    foreground: '225 20% 92%',
    card: '240 21% 15%',
    cardForeground: '225 20% 92%',
    popover: '240 21% 15%',
    popoverForeground: '225 20% 92%',
    primary: '267 70% 68%',
    primaryForeground: '240 21% 12%',
    secondary: '240 18% 20%',
    secondaryForeground: '225 20% 92%',
    muted: '240 18% 20%',
    mutedForeground: '240 12% 60%',
    accent: '340 50% 65%',
    accentForeground: '240 21% 12%',
    destructive: '0 65% 60%',
    destructiveForeground: '225 20% 92%',
    border: '240 18% 22%',
    input: '240 18% 22%',
    ring: '267 70% 68%',
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
    value: '240 21% 12%',
    opacity: 1,
    blur: 0,
  },
}

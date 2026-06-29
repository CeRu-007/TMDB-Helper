import type { ThemeConfig } from '../../types';

export const catppuccinLatteTheme: ThemeConfig = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  description: '柔和浅色调',
  appearance: 'light',
  colors: {
    background: '240 20% 98%',
    foreground: '240 15% 15%',
    card: '240 20% 96%',
    cardForeground: '240 15% 15%',
    popover: '240 20% 96%',
    popoverForeground: '240 15% 15%',
    primary: '267 55% 55%',
    primaryForeground: '240 20% 98%',
    secondary: '240 12% 92%',
    secondaryForeground: '240 15% 15%',
    muted: '240 12% 92%',
    mutedForeground: '240 10% 55%',
    accent: '340 40% 55%',
    accentForeground: '240 20% 98%',
    destructive: '0 55% 50%',
    destructiveForeground: '240 20% 98%',
    border: '240 12% 90%',
    input: '240 12% 90%',
    ring: '267 55% 55%',
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
    value: '240 20% 98%',
    opacity: 1,
    blur: 0,
  },
};

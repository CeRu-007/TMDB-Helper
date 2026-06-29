import type { ThemeConfig } from '../../types';

export const nordTheme: ThemeConfig = {
  id: 'nord',
  name: 'Nord',
  description: '北欧冷色调，低对比度',
  appearance: 'dark',
  colors: {
    background: '220 13% 18%',
    foreground: '180 20% 95%',
    card: '220 13% 22%',
    cardForeground: '180 20% 95%',
    popover: '220 13% 22%',
    popoverForeground: '180 20% 95%',
    primary: '210 40% 60%',
    primaryForeground: '220 13% 18%',
    secondary: '220 13% 25%',
    secondaryForeground: '180 20% 95%',
    muted: '220 13% 25%',
    mutedForeground: '210 15% 65%',
    accent: '220 13% 28%',
    accentForeground: '180 20% 95%',
    destructive: '0 60% 50%',
    destructiveForeground: '180 20% 95%',
    border: '220 13% 28%',
    input: '220 13% 28%',
    ring: '210 40% 60%',
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
    value: '220 13% 18%',
    opacity: 1,
    blur: 0,
  },
};

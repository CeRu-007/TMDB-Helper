import type { ThemeConfig } from '../../types';

export const githubLightTheme: ThemeConfig = {
  id: 'github-light',
  name: 'GitHub Light',
  description: 'GitHub 浅色主题风格',
  appearance: 'light',
  author: 'GitHub',
  colors: {
    background: '210 20% 98%',
    foreground: '210 15% 12%',
    card: '0 0% 100%',
    cardForeground: '210 15% 12%',
    popover: '0 0% 100%',
    popoverForeground: '210 15% 12%',
    primary: '212 92% 45%',
    primaryForeground: '0 0% 100%',
    secondary: '210 15% 94%',
    secondaryForeground: '210 15% 12%',
    muted: '210 15% 94%',
    mutedForeground: '210 10% 45%',
    accent: '212 92% 45%',
    accentForeground: '0 0% 100%',
    destructive: '0 65% 50%',
    destructiveForeground: '0 0% 100%',
    border: '210 12% 90%',
    input: '210 12% 90%',
    ring: '212 92% 45%',
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
    value: '210 20% 98%',
    opacity: 1,
    blur: 0,
  },
};

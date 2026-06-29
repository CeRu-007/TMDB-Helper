export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  success?: string;
  successForeground?: string;
  warning?: string;
  warningForeground?: string;
  info?: string;
  infoForeground?: string;
  header?: string;
  headerForeground?: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

export type ThemeBorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface ThemeBorder {
  radius: ThemeBorderRadius;
}

export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface ThemeBackground {
  type: BackgroundType;
  value: string;
  opacity: number;
  blur: number;
  overlay?: string;
  accentOverridesPrimary?: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  appearance: 'light' | 'dark';
  author?: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  border: ThemeBorder;
  background: ThemeBackground;
}

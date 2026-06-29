const BG_CONFIG_KEY = 'theme_bg_config';

export interface BackgroundConfig {
  type: 'solid' | 'gradient';
  opacity: number;
  blur: number;
}

const DEFAULT_CONFIG: BackgroundConfig = {
  type: 'solid',
  opacity: 1,
  blur: 0,
};

export function getBackgroundConfig(): BackgroundConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = localStorage.getItem(BG_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveBackgroundConfig(config: BackgroundConfig): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(BG_CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

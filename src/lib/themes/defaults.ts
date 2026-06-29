import type { ThemeConfig } from './types';
import { defaultDarkTheme } from './presets/dark/default';
import { nordTheme } from './presets/dark/nord';
import { draculaTheme } from './presets/dark/dracula';
import { catppuccinMochaTheme } from './presets/dark/catppuccin-mocha';
import { tokyoNightTheme } from './presets/dark/tokyo-night';
import { monokaiProTheme } from './presets/dark/monokai-pro';
import { githubDarkTheme } from './presets/dark/github-dark';
import { materialOceanTheme } from './presets/dark/material-ocean';
import { rosePineTheme } from './presets/dark/rose-pine';
import { gruvboxDarkTheme } from './presets/dark/gruvbox-dark';
import { sunsetTheme } from './presets/dark/sunset';
import { oceanTheme } from './presets/dark/ocean';
import { forestTheme } from './presets/dark/forest';
import { defaultLightTheme } from './presets/light/default';
import { catppuccinLatteTheme } from './presets/light/catppuccin-latte';
import { githubLightTheme } from './presets/light/github-light';
import { tmdbTheme } from './presets/light/tmdb';

export const DEFAULT_THEME_ID = 'default-dark';

export const presetThemes: ThemeConfig[] = [
  // Dark themes
  defaultDarkTheme,
  nordTheme,
  draculaTheme,
  catppuccinMochaTheme,
  tokyoNightTheme,
  monokaiProTheme,
  githubDarkTheme,
  materialOceanTheme,
  rosePineTheme,
  gruvboxDarkTheme,
  sunsetTheme,
  oceanTheme,
  forestTheme,
  // Light themes
  defaultLightTheme,
  catppuccinLatteTheme,
  githubLightTheme,
  tmdbTheme,
];

export function getThemeById(id: string): ThemeConfig | undefined {
  return presetThemes.find((t) => t.id === id);
}

export function getThemesByAppearance(appearance: 'light' | 'dark'): ThemeConfig[] {
  return presetThemes.filter((t) => t.appearance === appearance);
}

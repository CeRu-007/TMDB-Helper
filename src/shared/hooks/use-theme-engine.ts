'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ClientConfigManager } from '@/lib/utils/client-config-manager';
import { safeJsonParse } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import type { ThemeConfig } from '@/lib/themes/types';
import { applyTheme } from '@/lib/themes/css-variables';
import { presetThemes, getThemeById, DEFAULT_THEME_ID } from '@/lib/themes/defaults';

const THEME_KEY = 'theme_engine_settings';

interface ThemeEngineState {
  themeId: string;
  customizations?: Partial<ThemeConfig>;
}

function mergeThemeWithCustomizations(
  base: ThemeConfig,
  custom?: Partial<ThemeConfig>
): ThemeConfig {
  if (!custom) {
    return base;
  }
  return {
    ...base,
    ...custom,
    colors: { ...base.colors, ...custom.colors },
    typography: { ...base.typography, ...custom.typography },
    border: { ...base.border, ...custom.border },
    background: { ...base.background, ...custom.background },
  };
}

function themeEquals(a: ThemeConfig, b: ThemeConfig): boolean {
  return (
    a.id === b.id &&
    JSON.stringify(a.colors) === JSON.stringify(b.colors) &&
    JSON.stringify(a.typography) === JSON.stringify(b.typography) &&
    JSON.stringify(a.border) === JSON.stringify(b.border) &&
    JSON.stringify(a.background) === JSON.stringify(b.background)
  );
}

export function useThemeEngine() {
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(
    () => getThemeById(DEFAULT_THEME_ID) ?? presetThemes[0]!
  );
  const [customizations, setCustomizations] = useState<Partial<ThemeConfig> | undefined>();
  const [persisted, setPersisted] = useState(false);
  const isSyncing = useRef(false);
  const customizationsRef = useRef(customizations);
  const appliedThemeRef = useRef<ThemeConfig | null>(null);

  customizationsRef.current = customizations;

  const resolvedTheme = useMemo(
    () =>
      customizations ? mergeThemeWithCustomizations(currentTheme, customizations) : currentTheme,
    [currentTheme, customizations]
  );

  // Only apply theme AFTER persisted state is loaded
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!persisted) {
      return;
    }
    if (appliedThemeRef.current && themeEquals(appliedThemeRef.current, resolvedTheme)) {
      return;
    }
    appliedThemeRef.current = resolvedTheme;
    applyTheme(resolvedTheme);
  }, [resolvedTheme, persisted]);

  // Sync appearance mode with next-themes
  useEffect(() => {
    if (!persisted) {
      return;
    }
    const target = resolvedTheme.appearance;
    if (nextTheme !== target) {
      setNextTheme(target);
    }
  }, [resolvedTheme.appearance, nextTheme, setNextTheme, persisted]);

  // Load persisted state
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (persisted) {
      return;
    }

    const load = async () => {
      try {
        const localSaved = localStorage.getItem(THEME_KEY);
        if (localSaved) {
          const parsed = safeJsonParse<ThemeEngineState>(localSaved);
          if (parsed) {
            const theme = getThemeById(parsed.themeId);
            if (theme) {
              setCurrentTheme(theme);
              setCustomizations(parsed.customizations);
            }
          }
        }

        const saved = await ClientConfigManager.getItem(THEME_KEY);
        if (saved && saved !== localSaved) {
          const parsed = safeJsonParse<ThemeEngineState>(saved);
          if (parsed) {
            const theme = getThemeById(parsed.themeId);
            if (theme) {
              setCurrentTheme(theme);
              setCustomizations(parsed.customizations);
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to load theme engine state:', error);
      } finally {
        setPersisted(true);
      }
    };

    load();
  }, [persisted]);

  const persist = useCallback(async (state: ThemeEngineState) => {
    try {
      const json = JSON.stringify(state);
      await ClientConfigManager.setItem(THEME_KEY, json);
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme_engine_state', json);
      }
    } catch (error) {
      logger.warn('Failed to persist theme engine state:', error);
    }
  }, []);

  const setTheme = useCallback(
    (themeId: string) => {
      const theme = getThemeById(themeId);
      if (!theme) {
        return;
      }

      setCurrentTheme(theme);
      setCustomizations(undefined);

      isSyncing.current = true;
      persist({ themeId }).finally(() => {
        isSyncing.current = false;
      });
    },
    [persist]
  );

  const updateTheme = useCallback(
    (partial: Partial<ThemeConfig>) => {
      const nextCustomizations = { ...customizationsRef.current, ...partial };
      setCustomizations(nextCustomizations);

      isSyncing.current = true;
      persist({
        themeId: currentTheme.id,
        customizations: nextCustomizations,
      }).finally(() => {
        isSyncing.current = false;
      });
    },
    [currentTheme.id, persist]
  );

  const resetTheme = useCallback(() => {
    setCustomizations(undefined);
    persist({ themeId: currentTheme.id });
  }, [currentTheme.id, persist]);

  return {
    currentTheme: resolvedTheme,
    baseTheme: currentTheme,
    allThemes: presetThemes,
    darkThemes: presetThemes.filter((t) => t.appearance === 'dark'),
    lightThemes: presetThemes.filter((t) => t.appearance === 'light'),
    setTheme,
    updateTheme,
    resetTheme,
    isCustomized: !!customizations,
  };
}

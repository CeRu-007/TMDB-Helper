'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ThemePreviewCard } from './ThemePreviewCard';
import { ThemeCustomizer } from './ThemeCustomizer';
import { useTranslation } from 'react-i18next';
import type { ThemeConfig } from '@/lib/themes/types';

interface AppearanceSettingsPanelProps {
  currentTheme: ThemeConfig;
  baseTheme: ThemeConfig;
  darkThemes: ThemeConfig[];
  lightThemes: ThemeConfig[];
  onSelectTheme: (themeId: string, shouldPersist?: boolean) => void;
  onUpdateTheme: (partial: Partial<ThemeConfig>, shouldPersist?: boolean) => void;
  onResetTheme: (shouldPersist?: boolean) => void;
  isCustomized: boolean;
}

export default function AppearanceSettingsPanel({
  currentTheme,
  darkThemes,
  lightThemes,
  onSelectTheme,
  onUpdateTheme,
  onResetTheme,
  isCustomized,
}: AppearanceSettingsPanelProps) {
  const { t } = useTranslation('settings');

  const [tab, setTab] = useState<'dark' | 'light'>(
    currentTheme.appearance === 'dark' ? 'dark' : 'light'
  );

  const themes = tab === 'dark' ? darkThemes : lightThemes;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('appearanceSettings')}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t('appearanceSettingsDesc')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'dark' | 'light')}>
        <TabsList>
          <TabsTrigger value="dark">{t('darkThemes')}</TabsTrigger>
          <TabsTrigger value="light">{t('lightThemes')}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isSelected={currentTheme.id === theme.id}
                onSelect={(id) => onSelectTheme(id, false)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ThemeCustomizer
        currentTheme={currentTheme}
        isCustomized={isCustomized}
        onUpdateTheme={(partial) => onUpdateTheme(partial, false)}
        onResetTheme={() => onResetTheme(false)}
      />
    </div>
  );
}

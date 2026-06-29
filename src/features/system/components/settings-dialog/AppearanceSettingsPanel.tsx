'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useThemeEngine } from '@/shared/hooks/use-theme-engine';
import { ThemePreviewCard } from './ThemePreviewCard';
import { ThemeCustomizer } from './ThemeCustomizer';
import { useTranslation } from 'react-i18next';

export default function AppearanceSettingsPanel() {
  const { t } = useTranslation('settings');
  const { currentTheme, darkThemes, lightThemes, setTheme, updateTheme, isCustomized, resetTheme } =
    useThemeEngine();

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

      {/* Theme selector */}
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
                onSelect={setTheme}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Customizer */}
      <ThemeCustomizer
        currentTheme={currentTheme}
        isCustomized={isCustomized}
        onUpdateTheme={updateTheme}
        onResetTheme={resetTheme}
      />
    </div>
  );
}

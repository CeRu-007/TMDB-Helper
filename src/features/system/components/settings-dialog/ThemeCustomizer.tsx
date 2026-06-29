import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Slider } from '@/shared/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useTranslation } from 'react-i18next';
import type { ThemeConfig } from '@/lib/themes/types';

interface ThemeCustomizerProps {
  currentTheme: ThemeConfig;
  isCustomized: boolean;
  onUpdateTheme: (partial: Partial<ThemeConfig>) => void;
  onResetTheme: () => void;
}

const GRADIENT_PRESETS = [
  {
    name: 'Sunset',
    value: 'linear-gradient(135deg, hsl(15 20% 10%) 0%, hsl(350 20% 12%) 50%, hsl(25 25% 8%) 100%)',
  },
  { name: 'Ocean', value: 'linear-gradient(180deg, hsl(200 25% 8%) 0%, hsl(210 30% 6%) 100%)' },
  { name: 'Forest', value: 'linear-gradient(180deg, hsl(140 15% 8%) 0%, hsl(120 18% 6%) 100%)' },
  { name: 'Purple', value: 'linear-gradient(135deg, hsl(270 20% 10%) 0%, hsl(280 25% 12%) 100%)' },
  { name: 'Warm', value: 'linear-gradient(180deg, hsl(30 15% 10%) 0%, hsl(15 20% 8%) 100%)' },
  { name: 'Cool', value: 'linear-gradient(180deg, hsl(210 20% 10%) 0%, hsl(190 25% 8%) 100%)' },
];

export const ThemeCustomizer = memo(function ThemeCustomizer({
  currentTheme,
  isCustomized,
  onUpdateTheme,
  onResetTheme,
}: ThemeCustomizerProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('typography')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('fontSize')}</Label>
            <RadioGroup
              value={currentTheme.typography.fontSize}
              onValueChange={(v) =>
                onUpdateTheme({
                  typography: {
                    ...currentTheme.typography,
                    fontSize: v as 'small' | 'medium' | 'large',
                  },
                })
              }
              className="mt-2 flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="small" id="font-small" />
                <Label htmlFor="font-small">{t('fontSmall')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="medium" id="font-medium" />
                <Label htmlFor="font-medium">{t('fontMedium')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="large" id="font-large" />
                <Label htmlFor="font-large">{t('fontLarge')}</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('borderRadius')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={currentTheme.border.radius}
            onValueChange={(v) => onUpdateTheme({ border: { radius: v as any } })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('radiusNone')}</SelectItem>
              <SelectItem value="sm">{t('radiusSmall')}</SelectItem>
              <SelectItem value="md">{t('radiusMedium')}</SelectItem>
              <SelectItem value="lg">{t('radiusLarge')}</SelectItem>
              <SelectItem value="xl">{t('radiusXLarge')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Background */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('background')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('bgType')}</Label>
            <Select
              value={
                currentTheme.background.type === 'image' ? 'gradient' : currentTheme.background.type
              }
              onValueChange={(v) => {
                onUpdateTheme({
                  background: { ...currentTheme.background, type: v as 'solid' | 'gradient' },
                });
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">{t('bgSolid')}</SelectItem>
                <SelectItem value="gradient">{t('bgGradient')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {currentTheme.background.type === 'gradient' && (
            <div>
              <Label className="text-sm font-medium">{t('bgGradientPreset')}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      onUpdateTheme({
                        background: {
                          ...currentTheme.background,
                          type: 'gradient',
                          value: preset.value,
                        },
                      });
                    }}
                    className="h-12 rounded-md border-2 border-border hover:border-muted-foreground/50 transition-colors"
                    style={{ background: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">
              {t('bgOpacity')}: {Math.round(currentTheme.background.opacity * 100)}%
            </Label>
            <Slider
              value={[currentTheme.background.opacity * 100]}
              onValueChange={([v]) => {
                if (v !== undefined) {
                  onUpdateTheme({ background: { ...currentTheme.background, opacity: v / 100 } });
                }
              }}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">
              {t('bgBlur')}: {currentTheme.background.blur}px
            </Label>
            <Slider
              value={[currentTheme.background.blur]}
              onValueChange={([v]) => {
                if (v !== undefined) {
                  onUpdateTheme({ background: { ...currentTheme.background, blur: v } });
                }
              }}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset button */}
      {isCustomized && (
        <button
          onClick={onResetTheme}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          {t('resetToPreset')}
        </button>
      )}
    </div>
  );
});

import React from 'react';
import { Loader2, AlertCircle, Copy } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Slider } from '@/shared/components/ui/slider';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { ClientConfigManager } from '@/lib/utils/client-config-manager';
import { GenerationConfig } from '../types';
import { useScenarioModels } from '@/lib/hooks/useScenarioModels';
import { useTranslation } from 'react-i18next';

interface GenerationTabProps {
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig) => void;
}

export function GenerationTab({ config, onConfigChange }: GenerationTabProps) {
  const { t } = useTranslation('episode-generation');
  const scenarioModels = useScenarioModels('episode_generation');

  const handleModelChange = (newModel: string) => {
    if (typeof onConfigChange !== 'function') {
      logger.error('onConfigChange is not a function');
      return;
    }

    try {
      onConfigChange({ ...config, model: newModel });
    } catch (error) {
      logger.error('Error updating config:', error);
      return;
    }

    (async () => {
      try {
        const response = await fetch('/api/model-service/scenario?scenario=episode_generation');
        const result = await response.json();
        if (result.success && result.scenario) {
          const scenario = result.scenario;
          scenario.primaryModelId = newModel;
          await fetch('/api/model-service', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update-scenario', data: scenario }),
          });
        }
      } catch (error) {
        logger.error('Failed to save scenario config:', error);
      }
    })();

    (async () => {
      try {
        const currentModel = scenarioModels.availableModels.find((m) => m.id === newModel);
        if (currentModel) {
          const key =
            currentModel.providerId === 'siliconflow-builtin'
              ? 'siliconflow_api_settings'
              : 'modelscope_api_settings';
          const existing = await ClientConfigManager.getItem(key);
          const settings = existing ? JSON.parse(existing) : {};
          settings.episodeGenerationModel = newModel;
          await ClientConfigManager.setItem(key, JSON.stringify(settings));
        }
      } catch (error) {
        logger.error('Failed to save model config:', error);
      }
    })();
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">{t('generationTab.aiModelSelect')}</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          {t('generationTab.aiModelSelectDesc')}
        </p>
        {scenarioModels.isLoading ? (
          <div className="flex items-center justify-center p-4 border border-border rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              {t('generationTab.loadingModels')}
            </span>
          </div>
        ) : scenarioModels.error ? (
          <div className="flex items-center justify-center p-4 border border-border rounded-lg">
            <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
            <span className="text-sm text-red-500">
              {t('generationTab.loadFailed', { error: scenarioModels.error })}
            </span>
          </div>
        ) : (
          <Select
            value={config.model}
            onValueChange={handleModelChange}
            disabled={scenarioModels.availableModels.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('generationTab.selectModel')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {scenarioModels.availableModels.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {t('generationTab.noModels')}
                </div>
              ) : (
                scenarioModels.getSelectedModels().map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.displayName}</span>
                      {model.id === scenarioModels.primaryModelId && (
                        <Badge variant="secondary" className="text-xs">
                          {t('generationTab.primaryModel')}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium">{t('generationTab.summaryLength')}</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          {t('generationTab.summaryLengthDesc')}
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground w-12">
              {t('generationTab.minLength')}
            </span>
            <Slider
              value={[config.summaryLength[0]]}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({ ...config, summaryLength: [value[0], config.summaryLength[1]] });
                }
              }}
              max={300}
              min={20}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">
              {config.summaryLength[0]}
              {t('generationTab.charUnit')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground w-12">
              {t('generationTab.maxLength')}
            </span>
            <Slider
              value={[config.summaryLength[1]]}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                  onConfigChange({ ...config, summaryLength: [config.summaryLength[0], value[0]] });
                }
              }}
              max={400}
              min={config.summaryLength[0] + 10}
              step={5}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">
              {config.summaryLength[1]}
              {t('generationTab.charUnit')}
            </span>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">{t('generationTab.temperature')}</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          {t('generationTab.temperatureDesc')}
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground w-12">
            {t('generationTab.conservative')}
          </span>
          <Slider
            value={[config.temperature]}
            onValueChange={(value) => {
              if (typeof onConfigChange === 'function' && value[0] !== undefined) {
                onConfigChange({ ...config, temperature: value[0] });
              }
            }}
            max={1.0}
            min={0.1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">{t('generationTab.creative')}</span>
          <span className="text-sm font-medium w-12">{config.temperature.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeOriginalTitle"
            checked={config.includeOriginalTitle}
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({ ...config, includeOriginalTitle: !!checked });
              }
            }}
          />
          <Label htmlFor="includeOriginalTitle" className="text-sm">
            {t('generationTab.includeOriginalTitle')}
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="customPrompt" className="text-sm font-medium">
          {t('generationTab.customPrompt')}
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">
          {t('generationTab.customPromptDesc')}
        </p>
        <Textarea
          id="customPrompt"
          value={config.customPrompt || ''}
          onChange={(e) => {
            if (typeof onConfigChange === 'function') {
              onConfigChange({ ...config, customPrompt: e.target.value });
            }
          }}
          placeholder={t('generationTab.customPromptPlaceholder')}
          className="h-20 resize-none"
        />
      </div>

      {config.selectedStyles.includes('imitate') && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center space-x-2 mb-4">
            <Copy className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('generationTab.imitateConfig')}
            </Label>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="imitateGenerateCount" className="text-sm font-medium text-foreground">
                {t('generationTab.generateCount')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                {t('generationTab.generateCountDesc')}
              </p>
              <Select
                value={config.imitateConfig?.generateCount?.toString() || '3'}
                onValueChange={(value) => {
                  if (typeof onConfigChange === 'function') {
                    onConfigChange({
                      ...config,
                      imitateConfig: { ...config.imitateConfig!, generateCount: parseInt(value) },
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {t('generationTab.countUnit', { num })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="imitateSampleContent" className="text-sm font-medium text-foreground">
                {t('generationTab.sampleContent')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                {t('generationTab.sampleContentDesc')}
              </p>
              <Textarea
                id="imitateSampleContent"
                placeholder={t('generationTab.samplePlaceholder')}
                value={config.imitateConfig?.sampleContent || ''}
                onChange={(e) => {
                  if (e.target.value.length <= 500 && typeof onConfigChange === 'function') {
                    const sampleContent = e.target.value;
                    const sampleLength = sampleContent.length;
                    let newSummaryLength = config.summaryLength;
                    if (sampleLength > 0) {
                      const minLength = Math.max(20, Math.floor(sampleLength * 0.8));
                      const maxLength = Math.min(400, Math.ceil(sampleLength * 1.2));
                      newSummaryLength = [minLength, maxLength];
                    }
                    onConfigChange({
                      ...config,
                      imitateConfig: { ...config.imitateConfig!, sampleContent },
                      summaryLength: newSummaryLength,
                    });
                  }
                }}
                className="min-h-[120px] resize-none"
                maxLength={500}
              />
              <div className="flex flex-col space-y-1 mt-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{t('generationTab.imitateHint')}</p>
                  <span className="text-xs text-muted-foreground">
                    {config.imitateConfig?.sampleContent?.length || 0}/500
                  </span>
                </div>
                {config.imitateConfig?.sampleContent &&
                  config.imitateConfig.sampleContent.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t('generationTab.autoAdjusted', {
                        min: config.summaryLength[0],
                        max: config.summaryLength[1],
                      })}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

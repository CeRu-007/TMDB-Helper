import React from 'react';
import { Film, Loader2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { GenerationConfig } from '../types';
import { useScenarioModels } from '@/lib/hooks/useScenarioModels';
import { useTranslation } from 'react-i18next';

interface VideoAnalysisTabProps {
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig) => void;
}

export function VideoAnalysisTab({ config, onConfigChange }: VideoAnalysisTabProps) {
  const { t } = useTranslation('episode-generation');
  const speechModels = useScenarioModels('speech_to_text');

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Film className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              {t('videoAnalysisTab.featureIntro')}
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
              {t('videoAnalysisTab.featureIntroDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">{t('videoAnalysisTab.featureControl')}</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            {t('videoAnalysisTab.featureControlDesc')}
          </p>
        </div>
        <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
          <Checkbox
            id="enableVideoAnalysis"
            checked={config.enableVideoAnalysis || false}
            onCheckedChange={(checked) => {
              if (typeof onConfigChange === 'function') {
                onConfigChange({ ...config, enableVideoAnalysis: !!checked });
              }
            }}
          />
          <div className="flex-1">
            <Label htmlFor="enableVideoAnalysis" className="text-sm font-medium cursor-pointer">
              {t('videoAnalysisTab.enableFeature')}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('videoAnalysisTab.enableFeatureDesc')}
            </p>
          </div>
        </div>
      </div>

      {config.enableVideoAnalysis && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('videoAnalysisTab.speechModel')}</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {t('videoAnalysisTab.speechModelDesc')}
            </p>
          </div>

          {speechModels.isLoading ? (
            <div className="flex items-center justify-center p-4 border border-border rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                {t('generationTab.loadingModels')}
              </span>
            </div>
          ) : speechModels.error ? (
            <div className="flex items-center justify-center p-4 border border-border rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              <span className="text-sm text-red-500">
                {t('generationTab.loadFailed', { error: speechModels.error })}
              </span>
            </div>
          ) : (
            <Select
              value={config.speechRecognitionModel || speechModels.primaryModelId || ''}
              onValueChange={(value) => {
                if (typeof onConfigChange === 'function') {
                  onConfigChange({ ...config, speechRecognitionModel: value });
                  (async () => {
                    try {
                      const response = await fetch(
                        '/api/model-service/scenario?scenario=speech_to_text'
                      );
                      const result = await response.json();
                      if (result.success && result.scenario) {
                        const scenario = result.scenario;
                        scenario.primaryModelId = value;
                        await fetch('/api/model-service', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'update-scenario', data: scenario }),
                        });
                      }
                    } catch (error) {
                      logger.error('Failed to save speech scenario config:', error);
                    }
                  })();
                }
              }}
              disabled={speechModels.availableModels.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('videoAnalysisTab.selectSpeechModel')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {speechModels.availableModels.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {t('generationTab.noModels')}
                  </div>
                ) : (
                  speechModels.getSelectedModels().map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.displayName}</span>
                        {model.id === speechModels.primaryModelId && (
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

          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="text-xs text-foreground">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">💡</span>
                {t('videoAnalysisTab.modelTip')}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">SenseVoice-Small</span>
                  <span className="text-green-600 dark:text-green-400">
                    {t('videoAnalysisTab.senseVoiceSmall')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">SenseVoice-Large</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {t('videoAnalysisTab.senseVoiceLarge')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">CosyVoice</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {t('videoAnalysisTab.cosyVoiceSeries')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">SpeechT5</span>
                  <span className="text-muted-foreground">{t('videoAnalysisTab.speechT5')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-xs text-green-800 dark:text-green-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">🌐</span>
                {t('videoAnalysisTab.supportedPlatforms')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>YouTube</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Bilibili</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                  <span>Vimeo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>{t('videoAnalysisTab.platformEmby')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-700 rounded-full"></span>
                  <span>{t('videoAnalysisTab.platformJellyfin')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>{t('videoAnalysisTab.platformPlex')}</span>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                  <span>{t('videoAnalysisTab.platformDirectLink')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-2 flex items-center">
                <span className="mr-2">⚠️</span>
                {t('videoAnalysisTab.usageNotes')}
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>{t('videoAnalysisTab.noteApi')}</li>
                <li>{t('videoAnalysisTab.noteQuality')}</li>
                <li>{t('videoAnalysisTab.noteLongVideo')}</li>
                <li>{t('videoAnalysisTab.noteDisclaimer')}</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-card/20 border border-border rounded-lg">
            <div className="text-xs text-foreground">
              <p className="font-medium mb-3 flex items-center">
                <span className="mr-2">📖</span>
                {t('videoAnalysisTab.quickGuide')}
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>{t('videoAnalysisTab.guideStep1')}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>{t('videoAnalysisTab.guideStep2')}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>{t('videoAnalysisTab.guideStep3')}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span>{t('videoAnalysisTab.guideStep4')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!config.enableVideoAnalysis && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">{t('videoAnalysisTab.featureDisabled')}</p>
          <p className="text-xs text-muted-foreground">
            {t('videoAnalysisTab.featureDisabledDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

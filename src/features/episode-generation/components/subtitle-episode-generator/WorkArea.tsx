import React from 'react';
import { Film, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { WorkAreaProps } from './types';
import { truncateFileName } from './utils';
import { ResultsDisplay } from './ResultsDisplay';
import { useTranslation } from 'react-i18next';

export function WorkArea({
  file,
  results,
  isGenerating,
  progress,
  onGenerate,
  apiConfigured,
  onOpenGlobalSettings,
  onUpdateResult,
  onMoveToTop,
  onEnhanceContent,
  onAIImprovement,
  aiImprovingIndex,
}: WorkAreaProps): JSX.Element {
  const { t } = useTranslation('episode-generation');

  return (
    <div className="h-full flex flex-col">
      {/* 文件信息和操作栏 */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <Film className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground text-sm md:text-base">
                <span className="block">{truncateFileName(file.name, 30)}</span>
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t('workArea.episodeCount', { count: file.episodes.length })} ·{' '}
                {t('workArea.totalWords', {
                  count: file.episodes.reduce((sum, ep) => sum + ep.wordCount, 0).toLocaleString(),
                })}
              </p>
            </div>
          </div>
        </div>

        {isGenerating && (
          <div className="mt-2 md:mt-3">
            <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground mb-1">
              <span>{t('workArea.generationProgress')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 md:h-2" />
          </div>
        )}
      </div>

      {/* 结果展示区域 */}
      <div className="flex-1 overflow-hidden">
        {results.length > 0 ? (
          <ResultsDisplay
            results={results}
            onUpdateResult={onUpdateResult}
            onMoveToTop={onMoveToTop}
            onEnhanceContent={onEnhanceContent}
            onAIImprovement={onAIImprovement}
            aiImprovingIndex={aiImprovingIndex}
          />
        ) : !apiConfigured ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {t('workArea.configureApiFirst')}
              </h3>
              <p className="text-muted-foreground mb-4">{t('workArea.configureApiDesc')}</p>
              <Button
                onClick={() => {
                  if (onOpenGlobalSettings) {
                    onOpenGlobalSettings('api');
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('workArea.configureApi')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {t('workArea.ready')}
              </h3>
              <p className="text-muted-foreground">{t('workArea.readyHint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

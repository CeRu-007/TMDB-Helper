'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Film,
  Wand2,
  FileText,
} from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface VideoAnalysisStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  duration?: number;
}

export interface SubtitleInfo {
  hasSubtitles: boolean;
  language: string;
  content: string;
  confidence: number;
  segmentCount: number;
}

export interface VideoAnalysisFeedbackProps {
  isAnalyzing: boolean;
  steps: VideoAnalysisStep[];
  error?: string;
  subtitleInfo?: SubtitleInfo;
  onRetry?: () => void;
  onCancel?: () => void;
}

const stepIcons = {
  download: Film,
  extract: Clock,
  subtitle: FileText,
  analyze: Wand2,
  generate: CheckCircle2,
};

export function VideoAnalysisFeedback({
  isAnalyzing,
  steps,
  error,
  subtitleInfo,
  onRetry,
  onCancel,
}: VideoAnalysisFeedbackProps) {
  const { t } = useTranslation('episode-generation');
  const currentStep = steps.find((step) => step.status === 'running');
  const completedSteps = steps.filter((step) => step.status === 'completed').length;
  const totalSteps = steps.length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const stepNames: Record<string, string> = {
    download: t('feedback.stepDownload'),
    extract: t('feedback.stepExtract'),
    subtitle: t('feedback.stepSubtitle'),
    analyze: t('feedback.stepAnalyze'),
    generate: t('feedback.stepGenerate'),
  };

  if (!isAnalyzing && !error && steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {isAnalyzing && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {t('feedback.analyzingAudio')}
              </span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {currentStep && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {currentStep.message ||
                `${t('emptyState.analyzing')}${stepNames[currentStep.id] || currentStep.name}...`}
            </p>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
              >
                {t('feedback.retry')}
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {subtitleInfo && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            {t('feedback.subtitleResult')}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-green-600 dark:text-green-400">
                {t('feedback.detectionStatus')}
              </span>
              <Badge variant={subtitleInfo.hasSubtitles ? 'default' : 'secondary'}>
                {subtitleInfo.hasSubtitles
                  ? t('feedback.subtitleDetected')
                  : t('feedback.noSubtitleDetected')}
              </Badge>
            </div>
            {subtitleInfo.hasSubtitles && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    {t('feedback.language')}
                  </span>
                  <span className="text-green-700 dark:text-green-300">
                    {subtitleInfo.language}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    {t('feedback.confidence')}
                  </span>
                  <span className="text-green-700 dark:text-green-300">
                    {(subtitleInfo.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    {t('feedback.segmentCount')}
                  </span>
                  <span className="text-green-700 dark:text-green-300">
                    {subtitleInfo.segmentCount}
                  </span>
                </div>
                {subtitleInfo.content && (
                  <div className="mt-3">
                    <span className="text-green-600 dark:text-green-400 text-xs">
                      {t('feedback.contentPreview')}
                    </span>
                    <div className="mt-1 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300 max-h-20 overflow-y-auto">
                      {subtitleInfo.content.substring(0, 200)}
                      {subtitleInfo.content.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">
            {t('feedback.analysisProgress')}
          </h4>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id as keyof typeof stepIcons] || Clock;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="relative">
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute left-2 top-6 w-px h-6 transition-colors',
                        step.status === 'completed' ? 'bg-green-300' : 'bg-border'
                      )}
                    />
                  )}

                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                        step.status === 'completed' &&
                          'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                        step.status === 'running' &&
                          'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                        step.status === 'failed' &&
                          'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                        step.status === 'pending' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {step.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {step.status === 'failed' && <XCircle className="h-3 w-3" />}
                      {step.status === 'pending' && <Icon className="h-3 w-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            step.status === 'completed' && 'text-green-700 dark:text-green-300',
                            step.status === 'running' && 'text-blue-700 dark:text-blue-300',
                            step.status === 'failed' && 'text-red-700 dark:text-red-300',
                            step.status === 'pending' && 'text-muted-foreground'
                          )}
                        >
                          {stepNames[step.id] || step.name}
                        </span>

                        <Badge
                          variant={
                            step.status === 'completed'
                              ? 'default'
                              : step.status === 'running'
                                ? 'secondary'
                                : step.status === 'failed'
                                  ? 'destructive'
                                  : 'outline'
                          }
                          className="text-xs"
                        >
                          {step.status === 'completed' && t('feedback.statusCompleted')}
                          {step.status === 'running' && t('feedback.statusRunning')}
                          {step.status === 'failed' && t('feedback.statusFailed')}
                          {step.status === 'pending' && t('feedback.statusPending')}
                        </Badge>
                      </div>

                      {step.message && (
                        <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                      )}

                      {step.status === 'running' && step.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-1" />
                        </div>
                      )}

                      {step.duration && step.status === 'completed' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('feedback.duration', { seconds: step.duration })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isAnalyzing || error) && (
        <div className="flex justify-end space-x-2">
          {onCancel && isAnalyzing && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('feedback.cancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function createDefaultAnalysisSteps(): VideoAnalysisStep[] {
  return [
    { id: 'download', name: 'Download', status: 'pending' },
    { id: 'extract', name: 'Extract', status: 'pending' },
    { id: 'subtitle', name: 'Subtitle', status: 'pending' },
    { id: 'analyze', name: 'Analyze', status: 'pending' },
    { id: 'generate', name: 'Generate', status: 'pending' },
  ];
}

export function updateStepStatus(
  steps: VideoAnalysisStep[],
  stepId: string,
  status: VideoAnalysisStep['status'],
  message?: string,
  progress?: number
): VideoAnalysisStep[] {
  return steps.map((step) =>
    step.id === stepId ? ({ ...step, status, message, progress } as VideoAnalysisStep) : step
  );
}

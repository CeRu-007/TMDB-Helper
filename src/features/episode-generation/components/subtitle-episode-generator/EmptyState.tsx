import React, { useState } from 'react';
import {
  Upload,
  Film,
  Wand2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { VideoAnalyzer } from '@/lib/media/video-analyzer';
import {
  VideoAnalysisStep,
  createDefaultAnalysisSteps,
  updateStepStatus,
  VideoAnalysisFeedback,
} from '@/features/episode-generation/components/video-analysis-feedback';
import { EmptyStateProps } from './types';
import { DELAY_500MS, DELAY_1S } from '@/lib/constants/constants';
import { useTranslation } from 'react-i18next';

export function EmptyState({ onUpload, onVideoAnalysis }: EmptyStateProps) {
  const { t } = useTranslation('episode-generation');
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'video'>('upload');
  const [analysisSteps, setAnalysisSteps] = useState<VideoAnalysisStep[]>([]);
  const [analysisError, setAnalysisError] = useState<string>('');

  const handleVideoAnalysis = async () => {
    if (!videoUrl.trim()) {
      setAnalysisError(t('emptyState.enterVideoUrl'));
      return;
    }

    if (!VideoAnalyzer.validateVideoUrl(videoUrl)) {
      setAnalysisError(t('emptyState.unsupportedUrlFormat'));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisSteps(createDefaultAnalysisSteps());

    try {
      const steps = createDefaultAnalysisSteps();

      setAnalysisSteps(
        updateStepStatus(steps, 'download', 'running', t('emptyState.downloadVideo'))
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_1S));

      setAnalysisSteps((prev) =>
        updateStepStatus(
          updateStepStatus(prev, 'download', 'completed', t('emptyState.audioExtracted')),
          'extract',
          'running',
          t('emptyState.recognizing')
        )
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_1S));

      setAnalysisSteps((prev) =>
        updateStepStatus(
          updateStepStatus(prev, 'extract', 'completed', t('emptyState.contentExtracted')),
          'subtitle',
          'running',
          t('emptyState.detectingSubtitle')
        )
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_1S));

      setAnalysisSteps((prev) =>
        updateStepStatus(
          updateStepStatus(prev, 'subtitle', 'completed', t('emptyState.subtitleExtracted')),
          'analyze',
          'running',
          t('emptyState.analyzingVideo')
        )
      );

      await onVideoAnalysis?.(videoUrl.trim());

      setAnalysisSteps((prev) =>
        updateStepStatus(
          updateStepStatus(prev, 'analyze', 'completed', t('emptyState.aiAnalysisComplete')),
          'generate',
          'running',
          t('emptyState.generatingSynopsis')
        )
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_500MS));

      setAnalysisSteps((prev) =>
        updateStepStatus(prev, 'generate', 'completed', t('emptyState.synopsisGenerationComplete'))
      );
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAnalysisError(t('emptyState.audioTranscribeFailed', { error: errorMessage }));

      setAnalysisSteps((prev) => {
        const runningStep = prev.find((step) => step.status === 'running');
        if (runningStep) {
          return updateStepStatus(prev, runningStep.id, 'failed', errorMessage);
        }
        return prev;
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetryAnalysis = () => {
    setAnalysisError('');
    setAnalysisSteps([]);
    handleVideoAnalysis();
  };

  const handleCancelAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisSteps([]);
    setAnalysisError('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 md:p-4 pb-1 md:pb-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 md:p-3">
          <div className="flex items-start space-x-1.5 md:space-x-2">
            <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-0.5 md:mb-1">⚠️ {t('results.importantReminder')}</p>
              <p
                className="leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: t('results.aiGeneratedHint') + ' ' + t('results.forbiddenUpload'),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start md:items-center justify-center overflow-auto">
        <div className="text-center w-full max-w-xl mx-auto px-3 md:px-5 py-4 md:py-0">
          <div className="mb-4 md:mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-full inline-flex items-center justify-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <h3 className="text-base md:text-lg font-medium text-foreground mb-1 md:mb-2">
            {t('emptyState.synopsisGeneration')}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
            {t('emptyState.uploadOrVideoHint')}
          </p>

          <div className="mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex justify-center min-w-max">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={cn(
                    'min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === 'upload'
                      ? 'bg-muted text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Upload className="h-4 w-4 inline mr-1 md:mr-2" />
                  {t('emptyState.uploadSubtitle')}
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    'min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === 'video'
                      ? 'bg-muted text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Film className="h-4 w-4 inline mr-1 md:mr-2" />
                  {t('emptyState.audioTranscribe')}
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'upload' && (
            <>
              <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-3 md:p-4 mb-4 md:mb-6 text-left">
                <h4 className="text-xs md:text-sm font-medium text-foreground mb-2 md:mb-3 flex items-center">
                  <Upload className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 text-blue-500" />
                  {t('emptyState.subtitleUploadGuide')}
                </h4>
                <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-start space-x-1.5 md:space-x-2">
                    <span className="text-blue-500 font-medium">1.</span>
                    <span>{t('emptyState.step1ApiConfig')}</span>
                  </div>
                  <div className="flex items-start space-x-1.5 md:space-x-2">
                    <span className="text-blue-500 font-medium">2.</span>
                    <span>{t('emptyState.step2UploadSrt')}</span>
                  </div>
                  <div className="flex items-start space-x-1.5 md:space-x-2">
                    <span className="text-blue-500 font-medium">3.</span>
                    <span>{t('emptyState.step3SelectStyle')}</span>
                  </div>
                  <div className="flex items-start space-x-1.5 md:space-x-2">
                    <span className="text-blue-500 font-medium">4.</span>
                    <span>{t('emptyState.step4BatchGenerate')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={onUpload}
                  className="min-h-[44px] bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('emptyState.uploadSubtitleFile')}
                </Button>
              </div>

              <div className="mt-3 md:mt-4 space-y-1.5 md:space-y-2">
                <div className="text-[10px] md:text-xs text-muted-foreground text-center">
                  {t('emptyState.supportedFormats')}
                </div>
                <div className="flex items-center justify-center space-x-3 md:space-x-4 text-[10px] md:text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Upload className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span>{t('emptyState.clickToUpload')}</span>
                  </div>
                  <div className="w-px h-2.5 md:h-3 bg-border"></div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-dashed border-muted-foreground rounded"></div>
                    <span>{t('emptyState.dragToUpload')}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'video' && (
            <>
              <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                  <Film className="h-4 w-4 mr-2 text-purple-500" />
                  {t('emptyState.audioTranscribeGuide')}
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">1.</span>
                    <span>{t('emptyState.step1VideoUrl')}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">2.</span>
                    <span>{t('emptyState.step2AudioExtract')}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">3.</span>
                    <span>{t('emptyState.step3GenerateSynopsis')}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500 font-medium">4.</span>
                    <span>{t('emptyState.step4DurationTip')}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 md:mb-6">
                <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-1.5 md:mb-2">
                    {t('emptyState.videoUrlLabel')}
                  </label>
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder={t('emptyState.videoUrlPlaceholder')}
                        className={cn(
                          'w-full px-3 py-2 border rounded-md text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
                          videoUrl.trim() && VideoAnalyzer.validateVideoUrl(videoUrl)
                            ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                            : videoUrl.trim()
                              ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                              : 'border-border focus:ring-primary'
                        )}
                        disabled={isAnalyzing}
                      />
                      {videoUrl.trim() && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {VideoAnalyzer.validateVideoUrl(videoUrl) ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleVideoAnalysis}
                      disabled={
                        isAnalyzing || !videoUrl.trim() || !VideoAnalyzer.validateVideoUrl(videoUrl)
                      }
                      className="min-h-[44px] px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 disabled:bg-muted disabled:text-muted-foreground text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('emptyState.analyzing')}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          <span>{t('emptyState.startAnalysis')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {videoUrl.trim() && !VideoAnalyzer.validateVideoUrl(videoUrl) && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <XCircle className="h-3 w-3" />
                      <span>{t('emptyState.unsupportedUrl')}</span>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p className="mb-2">{t('emptyState.supportedPlatforms')}</p>
                    <div className="flex flex-wrap gap-2">
                      {VideoAnalyzer.getSupportedPlatforms().map((platform, index) => (
                        <span key={index} className="bg-muted px-2 py-1 rounded text-xs">
                          {platform.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <VideoAnalysisFeedback
                isAnalyzing={isAnalyzing}
                steps={analysisSteps}
                error={analysisError}
                onRetry={handleRetryAnalysis}
                onCancel={handleCancelAnalysis}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

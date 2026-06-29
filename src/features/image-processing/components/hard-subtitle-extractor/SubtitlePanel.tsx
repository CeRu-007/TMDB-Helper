'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Download, Trash2, Edit3, Save, X, Type, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubtitleEntry {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  confidence: number;
}

interface ExtractedFrame {
  timestamp: number;
  imageUrl: string;
  recognizedText: string;
  confidence: number;
}

interface SubtitlePanelProps {
  subtitles: SubtitleEntry[];
  extractedFrames: ExtractedFrame[];
  totalTime?: number; // 总耗时（秒）
  onExport: () => void;
  onClear: () => void;
  onDelete?: (subtitleId: string) => void;
  videoFileName?: string; // 视频文件名
}

export function SubtitlePanel({
  subtitles,
  extractedFrames,
  totalTime,
  onExport,
  onClear,
  onDelete,
  videoFileName,
}: SubtitlePanelProps) {
  const { t } = useTranslation('image-processing');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // 格式化总耗时
  const formatTotalTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t('hardSubtitle.timeFormat', {
      minutes,
      seconds: secs,
      defaultValue: `${minutes}分${secs}秒`,
    });
  };

  const handleEditStart = (subtitle: SubtitleEntry) => {
    setEditingId(subtitle.id);
    setEditText(subtitle.text);
  };

  const handleEditSave = (id: string) => {
    // TODO: 更新字幕文本
    setEditingId(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  // 生成SRT格式文本
  const generateSRTContent = () => {
    return subtitles
      .map((sub) => {
        return `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`;
      })
      .join('\n');
  };

  // 跳转到AI生成页面
  const handleGoToAIGenerator = () => {
    const srtContent = generateSRTContent();
    const fileName = videoFileName ? videoFileName.replace(/\.[^/.]+$/, '') : 'subtitle';

    // 保存到 localStorage
    localStorage.setItem(
      'pending-subtitle-import',
      JSON.stringify({
        content: srtContent,
        fileName: `${fileName}.srt`,
        timestamp: Date.now(),
      })
    );

    // 触发自定义事件通知页面跳转
    window.dispatchEvent(new CustomEvent('navigate-to-episode-generator'));
  };

  if (subtitles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Type className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">{t('hardSubtitle.noSubtitlesYet')}</p>
        <p className="text-muted-foreground text-sm">{t('hardSubtitle.startExtractingHint')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 border-b border-border">
        <div className="flex flex-col space-y-0.5">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {subtitles.length} {t('hardSubtitle.subtitleCount_label')}
          </span>
          {totalTime !== undefined && totalTime > 0 && (
            <span className="text-xs text-gray-400">
              {t('hardSubtitle.timeCost')} {formatTotalTime(totalTime)}
            </span>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="min-h-[44px] md:min-h-0 min-w-[44px] md:min-w-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGoToAIGenerator}
            className="min-h-[44px] md:min-h-0"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            <span className="text-xs">{t('hardSubtitle.generateEpisodes')}</span>
          </Button>
          <Button size="sm" onClick={onExport} className="min-h-[44px] md:min-h-0">
            <Download className="h-4 w-4 mr-1.5" />
            <span className="text-xs">{t('hardSubtitle.exportSrt')}</span>
          </Button>
        </div>
      </div>

      {/* 字幕列表 */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              className="bg-gray-50 bg-muted/50 rounded-lg p-3 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-gray-500">#{subtitle.index}</span>
                  <span className="text-xs text-gray-400">
                    {subtitle.startTime} → {subtitle.endTime}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      subtitle.confidence >= 0.9
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                        : subtitle.confidence >= 0.7
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                    }`}
                  >
                    {Math.round(subtitle.confidence * 100)}%
                  </span>
                  {editingId !== subtitle.id && (
                    <>
                      {onDelete && (
                        <button
                          className="p-2 md:p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                          onClick={() => onDelete(subtitle.id)}
                          title={t('hardSubtitle.deleteSubtitle')}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
                        </button>
                      )}
                      <button
                        className="p-2 md:p-1 hover:bg-accent rounded transition-colors"
                        onClick={() => handleEditStart(subtitle)}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === subtitle.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex justify-end flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditCancel}
                      className="min-h-[44px] md:min-h-0"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('hardSubtitle.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditSave(subtitle.id)}
                      className="min-h-[44px] md:min-h-0"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {t('hardSubtitle.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground">{subtitle.text}</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 预览SRT */}
      <div className="border-t border-border">
        <details className="group">
          <summary className="px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-accent">
            {t('hardSubtitle.previewSrt')}
          </summary>
          <div className="p-3 bg-muted/50 max-h-32 overflow-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {generateSRTContent().slice(0, 500)}
              {generateSRTContent().length > 500 && '...'}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}

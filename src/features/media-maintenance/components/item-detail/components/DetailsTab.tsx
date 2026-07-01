'use client';

import { useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { AlertTriangle, X, Plus, StickyNote, Sparkles, HelpCircle } from 'lucide-react';
import { SeasonSelector } from './SeasonSelector';
import { EpisodeBatchActions } from './EpisodeBatchActions';
import { EpisodeList } from './EpisodeList';
import type { TMDBItem, Season } from '@/types/tmdb-item';

interface DetailsTabProps {
  item: TMDBItem;
  selectedSeason?: number;
  currentSeason: Season | null;
  editing: boolean;
  isRefreshingTMDBData: boolean;
  refreshError: string | null;
  customSeasonNumber: number;
  onSeasonClick: (seasonNumber: number) => void;
  onResetSeason: () => void;
  onDeleteSeason: () => void;
  onRefreshTMDB: () => void;
  onAddSeason: (seasonNumber: number, episodeCount: number) => void;
  onEpisodeProgressUpdate: (currentEpisode: number, seasonNumber: number) => void;
  onTotalEpisodesChange: (count: number) => void;
  onCustomSeasonNumberChange: (value: number) => void;
  onClearRefreshError: () => void;
  onSetCustomSeasonNumber: (value: number) => void;
  onTagsChange?: (tags: string[]) => void;
}

interface Suggestion {
  label: string;
  labelKey: string;
}

export function DetailsTab({
  item,
  selectedSeason,
  currentSeason,
  editing,
  isRefreshingTMDBData,
  refreshError,
  customSeasonNumber,
  onSeasonClick,
  onResetSeason,
  onDeleteSeason,
  onRefreshTMDB,
  onAddSeason,
  onEpisodeProgressUpdate,
  onTotalEpisodesChange,
  onCustomSeasonNumberChange,
  onClearRefreshError,
  onSetCustomSeasonNumber,
  onTagsChange,
}: DetailsTabProps) {
  const { t } = useTranslation('media');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const tags = item.tags || [];
  const tagSet = useMemo(() => new Set(tags), [tags]);

  const suggestionDefs: { labelKey: string; id: string }[] = useMemo(() => [
    { labelKey: 'suggestionMissingLogo', id: 'missing_logo' },
    { labelKey: 'suggestionCastCrew', id: 'cast_crew' },
    { labelKey: 'suggestionFeedbackPending', id: 'feedback_pending' },
  ], []);

  const suggestions = useMemo<Suggestion[]>(() => {
    return suggestionDefs
      .map((s) => ({ label: t(s.labelKey, { ns: 'media' }), labelKey: s.labelKey }))
      .filter((s) => !tagSet.has(s.label));
  }, [tagSet, t, suggestionDefs]);

  const handleAddTag = () => {
    const input = tagInputRef.current;
    if (input && input.value.trim() && onTagsChange) {
      onTagsChange([...tags, input.value.trim()]);
      input.value = '';
    }
  };

  const handleRemoveTag = (idx: number) => {
    if (onTagsChange) {
      onTagsChange(tags.filter((_, i) => i !== idx));
    }
  };

  const handleAddSuggestion = (suggestion: Suggestion) => {
    if (onTagsChange) {
      onTagsChange([...tags, suggestion.label]);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="space-y-3 md:space-y-4">
        {/* 季数选择器 */}
        <SeasonSelector
          seasons={item.seasons || []}
          selectedSeason={selectedSeason ?? null}
          onSeasonClick={onSeasonClick}
        />

        {/* 季数操作 */}
        <EpisodeBatchActions
          currentSeason={currentSeason || undefined}
          selectedSeason={selectedSeason}
          editing={editing}
          customSeasonNumber={customSeasonNumber}
          seasons={item.seasons || []}
          onResetSeason={onResetSeason}
          onDeleteSeason={onDeleteSeason}
          onAddSeason={onAddSeason}
          onCustomSeasonNumberChange={onCustomSeasonNumberChange}
          onTotalEpisodesChange={onTotalEpisodesChange}
        />

        {/* 显示刷新错误 */}
        {refreshError && (
          <div className="bg-red-500/20 backdrop-blur-md text-red-200 p-3 rounded-md mb-4 flex items-center border-none shadow-sm">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">{refreshError}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-red-200 hover:text-red-100 hover:bg-red-500/30"
              onClick={onClearRefreshError}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* 剧集列表（编辑模式下收起） */}
        {!editing && (
          <EpisodeList
            mediaType={item.mediaType}
            selectedSeason={selectedSeason}
            currentSeason={currentSeason || undefined}
            editing={editing}
            item={item}
            onEpisodeProgressUpdate={onEpisodeProgressUpdate}
          />
        )}

        {/* 备注区域 */}
        <Card variant="frosted">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <StickyNote className="h-4 w-4" />
              <span className="text-sm font-medium">{t('tags', { ns: 'media' })}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5} className="max-w-xs z-[9999]">
                    <p className="text-xs">{t('tagHelp', { ns: 'media' })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            {/* 已有备注 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-background/40 backdrop-blur-sm border border-border/20 text-foreground/80"
                  >
                    {tag}
                    {editing && onTagsChange && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* 推荐备注（仅编辑模式） */}
            {editing && onTagsChange && suggestions.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">推荐</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.labelKey}
                      type="button"
                      onClick={() => handleAddSuggestion(s)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 添加备注输入（仅编辑模式） */}
            {editing && onTagsChange && (
              <div className="flex gap-1">
                <Input
                  ref={tagInputRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={t('tagPlaceholder', { ns: 'media' })}
                  className="h-7 text-xs w-36"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddTag}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('add', { ns: 'common' })}
                </Button>
              </div>
            )}

            {/* 空状态（仅非编辑模式） */}
            {tags.length === 0 && !editing && (
              <p className="text-sm text-muted-foreground">{t('noTags', { ns: 'media' })}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

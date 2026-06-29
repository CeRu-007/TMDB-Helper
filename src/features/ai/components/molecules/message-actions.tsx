import React from 'react';
import { Button } from '@/shared/components/ui/button';
import { Copy, Edit2, Trash2, RotateCcw, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MessageActionsProps {
  messageId: string;
  messageRole: 'user' | 'assistant';
  messageRating?: 'like' | 'dislike' | null;
  isLastMessage: boolean;
  isLoading: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onRate?: (rating: 'like' | 'dislike' | null) => void;
}

export function MessageActions({
  messageRole,
  messageRating,
  isLastMessage,
  isLoading,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onContinue,
  onRate,
}: MessageActionsProps) {
  const { t } = useTranslation('ai-chat');

  if (messageRole === 'user') {
    return (
      <div className="flex justify-end gap-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-accent text-gray-400 hover:text-gray-600 dark:hover:text-muted-foreground transition-colors"
          onClick={onCopy}
          title={t('copy')}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-accent text-gray-400 hover:text-gray-600 dark:hover:text-muted-foreground transition-colors"
          onClick={onEdit}
          disabled={isLoading}
          title={t('edit')}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          onClick={onDelete}
          disabled={isLoading}
          title={t('delete')}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-4 -ml-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-accent text-gray-400 hover:text-gray-600 dark:hover:text-muted-foreground transition-colors"
        onClick={onCopy}
        title={t('copy')}
      >
        <Copy className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-accent text-gray-400 hover:text-gray-600 dark:hover:text-muted-foreground transition-colors"
        onClick={onEdit}
        disabled={isLoading}
        title={t('edit')}
      >
        <Edit2 className="w-4 h-4" />
      </Button>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          onClick={onRegenerate}
          disabled={isLoading}
          title={t('regenerateAction')}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      )}
      {onRate && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0 rounded-lg transition-all',
              messageRating === 'like'
                ? 'text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            onClick={() => onRate('like')}
            title={t('like')}
          >
            <ThumbsUp className={cn('w-4 h-4', messageRating === 'like' ? 'fill-current' : '')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0 rounded-lg transition-all',
              messageRating === 'dislike'
                ? 'text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            onClick={() => onRate('dislike')}
            title={t('dislike')}
          >
            <ThumbsDown
              className={cn('w-4 h-4', messageRating === 'dislike' ? 'fill-current' : '')}
            />
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
        onClick={onDelete}
        disabled={isLoading}
        title={t('delete')}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      {isLastMessage && onContinue && (
        <>
          <div className="w-px h-5 bg-border mx-1.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            onClick={onContinue}
            disabled={isLoading}
            title={t('continueGeneration')}
          >
            <span className="text-sm font-medium">{t('continueAction')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

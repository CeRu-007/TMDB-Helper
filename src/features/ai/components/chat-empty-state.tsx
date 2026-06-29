import React from 'react';
import { Upload, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatEmptyStateProps {
  onUploadClick: () => void;
}

export function ChatEmptyState({ onUploadClick }: ChatEmptyStateProps) {
  const { t } = useTranslation('ai-chat');
  return (
    <div className="h-full flex flex-col items-center justify-center pt-8">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">{t('emptyStateTitle')}</h2>
        <p className="text-muted-foreground mb-12 text-lg leading-relaxed">{t('subtitlePrompt')}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={onUploadClick}
          >
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('uploadSubtitleCard')}</h3>
            <p className="text-sm text-muted-foreground">{t('uploadSubtitleDesc')}</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30 cursor-pointer hover:shadow-lg transition-all duration-200 group">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('aiChatCard')}</h3>
            <p className="text-sm text-muted-foreground">{t('aiChatDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

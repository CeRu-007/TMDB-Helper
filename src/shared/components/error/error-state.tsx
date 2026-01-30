import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
}

export function ErrorState({
  title = '出错了',
  message,
  onRetry,
  retryText = '重试',
  showIcon = true,
}: ErrorStateProps): JSX.Element {
  return (
    <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
      <div className="flex flex-col items-center text-center">
        {showIcon && (
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        )}
        <h3 className="text-red-600 dark:text-red-300 font-medium mb-1">
          {title}
        </h3>
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">
          {message}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryText}
          </Button>
        )}
      </div>
    </div>
  );
}
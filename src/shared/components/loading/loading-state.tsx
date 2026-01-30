import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const;

export function LoadingState({
  message = '加载中，请稍候...',
  size = 'md'
}: LoadingStateProps): JSX.Element {
  return (
    <div className="flex justify-center items-center h-48">
      <div className="flex flex-col items-center">
        <Loader2 className={`${SIZE_CLASSES[size]} animate-spin text-blue-500 mb-3`} />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
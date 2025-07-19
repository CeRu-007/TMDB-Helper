'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

/**
 * ChunkLoadError 错误边界组件
 * 专门处理 webpack chunk 加载失败和其他模块加载错误
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 检查是否是 ChunkLoadError 或相关的模块加载错误
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Loading CSS chunk') ||
                        error.message.includes('Loading module');

    console.error('[ChunkErrorBoundary] 捕获到错误:', error);

    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChunkErrorBoundary] 错误详情:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 调用外部错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 如果是 ChunkLoadError，尝试自动重试
    if (this.isChunkLoadError(error) && this.state.retryCount < this.maxRetries) {
      console.log(`[ChunkErrorBoundary] 检测到 ChunkLoadError，准备自动重试 (${this.state.retryCount + 1}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1)); // 递增延迟
    }
  }

  private isChunkLoadError(error: Error): boolean {
    return error.name === 'ChunkLoadError' || 
           error.message.includes('Loading chunk') ||
           error.message.includes('Loading CSS chunk') ||
           error.message.includes('Loading module') ||
           error.message.includes('ChunkLoadError');
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`[ChunkErrorBoundary] 重试加载 (${this.state.retryCount + 1}/${this.maxRetries})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleManualRetry = () => {
    console.log('[ChunkErrorBoundary] 手动重试');
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  private handleReload = () => {
    console.log('[ChunkErrorBoundary] 重新加载页面');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义降级 UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const isChunkError = error ? this.isChunkLoadError(error) : false;
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              {isChunkError ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Bug className="h-5 w-5" />
              )}
              {isChunkError ? '模块加载失败' : '应用程序错误'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isChunkError ? (
                  <>
                    应用程序的某个模块加载失败。这通常是由于网络问题或缓存问题导致的。
                    {canRetry && ` 系统已自动重试 ${this.state.retryCount} 次。`}
                  </>
                ) : (
                  '应用程序遇到了意外错误。请尝试刷新页面或联系技术支持。'
                )}
              </AlertDescription>
            </Alert>

            {error && (
              <div className="bg-muted p-3 rounded text-sm">
                <div className="font-medium mb-1">错误详情：</div>
                <div className="text-muted-foreground">
                  {error.name}: {error.message}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isChunkError && canRetry && (
                <Button onClick={this.handleManualRetry} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试加载
                </Button>
              )}
              
              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新页面
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  开发者信息 (仅开发环境显示)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * 高阶组件：为组件添加 ChunkLoadError 错误边界
 */
export function withChunkErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ChunkErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ChunkErrorBoundary>
  );

  WrappedComponent.displayName = `withChunkErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook：在函数组件中使用错误边界
 */
export function useChunkErrorHandler() {
  const handleChunkError = React.useCallback((error: Error) => {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      console.error('[ChunkErrorHandler] 检测到 ChunkLoadError:', error);
      
      // 可以在这里添加自定义的错误处理逻辑
      // 比如显示 toast 通知、发送错误报告等
      
      return true; // 表示错误已被处理
    }
    
    return false; // 表示错误未被处理，应该继续抛出
  }, []);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        const handled = handleChunkError(event.reason);
        if (handled) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleChunkError]);

  return { handleChunkError };
}

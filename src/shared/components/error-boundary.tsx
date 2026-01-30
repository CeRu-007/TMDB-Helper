'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { logger } from '@/lib/utils/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 在开发环境下打印错误
    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认的错误 UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p className="font-medium">
                    哎呀，页面出现了问题
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {this.state.error?.message || '发生了未知错误'}
                  </p>

                  {(this.props.showErrorDetails || process.env.NODE_ENV === 'development') && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        查看错误详情
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {this.state.error?.stack}
                      </pre>
                    </details>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.handleReset}
                    >
                      重试
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      刷新页面
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 用于异步操作的错误边界 Hook
 */
export function AsyncErrorBoundary({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const [error, setError] = React.useState<Error | null>(null)

  // 重置错误状态
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  // 错误处理函数
  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  if (error) {
    return (
      <ErrorBoundary
        fallback={fallback}
        onError={handleError}
      >
        <div />
      </ErrorBoundary>
    )
  }

  return <>{children}</>
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { handleError, ErrorType } from '@/lib/error-handler'
import { log } from '@/lib/logger'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
    errorId: string | null
    retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
    private maxRetries = 3

    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorId: null,
            retryCount: 0
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
            errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 记录错误
        const appError = handleError(error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
            retryCount: this.state.retryCount
        })

        log.error('ErrorBoundary', '组件错误边界捕获到错误', {
            error: appError,
            errorInfo
        })

        // 调用外部错误处理器
        this.props.onError?.(error, errorInfo)
    }

    handleRetry = () => {
        if (this.state.retryCount < this.maxRetries) {
            log.info('ErrorBoundary', `用户重试，第 ${this.state.retryCount + 1} 次`)
            this.setState(prevState => ({
                hasError: false,
                error: null,
                errorId: null,
                retryCount: prevState.retryCount + 1
            }))
        }
    }

    handleReset = () => {
        log.info('ErrorBoundary', '用户重置错误状态')
        this.setState({
            hasError: false,
            error: null,
            errorId: null,
            retryCount: 0
        })
    }

    handleReload = () => {
        log.info('ErrorBoundary', '用户刷新页面')
        window.location.reload()
    }

    handleGoHome = () => {
        log.info('ErrorBoundary', '用户返回首页')
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            // 如果提供了自定义fallback，使用它
            if (this.props.fallback) {
                return this.props.fallback
            }

            const { error, retryCount } = this.state
            const canRetry = retryCount < this.maxRetries
            const errorMessage = error?.message || '未知错误'
            const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network')

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                    <Card className="w-full max-w-2xl">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                页面出现错误
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Alert className="border-red-200 dark:border-red-800">
                                <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <AlertDescription className="text-red-700 dark:text-red-300">
                                    <div className="space-y-2">
                                        <p className="font-medium">错误详情：</p>
                                        <p className="text-sm font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                            {errorMessage}
                                        </p>
                                        {this.state.errorId && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                错误ID: {this.state.errorId}
                                            </p>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>

                            {isNetworkError && (
                                <Alert className="border-blue-200 dark:border-blue-800">
                                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                                        <p className="font-medium mb-2">网络连接问题</p>
                                        <ul className="text-sm space-y-1 list-disc list-inside">
                                            <li>请检查网络连接是否正常</li>
                                            <li>确认服务器是否可访问</li>
                                            <li>尝试刷新页面或稍后重试</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex flex-row gap-3 justify-center">
                                {canRetry && (
                                    <Button
                                        onClick={this.handleRetry}
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        重试 ({this.maxRetries - retryCount} 次剩余)
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={this.handleReset}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    重置
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleReload}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    刷新页面
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleGoHome}
                                    className="flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    返回首页
                                </Button>
                            </div>

                            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                <p>如果问题持续存在，请联系技术支持</p>
                                <p className="mt-1">
                                    重试次数: {retryCount}/{this.maxRetries}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

// 高阶组件包装器
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<Props, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    )

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
    return WrappedComponent
}

// 异步错误处理Hook
export function useAsyncError() {
    const [, setError] = React.useState()

    return React.useCallback((error: Error) => {
        setError(() => {
            throw error
        })
    }, [])
}
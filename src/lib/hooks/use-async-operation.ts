/**
 * 异步操作管理 Hook
 * 
 * 简化异步操作的状态管理，包括加载、错误和成功状态
 */

import { useState, useCallback } from 'react'

export interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  success: boolean
}

export interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  initialData?: T | null
}

export function useAsyncOperation<T = any>({
  onSuccess,
  onError,
  initialData = null
}: UseAsyncOperationOptions<T> = {}) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: initialData,
    loading: false,
    error: null,
    success: false
  })

  const execute = useCallback(async (
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setState({
      data: state.data,
      loading: true,
      error: null,
      success: false
    })

    try {
      const result = await operation()
      
      setState({
        data: result,
        loading: false,
        error: null,
        success: true
      })

      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      
      setState({
        data: state.data,
        loading: false,
        error: err,
        success: false
      })

      if (onError) {
        onError(err)
      }

      return null
    }
  }, [state.data, onSuccess, onError])

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      success: false
    })
  }, [initialData])

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData
  }
}
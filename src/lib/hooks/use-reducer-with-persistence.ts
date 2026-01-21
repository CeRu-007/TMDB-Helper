/**
 * 带持久化的 useReducer Hook
 * 
 * 将 reducer 状态自动保存到 localStorage，并在组件加载时恢复
 */

import { useReducer, useEffect, useCallback } from 'react'
import { storageService } from '../storage/storage-service'

export interface ReducerWithPersistenceOptions<T, A = unknown> {
  key: string
  initialState: T
  reducer: (state: T, action: A) => T
  persist?: boolean
  onStateChange?: (state: T) => void
}

/**
 * 创建一个带持久化的 reducer hook
 */
export function useReducerWithPersistence<T, A = unknown>({
  key,
  initialState,
  reducer,
  persist = true,
  onStateChange
}: ReducerWithPersistenceOptions<T, A>) {
  // 从 localStorage 恢复初始状态
  const getInitialState = useCallback((): T => {
    if (persist) {
      const saved = storageService.get<T>(key, null)
      return saved !== null ? saved : initialState
    }
    return initialState
  }, [key, initialState, persist])

  const [state, dispatch] = useReducer(reducer, getInitialState())

  // 持久化状态变化
  useEffect(() => {
    if (persist) {
      storageService.set(key, state)
    }
    if (onStateChange) {
      onStateChange(state)
    }
  }, [key, state, persist, onStateChange])

  return { state, dispatch }
}

/**
 * 创建状态重置动作
 */
export function createResetAction<T>(initialState: T) {
  return { type: 'RESET', payload: initialState }
}

/**
 * 创建批量更新动作
 */
export function createBatchUpdateAction<T>(updates: Partial<T>) {
  return { type: 'BATCH_UPDATE', payload: updates }
}
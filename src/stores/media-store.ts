/**
 * Media Store - 媒体数据状态管理
 * 替代 DataProvider 和相关 hooks
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { TMDBItem } from '@/types/tmdb-item'

// 存储状态接口
interface MediaState {
  // 数据
  items: TMDBItem[]
  
  // 状态
  loading: boolean
  error: string | null
  initialized: boolean
  isConnected: boolean
  pendingOperations: number
  
  // 操作
  setItems: (items: TMDBItem[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setInitialized: (initialized: boolean) => void
  setIsConnected: (connected: boolean) => void
  setPendingOperations: (count: number) => void
  
  // CRUD 操作
  addItem: (item: TMDBItem) => void
  updateItem: (item: TMDBItem) => void
  deleteItem: (id: string) => void
  getItemById: (id: string) => TMDBItem | undefined
  
  // 批量操作
  addItems: (items: TMDBItem[]) => void
  updateItems: (items: TMDBItem[]) => void
  deleteItems: (ids: string[]) => void
  
  // 工具方法
  clearError: () => void
  reset: () => void
}

// 初始状态
const initialState = {
  items: [],
  loading: false,
  error: null,
  initialized: false,
  isConnected: false,
  pendingOperations: 0,
}

// 创建 store
export const useMediaStore = create<MediaState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 设置方法
        setItems: (items) => set({ items }, false, 'setItems'),
        setLoading: (loading) => set({ loading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
        setInitialized: (initialized) => set({ initialized }, false, 'setInitialized'),
        setIsConnected: (isConnected) => set({ isConnected }, false, 'setIsConnected'),
        setPendingOperations: (pendingOperations) => set({ pendingOperations }, false, 'setPendingOperations'),
        
        // CRUD 操作
        addItem: (item) => set(
          (state) => ({ items: [...state.items, item] }),
          false,
          'addItem'
        ),
        
        updateItem: (item) => set(
          (state) => ({
            items: state.items.map((i) => (i.id === item.id ? item : i)),
          }),
          false,
          'updateItem'
        ),
        
        deleteItem: (id) => set(
          (state) => ({
            items: state.items.filter((i) => i.id !== id),
          }),
          false,
          'deleteItem'
        ),
        
        getItemById: (id) => get().items.find((i) => i.id === id),
        
        // 批量操作
        addItems: (items) => set(
          (state) => ({ items: [...state.items, ...items] }),
          false,
          'addItems'
        ),
        
        updateItems: (updatedItems) => set(
          (state) => ({
            items: state.items.map((item) => {
              const updated = updatedItems.find((u) => u.id === item.id)
              return updated || item
            }),
          }),
          false,
          'updateItems'
        ),
        
        deleteItems: (ids) => set(
          (state) => ({
            items: state.items.filter((i) => !ids.includes(i.id)),
          }),
          false,
          'deleteItems'
        ),
        
        // 工具方法
        clearError: () => set({ error: null }, false, 'clearError'),
        
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'media-store',
        // 只持久化必要的字段
        partialize: (state) => ({
          // items 不持久化，由服务端加载
          initialized: state.initialized,
        }),
      }
    ),
    { name: 'MediaStore' }
  )
)

// 选择器 hooks - 用于性能优化
export const useMediaItems = () => useMediaStore((state) => state.items)
export const useMediaLoading = () => useMediaStore((state) => state.loading)
export const useMediaError = () => useMediaStore((state) => state.error)
export const useMediaInitialized = () => useMediaStore((state) => state.initialized)

// 统计信息 hook
export const useMediaStats = () => {
  const items = useMediaItems()
  return {
    total: items.length,
    completed: items.filter((i) => i.completed).length,
    ongoing: items.filter((i) => !i.completed).length,
  }
}

/**
 * 全局状态管理
 * 使用Context + Reducer模式管理应用状态
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { TMDBItem, ScheduledTask } from './storage';
import { log } from '@/lib/utils/logger';
import { handleError } from '@/lib/utils/error-handler';

// 状态接口
export interface AppState {
  // 数据状态
  items: TMDBItem[];
  scheduledTasks: ScheduledTask[];

  // UI状态
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // 用户偏好
  preferences: {
    theme: 'light' | 'dark' | 'system';
    layout: 'sidebar';
    language: 'zh-CN' | 'en-US';
    autoSave: boolean;
    notifications: boolean;
  };

  // 过滤和排序
  filters: {
    category: string;
    status: 'all' | 'ongoing' | 'completed';
    weekday: 'recent' | number;
    searchQuery: string;
  };

  // 选中状态
  selectedItems: string[];
  selectedItem: TMDBItem | null;
}

// 动作类型
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: TMDBItem[] }
  | { type: 'ADD_ITEM'; payload: TMDBItem }
  | { type: 'UPDATE_ITEM'; payload: TMDBItem }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'SET_SCHEDULED_TASKS'; payload: ScheduledTask[] }
  | { type: 'ADD_SCHEDULED_TASK'; payload: ScheduledTask }
  | { type: 'UPDATE_SCHEDULED_TASK'; payload: ScheduledTask }
  | { type: 'DELETE_SCHEDULED_TASK'; payload: string }
  | { type: 'SET_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'SET_SELECTED_ITEMS'; payload: string[] }
  | { type: 'SET_SELECTED_ITEM'; payload: TMDBItem | null }
  | { type: 'TOGGLE_ITEM_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'RESET_STATE' };

// 初始状态
const initialState: AppState = {
  items: [],
  scheduledTasks: [],
  loading: false,
  error: null,
  initialized: false,
  preferences: {
    theme: 'system',
    layout: 'sidebar',
    language: 'zh-CN',
    autoSave: true,
    notifications: true,
  },
  filters: {
    category: 'all',
    status: 'all',
    weekday: 'recent',
    searchQuery: '',
  },
  selectedItems: [],
  selectedItem: null,
};

// Reducer函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };

    case 'SET_ITEMS':
      return { ...state, items: action.payload };

    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
        selectedItem:
          state.selectedItem?.id === action.payload.id
            ? action.payload
            : state.selectedItem,
      };

    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        selectedItems: state.selectedItems.filter(
          (id) => id !== action.payload,
        ),
        selectedItem:
          state.selectedItem?.id === action.payload ? null : state.selectedItem,
      };

    case 'SET_SCHEDULED_TASKS':
      return { ...state, scheduledTasks: action.payload };

    case 'ADD_SCHEDULED_TASK':
      return {
        ...state,
        scheduledTasks: [...state.scheduledTasks, action.payload],
      };

    case 'UPDATE_SCHEDULED_TASK':
      return {
        ...state,
        scheduledTasks: state.scheduledTasks.map((task) =>
          task.id === action.payload.id ? action.payload : task,
        ),
      };

    case 'DELETE_SCHEDULED_TASK':
      return {
        ...state,
        scheduledTasks: state.scheduledTasks.filter(
          (task) => task.id !== action.payload,
        ),
      };

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };

    case 'SET_SELECTED_ITEM':
      return { ...state, selectedItem: action.payload };

    case 'TOGGLE_ITEM_SELECTION':
      const isSelected = state.selectedItems.includes(action.payload);
      return {
        ...state,
        selectedItems: isSelected
          ? state.selectedItems.filter((id) => id !== action.payload)
          : [...state.selectedItems, action.payload],
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedItems: [],
        selectedItem: null,
      };

    case 'RESET_STATE':
      return { ...initialState };

    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider组件
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 加载用户偏好
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('app_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'SET_PREFERENCES', payload: preferences });
        log.debug('StateManager', '用户偏好已加载', preferences);
      }
    } catch (error) {
      log.warn('StateManager', '加载用户偏好失败', error);
    }
  }, []);

  // 保存用户偏好
  useEffect(() => {
    try {
      localStorage.setItem(
        'app_preferences',
        JSON.stringify(state.preferences),
      );
      log.debug('StateManager', '用户偏好已保存', state.preferences);
    } catch (error) {
      log.warn('StateManager', '保存用户偏好失败', error);
    }
  }, [state.preferences]);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

// 选择器Hook
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const { state } = useAppState();
  return selector(state);
}

// 动作Hook
export function useAppActions() {
  const { dispatch } = useAppState();

  return {
    // 数据操作
    setItems: (items: TMDBItem[]) =>
      dispatch({ type: 'SET_ITEMS', payload: items }),
    addItem: (item: TMDBItem) => dispatch({ type: 'ADD_ITEM', payload: item }),
    updateItem: (item: TMDBItem) =>
      dispatch({ type: 'UPDATE_ITEM', payload: item }),
    deleteItem: (id: string) => dispatch({ type: 'DELETE_ITEM', payload: id }),

    // 任务操作
    setScheduledTasks: (tasks: ScheduledTask[]) =>
      dispatch({ type: 'SET_SCHEDULED_TASKS', payload: tasks }),
    addScheduledTask: (task: ScheduledTask) =>
      dispatch({ type: 'ADD_SCHEDULED_TASK', payload: task }),
    updateScheduledTask: (task: ScheduledTask) =>
      dispatch({ type: 'UPDATE_SCHEDULED_TASK', payload: task }),
    deleteScheduledTask: (id: string) =>
      dispatch({ type: 'DELETE_SCHEDULED_TASK', payload: id }),

    // UI状态
    setLoading: (loading: boolean) =>
      dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) =>
      dispatch({ type: 'SET_ERROR', payload: error }),
    setInitialized: (initialized: boolean) =>
      dispatch({ type: 'SET_INITIALIZED', payload: initialized }),

    // 偏好设置
    setPreferences: (preferences: Partial<AppState['preferences']>) =>
      dispatch({ type: 'SET_PREFERENCES', payload: preferences }),

    // 过滤器
    setFilters: (filters: Partial<AppState['filters']>) =>
      dispatch({ type: 'SET_FILTERS', payload: filters }),

    // 选择操作
    setSelectedItems: (items: string[]) =>
      dispatch({ type: 'SET_SELECTED_ITEMS', payload: items }),
    setSelectedItem: (item: TMDBItem | null) =>
      dispatch({ type: 'SET_SELECTED_ITEM', payload: item }),
    toggleItemSelection: (id: string) =>
      dispatch({ type: 'TOGGLE_ITEM_SELECTION', payload: id }),
    clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),

    // 重置
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  };
}

// 计算属性Hook
export function useComputedState() {
  const state = useAppState().state;

  return {
    // 过滤后的项目
    filteredItems: React.useMemo(() => {
      let filtered = state.items;

      // 按分类过滤
      if (state.filters.category !== 'all') {
        filtered = filtered.filter(
          (item) => item.category === state.filters.category,
        );
      }

      // 按状态过滤
      if (state.filters.status !== 'all') {
        filtered = filtered.filter(
          (item) => item.status === state.filters.status,
        );
      }

      // 按搜索查询过滤
      if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.originalTitle?.toLowerCase().includes(query) ||
            item.notes?.toLowerCase().includes(query),
        );
      }

      return filtered;
    }, [state.items, state.filters]),

    // 统计信息
    statistics: React.useMemo(() => {
      const total = state.items.length;
      const ongoing = state.items.filter(
        (item) => item.status === 'ongoing',
      ).length;
      const completed = state.items.filter(
        (item) => item.status === 'completed',
      ).length;
      const byCategory = state.items.reduce(
        (acc, item) => {
          const category = item.category || 'unknown';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        total,
        ongoing,
        completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        byCategory,
      };
    }, [state.items]),

    // 运行中的任务
    runningTasks: React.useMemo(
      () => state.scheduledTasks.filter((task) => task.isRunning),
      [state.scheduledTasks],
    ),
  };
}

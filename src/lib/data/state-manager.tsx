/**
 * 全局状态管理
 * 使用Context + Reducer模式管理应用状态
 */

import React, { createContext, useContext, useReducer, useEffect } from "react"
import { TMDBItem } from "./storage"
import { log } from "@/lib/utils/logger"

// 状态接口
export interface AppState {
  // 数据状态
  items: TMDBItem[]

  // UI状态
  loading: boolean
  error: string | null
  initialized: boolean

  // 用户偏好
  preferences: {
    theme: "light" | "dark" | "system"
    layout: "sidebar"
    language: "zh-CN" | "en-US"
    autoSave: boolean
    notifications: boolean
  }

  // 过滤和排序
  filters: {
    category: string
    status: "all" | "ongoing" | "completed"
    weekday: "recent" | number
    searchQuery: string
  }

  // 选中状态
  selectedItems: string[]
  selectedItem: TMDBItem | null
}

// 动作类型
export type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "SET_ITEMS"; payload: TMDBItem[] }
  | { type: "ADD_ITEM"; payload: TMDBItem }
  | { type: "UPDATE_ITEM"; payload: TMDBItem }
  | { type: "DELETE_ITEM"; payload: string }
  | { type: "SET_PREFERENCES"; payload: Partial<AppState["preferences"]> }
  | { type: "SET_FILTERS"; payload: Partial<AppState["filters"]> }
  | { type: "SET_SELECTED_ITEMS"; payload: string[] }
  | { type: "SET_SELECTED_ITEM"; payload: TMDBItem | null }
  | { type: "TOGGLE_ITEM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "RESET_STATE" }

// 初始状态
const initialState: AppState = {
  items: [],
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
    // UI状态
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_INITIALIZED":
      return { ...state, initialized: action.payload }

    // 项目管理
    case "SET_ITEMS":
      return { ...state, items: action.payload }
    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.payload] }
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.payload.id ? action.payload : item)),
        selectedItem: state.selectedItem?.id === action.payload.id ? action.payload : state.selectedItem,
      }
    case "DELETE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        selectedItems: state.selectedItems.filter((id) => id !== action.payload),
        selectedItem: state.selectedItem?.id === action.payload ? null : state.selectedItem,
      }

    // 偏好和过滤
    case "SET_PREFERENCES":
      return { ...state, preferences: { ...state.preferences, ...action.payload } }
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } }

    // 选择状态
    case "SET_SELECTED_ITEMS":
      return { ...state, selectedItems: action.payload }
    case "SET_SELECTED_ITEM":
      return { ...state, selectedItem: action.payload }
    case "TOGGLE_ITEM_SELECTION": {
      const isSelected = state.selectedItems.includes(action.payload)
      return {
        ...state,
        selectedItems: isSelected
          ? state.selectedItems.filter((id) => id !== action.payload)
          : [...state.selectedItems, action.payload],
      }
    }
    case "CLEAR_SELECTION":
      return { ...state, selectedItems: [], selectedItem: null }

    case "RESET_STATE":
      return { ...initialState }

    default:
      return state
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider组件
export function AppStateProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // 加载用户偏好
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem("app_preferences")
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences)
          if (preferences && typeof preferences === 'object') {
            dispatch({ type: "SET_PREFERENCES", payload: preferences })
            log.debug("StateManager", "用户偏好已加载", preferences)
          }
        } catch (parseError) {
          log.warn("StateManager", "解析用户偏好数据失败，清除无效数据", parseError)
          localStorage.removeItem("app_preferences")
        }
      }
    } catch (error) {
      log.warn("StateManager", "加载用户偏好失败", error)
    }
  }, [])

  // 保存用户偏好
  useEffect(() => {
    try {
      localStorage.setItem("app_preferences", JSON.stringify(state.preferences))
    } catch (error) {
      log.warn("StateManager", "保存用户偏好失败", error)
    }
  }, [state.preferences])

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  )
}

// Hook to use the state
export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context.state
}

// Hook to use dispatch
export function useAppDispatch(): React.Dispatch<AppAction> {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppDispatch must be used within AppStateProvider')
  }
  return context.dispatch
}

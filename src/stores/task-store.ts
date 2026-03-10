/**
 * Task Store - 任务状态管理
 * 管理定时任务、运行中的任务等
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ScheduledTask } from '@/lib/data/storage/types'

// 任务状态接口
interface TaskState {
  // 数据
  tasks: ScheduledTask[]
  runningTasks: ScheduledTask[]
  
  // 状态
  loading: boolean
  error: string | null
  
  // 操作
  setTasks: (tasks: ScheduledTask[]) => void
  setRunningTasks: (tasks: ScheduledTask[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // CRUD 操作
  addTask: (task: ScheduledTask) => void
  updateTask: (task: ScheduledTask) => void
  deleteTask: (id: string) => void
  getTaskById: (id: string) => ScheduledTask | undefined
  
  // 运行任务操作
  addRunningTask: (task: ScheduledTask) => void
  removeRunningTask: (id: string) => void
  isTaskRunning: (id: string) => boolean
  
  // 工具方法
  clearError: () => void
  reset: () => void
}

// 初始状态
const initialState = {
  tasks: [],
  runningTasks: [],
  loading: false,
  error: null,
}

// 创建 store
export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 设置方法
        setTasks: (tasks) => set({ tasks }, false, 'setTasks'),
        setRunningTasks: (runningTasks) => set({ runningTasks }, false, 'setRunningTasks'),
        setLoading: (loading) => set({ loading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
        
        // CRUD 操作
        addTask: (task) => set(
          (state) => ({ tasks: [...state.tasks, task] }),
          false,
          'addTask'
        ),
        
        updateTask: (task) => set(
          (state) => ({
            tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
          }),
          false,
          'updateTask'
        ),
        
        deleteTask: (id) => set(
          (state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }),
          false,
          'deleteTask'
        ),
        
        getTaskById: (id) => get().tasks.find((t) => t.id === id),
        
        // 运行任务操作
        addRunningTask: (task) => set(
          (state) => ({
            runningTasks: [...state.runningTasks, task],
          }),
          false,
          'addRunningTask'
        ),
        
        removeRunningTask: (id) => set(
          (state) => ({
            runningTasks: state.runningTasks.filter((t) => t.id !== id),
          }),
          false,
          'removeRunningTask'
        ),
        
        isTaskRunning: (id) => get().runningTasks.some((t) => t.id === id),
        
        // 工具方法
        clearError: () => set({ error: null }, false, 'clearError'),
        
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'task-store',
        // 只持久化任务列表，运行中的任务每次重新加载
        partialize: (state) => ({
          tasks: state.tasks,
        }),
      }
    ),
    { name: 'TaskStore' }
  )
)

// 选择器 hooks
export const useTasks = () => useTaskStore((state) => state.tasks)
export const useRunningTasks = () => useTaskStore((state) => state.runningTasks)
export const useTaskLoading = () => useTaskStore((state) => state.loading)
export const useTaskError = () => useTaskStore((state) => state.error)

// 统计信息 hook
export const useTaskStats = () => {
  const tasks = useTasks()
  const runningTasks = useRunningTasks()
  return {
    total: tasks.length,
    running: runningTasks.length,
    enabled: tasks.filter((t) => t.enabled).length,
    disabled: tasks.filter((t) => !t.enabled).length,
  }
}

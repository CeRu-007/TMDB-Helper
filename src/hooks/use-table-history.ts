"use client"

import { useState, useCallback, useRef } from "react"

/**
 * 表格历史记录管理钩子
 * 用于实现撤销/重做功能
 */
export function useTableHistory<T>(initialData: T) {
  // 历史记录堆栈
  const [history, setHistory] = useState<T[]>([initialData])
  // 当前历史记录索引
  const [currentIndex, setCurrentIndex] = useState(0)
  // 是否是撤销/重做操作
  const isUndoRedoActionRef = useRef(false)
  
  /**
   * 添加新的历史记录
   * @param newData 新数据
   */
  const addToHistory = useCallback((newData: T) => {
    // 如果是撤销/重做操作，不添加新的历史记录
    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false
      return
    }
    
    // 检查数据是否与当前历史记录相同
    if (JSON.stringify(history[currentIndex]) === JSON.stringify(newData)) {
      return
    }
    
    // 添加新的历史记录，并删除当前索引之后的所有记录
    const newHistory = history.slice(0, currentIndex + 1)
    newHistory.push(newData)
    
    // 限制历史记录数量，避免内存占用过大
    if (newHistory.length > 100) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setCurrentIndex(newHistory.length - 1)
  }, [history, currentIndex])
  
  /**
   * 撤销操作
   * @returns 撤销后的数据
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoActionRef.current = true
      setCurrentIndex(currentIndex - 1)
      return history[currentIndex - 1]
    }
    return history[currentIndex]
  }, [history, currentIndex])
  
  /**
   * 重做操作
   * @returns 重做后的数据
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoActionRef.current = true
      setCurrentIndex(currentIndex + 1)
      return history[currentIndex + 1]
    }
    return history[currentIndex]
  }, [history, currentIndex])
  
  /**
   * 清空历史记录
   * @param newInitialData 新的初始数据
   */
  const clearHistory = useCallback((newInitialData: T) => {
    setHistory([newInitialData])
    setCurrentIndex(0)
  }, [])
  
  // 是否可以撤销
  const canUndo = currentIndex > 0
  
  // 是否可以重做
  const canRedo = currentIndex < history.length - 1
  
  return {
    addToHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    currentData: history[currentIndex],
    historyLength: history.length,
  }
} 
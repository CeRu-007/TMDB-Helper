import { useState, useCallback, useRef } from "react"
import type {
  CellPosition,
  UseTMDBTableMouseOptions,
  UseTMDBTableMouseReturn,
} from "../types"

const LONG_PRESS_DELAY = 200

export function useTMDBTableMouse({
  onCellClick,
  onCellDoubleClick,
  onSelectionStart,
  onSelectionChange,
  onSelectionEnd,
}: UseTMDBTableMouseOptions): UseTMDBTableMouseReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [isShiftSelecting, setIsShiftSelecting] = useState(false)
  const [dragStart, setDragStart] = useState<CellPosition | null>(null)
  const [canStartDragging, setCanStartDragging] = useState(false)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (cell: CellPosition, event: React.MouseEvent) => {
      // 清除之前的长按定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      // 重置拖拽状态
      setCanStartDragging(false)
      setIsDragging(false)

      // 启动长按定时器
      longPressTimerRef.current = setTimeout(() => {
        setCanStartDragging(true)
        setDragStart(cell)
        onSelectionStart?.(cell)
      }, LONG_PRESS_DELAY)

      // 处理单击
      if (!event.shiftKey) {
        onCellClick?.(cell, event)
      }
    },
    [onCellClick, onSelectionStart]
  )

  // 处理鼠标移动
  const handleMouseMove = useCallback(
    (cell: CellPosition, event: React.MouseEvent) => {
      if (!canStartDragging || !dragStart) return

      if (!isDragging) {
        setIsDragging(true)
      }

      // 计算选择区域
      const startRow = Math.min(dragStart.row, cell.row)
      const endRow = Math.max(dragStart.row, cell.row)
      const startCol = Math.min(dragStart.col, cell.col)
      const endCol = Math.max(dragStart.col, cell.col)

      const selectedCells: CellPosition[] = []
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          selectedCells.push({ row, col })
        }
      }

      onSelectionChange?.(selectedCells)
    },
    [canStartDragging, dragStart, isDragging, onSelectionChange]
  )

  // 处理鼠标抬起
  const handleMouseUp = useCallback(() => {
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // 结束拖拽
    if (isDragging) {
      setIsDragging(false)
      setCanStartDragging(false)
      onSelectionEnd?.()
    }
  }, [isDragging, onSelectionEnd])

  // 处理双击
  const handleDoubleClick = useCallback(
    (cell: CellPosition, event: React.MouseEvent) => {
      // 清除长按定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      onCellDoubleClick?.(cell, event)
    },
    [onCellDoubleClick]
  )

  return {
    // 状态
    isDragging,
    isShiftSelecting,
    dragStart,
    canStartDragging,

    // 事件处理
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    setIsShiftSelecting,
  }
}

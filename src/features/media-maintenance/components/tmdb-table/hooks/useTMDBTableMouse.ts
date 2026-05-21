import { useState, useCallback, useRef } from "react"
import type {
  CellPosition,
  UseTMDBTableMouseOptions,
  UseTMDBTableMouseReturn,
} from "../types"

const LONG_PRESS_DELAY = 200

export function useTMDBTableMouse({
  activeCell,
  onCellClick,
  onCellDoubleClick,
  onSelectionStart,
  onSelectionChange,
  onSelectionEnd,
  onShiftSelect,
}: UseTMDBTableMouseOptions): UseTMDBTableMouseReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [isShiftSelecting, setIsShiftSelecting] = useState(false)
  const [dragStart, setDragStart] = useState<CellPosition | null>(null)
  const [canStartDragging, setCanStartDragging] = useState(false)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const calculateSelectionArea = useCallback(
    (start: CellPosition, end: CellPosition): CellPosition[] => {
      const startRow = Math.min(start.row, end.row)
      const endRow = Math.max(start.row, end.row)
      const startCol = Math.min(start.col, end.col)
      const endCol = Math.max(start.col, end.col)

      const cells: CellPosition[] = []
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          cells.push({ row, col })
        }
      }
      return cells
    },
    []
  )

  const handleMouseDown = useCallback(
    (cell: CellPosition, event: React.MouseEvent) => {
      if (event.button !== 0) {
        return
      }

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      setCanStartDragging(false)
      setIsDragging(false)

      if (event.shiftKey && activeCell) {
        event.preventDefault()
        setIsShiftSelecting(true)
        const cells = calculateSelectionArea(activeCell, cell)
        onShiftSelect?.(cells)
        return
      }

      longPressTimerRef.current = setTimeout(() => {
        setCanStartDragging(true)
        setDragStart(cell)
        onSelectionStart?.(cell)
      }, LONG_PRESS_DELAY)

      onCellClick?.(cell, event)
    },
    [activeCell, calculateSelectionArea, onCellClick, onSelectionStart, onShiftSelect]
  )

  const handleMouseMove = useCallback(
    (cell: CellPosition, _event: React.MouseEvent) => {
      if (!canStartDragging || !dragStart) return

      if (!isDragging) {
        setIsDragging(true)
      }

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

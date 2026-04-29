import { useState, useCallback } from "react"
import type {
  CellPosition,
  UseTMDBTableSelectionReturn,
} from "../types"

export function useTMDBTableSelection(): UseTMDBTableSelectionReturn {
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([])
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isAllRowsSelected, setIsAllRowsSelected] = useState(false)

  // 选择单个单元格
  const selectCell = useCallback((cell: CellPosition) => {
    setActiveCell(cell)
    setSelectedCells([cell])
  }, [])

  // 选择多个单元格（框选）
  const selectCells = useCallback((cells: CellPosition[]) => {
    setSelectedCells(cells)
    if (cells.length > 0) {
      setActiveCell(cells[0])
    }
  }, [])

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedCells([])
    setActiveCell(null)
    setSelectedRows(new Set())
    setIsAllRowsSelected(false)
  }, [])

  // 选择行
  const selectRow = useCallback((rowIndex: number, selected: boolean) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev)
      if (selected) {
        newSelected.add(rowIndex)
      } else {
        newSelected.delete(rowIndex)
      }
      return newSelected
    })
  }, [])

  // 全选
  const selectAll = useCallback((totalRows: number) => {
    const allRows = new Set(Array.from({ length: totalRows }, (_, i) => i))
    setSelectedRows(allRows)
    setIsAllRowsSelected(true)
  }, [])

  return {
    // 状态
    selectedCells,
    activeCell,
    selectedRows,
    isAllRowsSelected,

    // 操作方法
    selectCell,
    selectCells,
    clearSelection,
    selectRow,
    selectAll,
    setSelectedRows,
    setIsAllRowsSelected,
  }
}

import { useCallback } from "react"
import type {
  UseTMDBTableClipboardOptions,
  UseTMDBTableClipboardReturn,
} from "../types"
import {
  copyToClipboard,
  pasteFromClipboard,
  selectionToClipboardData,
  applyClipboardData,
} from "../lib"

export function useTMDBTableClipboard({
  selectedCells,
  localData,
  updateCellData,
}: UseTMDBTableClipboardOptions): UseTMDBTableClipboardReturn {
  // 复制
  const copy = useCallback(async (): Promise<boolean> => {
    if (selectedCells.length === 0) return false

    const data = selectionToClipboardData(localData.rows, selectedCells)
    return await copyToClipboard(data)
  }, [selectedCells, localData.rows])

  // 粘贴
  const paste = useCallback(async (): Promise<boolean> => {
    const clipboardData = await pasteFromClipboard()
    if (!clipboardData || clipboardData.length === 0) return false

    // 找到选择区域的左上角
    let minRow = Infinity
    let minCol = Infinity

    selectedCells.forEach(({ row, col }) => {
      minRow = Math.min(minRow, row)
      minCol = Math.min(minCol, col)
    })

    if (minRow === Infinity || minCol === Infinity) {
      // 如果没有选中单元格，从 (0, 0) 开始
      minRow = 0
      minCol = 0
    }

    // 应用粘贴数据
    const newRows = applyClipboardData(
      localData.rows,
      clipboardData,
      minRow,
      minCol
    )

    // 更新数据
    const updates: Array<{ row: number; col: number; value: string }> = []
    clipboardData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const targetRow = minRow + rowIndex
        const targetCol = minCol + colIndex
        if (
          targetRow < localData.rows.length &&
          targetCol < localData.headers.length
        ) {
          updates.push({
            row: targetRow,
            col: targetCol,
            value: cell,
          })
        }
      })
    })

    updateCellData(updates)
    return true
  }, [selectedCells, localData, updateCellData])

  // 剪切
  const cut = useCallback(async (): Promise<boolean> => {
    if (selectedCells.length === 0) return false

    // 先复制
    const data = selectionToClipboardData(localData.rows, selectedCells)
    const success = await copyToClipboard(data)

    if (!success) return false

    // 清空选中的单元格
    const updates = selectedCells.map(({ row, col }) => ({
      row,
      col,
      value: "",
    }))

    updateCellData(updates)
    return true
  }, [selectedCells, localData.rows, updateCellData])

  return {
    copy,
    paste,
    cut,
  }
}

import type { CellPosition } from "../types"

/**
 * 将数据复制到剪贴板
 */
export async function copyToClipboard(data: string[][]): Promise<boolean> {
  try {
    const text = data.map((row) => row.join("\t")).join("\n")
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error("复制到剪贴板失败:", error)
    return false
  }
}

/**
 * 从剪贴板粘贴数据
 */
export async function pasteFromClipboard(): Promise<string[][] | null> {
  try {
    const text = await navigator.clipboard.readText()
    return text.split("\n").map((line) => line.split("\t"))
  } catch (error) {
    console.error("从剪贴板粘贴失败:", error)
    return null
  }
}

/**
 * 将选择区域的数据转换为剪贴板格式
 */
export function selectionToClipboardData(
  rows: string[][],
  selectedCells: CellPosition[]
): string[][] {
  if (selectedCells.length === 0) return []

  // 按行列分组
  const cellMap = new Map<number, Map<number, string>>()

  selectedCells.forEach(({ row, col }) => {
    if (!cellMap.has(row)) {
      cellMap.set(row, new Map())
    }
    const rowMap = cellMap.get(row)!
    rowMap.set(col, rows[row]?.[col] || "")
  })

  // 转换为二维数组
  const result: string[][] = []
  const sortedRows = Array.from(cellMap.keys()).sort((a, b) => a - b)

  sortedRows.forEach((row) => {
    const rowMap = cellMap.get(row)!
    const sortedCols = Array.from(rowMap.keys()).sort((a, b) => a - b)
    const rowData = sortedCols.map((col) => rowMap.get(col) || "")
    result.push(rowData)
  })

  return result
}

/**
 * 将剪贴板数据应用到选择区域
 */
export function applyClipboardData(
  targetRows: string[][],
  sourceData: string[][],
  startRow: number,
  startCol: number
): string[][] {
  const result = targetRows.map((row) => [...row])

  sourceData.forEach((sourceRow, rowIndex) => {
    const targetRow = startRow + rowIndex
    if (targetRow >= result.length) {
      // 如果目标行不存在，创建新行
      result[targetRow] = new Array(result[0]?.length || sourceRow.length).fill("")
    }

    sourceRow.forEach((cell, colIndex) => {
      const targetCol = startCol + colIndex
      if (!result[targetRow]) {
        result[targetRow] = []
      }
      result[targetRow][targetCol] = cell
    })
  })

  return result
}

/**
 * 获取选择区域的边界
 */
export function getSelectionBounds(
  selectedCells: CellPosition[]
): {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
} | null {
  if (selectedCells.length === 0) return null

  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity

  selectedCells.forEach(({ row, col }) => {
    minRow = Math.min(minRow, row)
    maxRow = Math.max(maxRow, row)
    minCol = Math.min(minCol, col)
    maxCol = Math.max(maxCol, col)
  })

  return { minRow, maxRow, minCol, maxCol }
}

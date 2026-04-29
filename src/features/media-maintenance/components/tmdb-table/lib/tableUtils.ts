import type { CSVData, CellPosition, BatchInsertOptions } from "../types"

/**
 * 深拷贝 CSV 数据
 */
export function cloneCSVData(data: CSVData): CSVData {
  return {
    headers: [...data.headers],
    rows: data.rows.map((row) => [...row]),
  }
}

/**
 * 获取选择区域的数据
 */
export function getSelectedCellsData(
  data: CSVData,
  selectedCells: CellPosition[]
): string[][] {
  return selectedCells.map(({ row, col }) => {
    if (
      row >= 0 &&
      row < data.rows.length &&
      col >= 0 &&
      col < data.headers.length
    ) {
      return [data.rows[row]![col]!]
    }
    return [""]
  })
}

/**
 * 更新选择区域的数据
 */
export function updateSelectedCellsData(
  data: CSVData,
  selectedCells: CellPosition[],
  newData: string[][]
): CSVData {
  const result = cloneCSVData(data)

  selectedCells.forEach(({ row, col }, index) => {
    if (
      row >= 0 &&
      row < result.rows.length &&
      col >= 0 &&
      col < result.headers.length
    ) {
      const value = newData[index]?.[0] || ""
      result.rows[row]![col] = value
    }
  })

  return result
}

/**
 * 插入行
 */
export function insertRow(
  data: CSVData,
  index: number,
  position: "before" | "after" = "after"
): CSVData {
  const result = cloneCSVData(data)
  const insertIndex = position === "before" ? index : index + 1
  const newRow = new Array(result.headers.length).fill("")

  result.rows = [
    ...result.rows.slice(0, insertIndex),
    newRow,
    ...result.rows.slice(insertIndex),
  ]

  return result
}

/**
 * 删除行
 */
export function deleteRow(data: CSVData, index: number): CSVData {
  const result = cloneCSVData(data)
  result.rows = result.rows.filter((_, i) => i !== index)
  return result
}

/**
 * 插入列
 */
export function insertColumn(
  data: CSVData,
  index: number,
  position: "before" | "after" = "after",
  columnName: string = "新列"
): CSVData {
  const result = cloneCSVData(data)
  const insertIndex = position === "before" ? index : index + 1

  // 插入列头
  result.headers = [
    ...result.headers.slice(0, insertIndex),
    columnName,
    ...result.headers.slice(insertIndex),
  ]

  // 在每行中插入空单元格
  result.rows = result.rows.map((row) => [
    ...row.slice(0, insertIndex),
    "",
    ...row.slice(insertIndex),
  ])

  return result
}

/**
 * 删除列
 */
export function deleteColumn(data: CSVData, index: number): CSVData {
  const result = cloneCSVData(data)

  // 删除列头
  result.headers = result.headers.filter((_, i) => i !== index)

  // 删除每行对应的单元格
  result.rows = result.rows.map((row) => row.filter((_, i) => i !== index))

  return result
}

/**
 * 移动行
 */
export function moveRow(
  data: CSVData,
  fromIndex: number,
  direction: "up" | "down"
): CSVData {
  const result = cloneCSVData(data)
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1

  if (toIndex < 0 || toIndex >= result.rows.length) {
    return result
  }

  const tempRow = result.rows[fromIndex]!
  result.rows[fromIndex] = result.rows[toIndex]!
  result.rows[toIndex] = tempRow

  return result
}

/**
 * 移动列
 */
export function moveColumn(
  data: CSVData,
  fromIndex: number,
  direction: "left" | "right"
): CSVData {
  const result = cloneCSVData(data)
  const toIndex = direction === "left" ? fromIndex - 1 : fromIndex + 1

  if (toIndex < 0 || toIndex >= result.headers.length) {
    return result
  }

  // 交换列头
  const tempHeader = result.headers[fromIndex]!
  result.headers[fromIndex] = result.headers[toIndex]!
  result.headers[toIndex] = tempHeader

  // 交换每行对应的单元格
  result.rows = result.rows.map((row) => {
    const newRow = [...row]
    const tempCell = newRow[fromIndex]!
    newRow[fromIndex] = newRow[toIndex]!
    newRow[toIndex] = tempCell
    return newRow
  })

  return result
}

/**
 * 批量插入行
 */
export function batchInsertRows(
  data: CSVData,
  index: number,
  count: number,
  position: "before" | "after" = "after",
  options: BatchInsertOptions = {}
): CSVData {
  if (count <= 0) return data

  const result = cloneCSVData(data)
  const insertIndex = position === "before" ? index : index + 1

  const {
    episodeColumnIndex = -1,
    runtimeColumnIndex = -1,
    startEpisodeNumber = 1,
    prevRuntimeValue = "",
  } = options

  const newRows: string[][] = []

  for (let i = 0; i < count; i++) {
    const newRow = new Array(result.headers.length).fill("")

    // 填充 episode_number 列
    if (episodeColumnIndex !== -1) {
      newRow[episodeColumnIndex] = (startEpisodeNumber + i).toString()
    }

    // 填充 runtime 列
    if (runtimeColumnIndex !== -1) {
      newRow[runtimeColumnIndex] = prevRuntimeValue
    }

    newRows.push(newRow)
  }

  result.rows = [
    ...result.rows.slice(0, insertIndex),
    ...newRows,
    ...result.rows.slice(insertIndex),
  ]

  return result
}

/**
 * 复制行
 */
export function duplicateRow(data: CSVData, index: number): CSVData {
  const result = cloneCSVData(data)
  const rowToDuplicate = [...result.rows[index]!]

  result.rows = [
    ...result.rows.slice(0, index + 1),
    rowToDuplicate,
    ...result.rows.slice(index + 1),
  ]

  return result
}

/**
 * 复制列
 */
export function duplicateColumn(data: CSVData, index: number): CSVData {
  const result = cloneCSVData(data)
  const originalHeader = result.headers[index]!

  // 复制列头
  result.headers = [
    ...result.headers.slice(0, index + 1),
    `${originalHeader}_副本`,
    ...result.headers.slice(index + 1),
  ]

  // 复制每行对应的单元格
  result.rows = result.rows.map((row) => [
    ...row.slice(0, index + 1),
    row[index] || "",
    ...row.slice(index + 1),
  ])

  return result
}

/**
 * 获取指定列的所有数据用于重复检测
 */
export function getAllColumnData(
  data: CSVData,
  columnName: string
): Array<{ rowIndex: number; value: string }> {
  const colIndex = data.headers.findIndex(
    (h) => h.toLowerCase() === columnName.toLowerCase()
  )
  if (colIndex === -1) return []

  return data.rows.map((row, rowIndex) => ({
    rowIndex,
    value: row[colIndex] || "",
  }))
}

/**
 * 计算最大 episode_number
 */
export function getMaxEpisodeNumber(
  data: CSVData,
  episodeColumnIndex: number
): number {
  let maxEpisodeNumber = 0
  if (episodeColumnIndex !== -1) {
    for (const row of data.rows) {
      const episodeValue = row[episodeColumnIndex]?.trim()
      const episodeNum = parseInt(episodeValue || "0", 10)
      if (!isNaN(episodeNum) && episodeNum > maxEpisodeNumber) {
        maxEpisodeNumber = episodeNum
      }
    }
  }
  return maxEpisodeNumber
}

/**
 * 查找列索引
 */
export function findColumnIndex(
  data: CSVData,
  columnName: string
): number {
  return data.headers.findIndex(
    (header) => header.toLowerCase() === columnName.toLowerCase()
  )
}

/**
 * 计算选择区域
 */
export function calculateSelectionArea(
  start: CellPosition,
  end: CellPosition
): CellPosition[] {
  const startRow = Math.min(start.row, end.row)
  const endRow = Math.max(start.row, end.row)
  const startCol = Math.min(start.col, end.col)
  const endCol = Math.max(start.col, end.col)

  const selectedCells: CellPosition[] = []
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      selectedCells.push({ row, col })
    }
  }
  return selectedCells
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, delay)
  }
}

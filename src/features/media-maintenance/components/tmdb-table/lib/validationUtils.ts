/**
 * 验证字符串是否为有效URL
 */
export function isValidUrl(str: string): boolean {
  if (!str || typeof str !== "string") return false
  try {
    const url = new URL(str)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * 判断是否为backdrop列
 */
export function isBackdropColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "backdrop"
}

/**
 * 判断是否为overview列
 */
export function isOverviewColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "overview"
}

/**
 * 判断是否为name列
 */
export function isNameColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "name"
}

/**
 * 判断是否为air_date列
 */
export function isAirDateColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "air_date"
}

/**
 * 判断是否为episode_number列
 */
export function isEpisodeNumberColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "episode_number"
}

/**
 * 判断是否为runtime列
 */
export function isRuntimeColumn(columnName: string): boolean {
  return columnName.toLowerCase() === "runtime"
}

/**
 * 验证单元格位置是否有效
 */
export function isValidCellPosition(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number
): boolean {
  return row >= 0 && row < totalRows && col >= 0 && col < totalCols
}

/**
 * 验证数据是否为有效的CSV数据
 */
export function isValidCSVData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false

  const csvData = data as { headers?: unknown; rows?: unknown }

  // 验证headers
  if (!Array.isArray(csvData.headers)) return false
  if (!csvData.headers.every((h) => typeof h === "string")) return false

  // 验证rows
  if (!Array.isArray(csvData.rows)) return false
  if (
    !csvData.rows.every(
      (row) =>
        Array.isArray(row) && row.every((cell) => typeof cell === "string")
    )
  ) {
    return false
  }

  // 验证每行的列数是否与headers一致
  if (
    !csvData.rows.every((row) => row.length === csvData.headers!.length)
  ) {
    return false
  }

  return true
}

/**
 * 验证批量修改模式
 */
export function validateBatchPattern(pattern: string): boolean {
  return pattern.length > 0
}

/**
 * 验证替换文本
 */
export function validateReplaceText(text: string): boolean {
  // 替换文本可以为空，表示删除匹配的内容
  return true
}

import type { BatchModificationInfo } from "../types"

/**
 * 应用批量修改规则
 */
export function applyBatchModification(
  text: string,
  matchInfo: { pattern: string; replaceWith: string },
  isOverview: boolean
): string {
  if (isOverview) {
    // overview列：处理前缀和后缀
    if (text.endsWith(matchInfo.pattern)) {
      return (
        text.slice(0, -matchInfo.pattern.length) + matchInfo.replaceWith
      )
    }
    if (text.startsWith(matchInfo.pattern)) {
      return matchInfo.replaceWith + text.slice(matchInfo.pattern.length)
    }
  } else {
    // 其他列：文本替换
    const index = text.indexOf(matchInfo.pattern)
    if (index !== -1) {
      return (
        text.slice(0, index) +
        matchInfo.replaceWith +
        text.slice(index + matchInfo.pattern.length)
      )
    }
  }
  return text
}

/**
 * 查找匹配的行
 */
export function findMatchingRows(
  columnData: Array<{ rowIndex: number; value: string }>,
  pattern: string,
  isOverview: boolean
): number[] {
  return columnData
    .filter(({ value }) => {
      if (isOverview) {
        return value.startsWith(pattern) || value.endsWith(pattern)
      } else {
        return value.includes(pattern)
      }
    })
    .map(({ rowIndex }) => rowIndex)
}

/**
 * 计算批量修改的影响
 */
export function calculateBatchModification(
  columnData: Array<{ rowIndex: number; value: string }>,
  pattern: string,
  replaceWith: string,
  isOverview: boolean
): BatchModificationInfo {
  const affectedRows = findMatchingRows(columnData, pattern, isOverview)

  return {
    pattern,
    replaceWith,
    affectedRows,
  }
}

/**
 * 预览批量修改结果
 */
export function previewBatchModification(
  originalText: string,
  pattern: string,
  replaceWith: string,
  isOverview: boolean
): { original: string; modified: string; willChange: boolean } {
  const modified = applyBatchModification(
    originalText,
    { pattern, replaceWith },
    isOverview
  )

  return {
    original: originalText,
    modified,
    willChange: originalText !== modified,
  }
}

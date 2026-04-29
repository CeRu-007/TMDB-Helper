import { useState, useCallback, useRef } from "react"
import type {
  CSVData,
  UseTMDBTableStateOptions,
  UseTMDBTableStateReturn,
} from "../types"

export function useTMDBTableState({
  initialData,
  onDataChange,
  onCellChange,
}: UseTMDBTableStateOptions): UseTMDBTableStateReturn {
  const [localData, setLocalData] = useState<CSVData>(initialData)
  const [isEditing, setIsEditing] = useState(false)
  const [editCell, setEditCell] = useState<{
    row: number
    col: number
    value: string
  } | null>(null)

  // 使用 useRef 存储最新状态，避免闭包问题
  const stateRef = useRef({
    localData,
    isEditing,
    editCell,
  })

  // 更新状态引用
  const updateStateRef = useCallback(() => {
    stateRef.current = {
      localData,
      isEditing,
      editCell,
    }
  }, [localData, isEditing, editCell])

  // 更新单元格数据
  const updateCellData = useCallback(
    (row: number, col: number, value: string) => {
      setLocalData((prevData) => {
        const newData = { ...prevData }
        newData.rows = [...newData.rows]

        if (newData.rows[row]) {
          newData.rows[row] = [...newData.rows[row]!]
          newData.rows[row]![col] = value
        }

        onCellChange?.(row, col, value)
        onDataChange?.(newData)

        return newData
      })
    },
    [onDataChange, onCellChange]
  )

  // 开始编辑
  const startEditing = useCallback(
    (row: number, col: number) => {
      if (
        row < 0 ||
        row >= localData.rows.length ||
        col < 0 ||
        col >= localData.headers.length
      ) {
        return
      }

      setEditCell({
        row,
        col,
        value: localData.rows[row]![col]!,
      })
      setIsEditing(true)
    },
    [localData]
  )

  // 完成编辑
  const finishEditing = useCallback(() => {
    if (
      editCell &&
      editCell.row < localData.rows.length &&
      editCell.col < localData.headers.length
    ) {
      updateCellData(editCell.row, editCell.col, editCell.value)
    }

    setIsEditing(false)
    setEditCell(null)
  }, [editCell, localData, updateCellData])

  // 取消编辑
  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditCell(null)
  }, [])

  // 更新编辑值
  const updateEditValue = useCallback((value: string) => {
    setEditCell((prev) => (prev ? { ...prev, value } : null))
  }, [])

  // 同步外部数据
  const syncExternalData = useCallback((data: CSVData) => {
    setLocalData(data)
  }, [])

  return {
    // 状态
    localData,
    isEditing,
    editCell,
    stateRef,

    // 操作方法
    updateCellData,
    startEditing,
    finishEditing,
    cancelEditing,
    updateEditValue,
    syncExternalData,
    updateStateRef,
  }
}

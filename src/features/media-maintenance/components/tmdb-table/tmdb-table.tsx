"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { useTranslation } from "react-i18next"
import { useTMDBTableState } from "./hooks/useTMDBTableState"
import { useTMDBTableSelection } from "./hooks/useTMDBTableSelection"
import { useTMDBTableHistory } from "./hooks/useTMDBTableHistory"
import { useTMDBTableKeyboard } from "./hooks/useTMDBTableKeyboard"
import { useTMDBTableMouse } from "./hooks/useTMDBTableMouse"
import { useTMDBTableClipboard } from "./hooks/useTMDBTableClipboard"
import HeaderRenderer from "./components/HeaderRenderer"
import RowRenderer from "./components/RowRenderer"
import TableContextMenu from "../../../../shared/components/ui/table-context-menu"
import BatchEditDialog from "../batch-edit-dialog"
import type { TMDBTableProps, CellPosition, BatchEditData } from "./types"
import {
  insertRow,
  deleteRow,
  insertColumn,
  deleteColumn,
  moveRow,
  moveColumn,
  duplicateRow,
  duplicateColumn,
  batchInsertRows,
  getMaxEpisodeNumber,
  findColumnIndex,
  calculateSelectionArea,
} from "./lib"
import { isOverviewColumn } from "./lib"

const TMDBTableComponent: React.FC<TMDBTableProps> = ({
  data,
  className,
  enableColumnResizing,
  enableColumnReordering,
  rowHeight,
  onCellChange,
  onSelectionChange,
  onDataChange,
  showRowNumbers = true,
  showColumnOperations = true,
  showRowOperations = true,
}) => {
  const { t } = useTranslation("ui")
  const editInputRef = useRef<HTMLInputElement>(null)
  const [batchEditData, setBatchEditData] = useState<BatchEditData | null>(null)
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false)

  void enableColumnResizing
  void enableColumnReordering

  // 核心状态管理
  const {
    localData,
    isEditing,
    editCell,
    stateRef,
    updateCellData,
    startEditing,
    finishEditing,
    cancelEditing,
    updateEditValue,
    syncExternalData,
    updateStateRef,
  } = useTMDBTableState({
    initialData: data,
    onDataChange,
    onCellChange,
  })

  // 选择逻辑
  const {
    selectedCells,
    activeCell,
    selectedRows,
    isAllRowsSelected,
    selectCell,
    selectCells,
    clearSelection,
    selectRow,
    selectAll,
    setSelectedRows,
    setIsAllRowsSelected,
  } = useTMDBTableSelection()

  // 历史记录
  const { saveToHistory, undo, redo } = useTMDBTableHistory(data)

  // 剪贴板操作
  const { copy, paste, cut } = useTMDBTableClipboard({
    selectedCells,
    localData,
    updateCellData: (updates) => {
      saveToHistory(localData)
      updates.forEach(({ row, col, value }) => {
        updateCellData(row, col, value)
      })
    },
  })

  // 键盘导航处理
  const handleKeyboardNavigation = useCallback(
    (direction: string, shiftKey: boolean) => {
      if (!activeCell) return

      let newRow = activeCell.row
      let newCol = activeCell.col

      switch (direction) {
        case "ArrowUp":
          newRow = Math.max(0, activeCell.row - 1)
          break
        case "ArrowDown":
          newRow = Math.min(localData.rows.length - 1, activeCell.row + 1)
          break
        case "ArrowLeft":
          newCol = Math.max(0, activeCell.col - 1)
          break
        case "ArrowRight":
          newCol = Math.min(localData.headers.length - 1, activeCell.col + 1)
          break
      }

      const newCell = { row: newRow, col: newCol }

      if (shiftKey && activeCell) {
        const cells = calculateSelectionArea(activeCell, newCell)
        selectCells(cells)
        onSelectionChange?.(cells)
      } else {
        selectCell(newCell)
        onSelectionChange?.([newCell])
      }
    },
    [activeCell, localData, selectCell, selectCells, onSelectionChange]
  )

  // 键盘事件处理
  useTMDBTableKeyboard({
    isActive: true,
    selectedCells,
    activeCell,
    isEditing,
    onDelete: () => {
      saveToHistory(localData)
      selectedCells.forEach(({ row, col }) => {
        updateCellData(row, col, "")
      })
    },
    onCopy: copy,
    onPaste: paste,
    onUndo: () => {
      const previousData = undo()
      if (previousData) {
        syncExternalData(previousData)
      }
    },
    onRedo: () => {
      const nextData = redo()
      if (nextData) {
        syncExternalData(nextData)
      }
    },
    onSelectAll: () => selectAll(localData.rows.length),
    onNavigate: handleKeyboardNavigation,
    onEdit: () => {
      if (activeCell) {
        startEditing(activeCell.row, activeCell.col)
      }
    },
    onEscape: clearSelection,
  })

  // 鼠标事件处理
  const {
    isDragging,
    handleMouseDown: handleCellMouseDown,
    handleMouseMove: handleCellMouseMove,
    handleMouseUp: handleCellMouseUp,
    handleDoubleClick: handleCellDoubleClick,
  } = useTMDBTableMouse({
    onCellClick: (cell, event) => {
      selectCell(cell)
      onSelectionChange?.([cell])
    },
    onCellDoubleClick: (cell, event) => {
      const columnName = localData.headers[cell.col]
      if (isOverviewColumn(columnName || "")) {
        setBatchEditData({
          row: cell.row,
          col: cell.col,
          value: localData.rows[cell.row]![cell.col]!,
          columnName: columnName || "",
        })
        setShowBatchEditDialog(true)
      } else {
        startEditing(cell.row, cell.col)
      }
    },
    onSelectionStart: (cell) => {
      // 开始框选
    },
    onSelectionChange: (cells) => {
      selectCells(cells)
      onSelectionChange?.(cells)
    },
    onSelectionEnd: () => {
      // 结束框选
    },
  })

  // 同步外部数据
  useEffect(() => {
    syncExternalData(data)
  }, [data, syncExternalData])

  // 更新状态引用
  useEffect(() => {
    updateStateRef()
  }, [updateStateRef])

  // 聚焦到编辑输入框
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [isEditing])

  // 行操作函数
  const handleInsertRow = useCallback(
    (index: number, position: "before" | "after") => {
      saveToHistory(localData)
      const newData = insertRow(localData, index, position)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleDeleteRow = useCallback(
    (index: number) => {
      if (localData.rows.length <= 1) return
      saveToHistory(localData)
      const newData = deleteRow(localData, index)
      syncExternalData(newData)
      onDataChange?.(newData)
      clearSelection()
    },
    [localData, saveToHistory, syncExternalData, onDataChange, clearSelection]
  )

  const handleDuplicateRow = useCallback(
    (index: number) => {
      saveToHistory(localData)
      const newData = duplicateRow(localData, index)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleMoveRow = useCallback(
    (index: number, direction: "up" | "down") => {
      saveToHistory(localData)
      const newData = moveRow(localData, index, direction)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  // 列操作函数
  const handleInsertColumn = useCallback(
    (index: number, position: "before" | "after") => {
      saveToHistory(localData)
      const newData = insertColumn(localData, index, position)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleDeleteColumn = useCallback(
    (index: number) => {
      if (localData.headers.length <= 1) return
      saveToHistory(localData)
      const newData = deleteColumn(localData, index)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleDuplicateColumn = useCallback(
    (index: number) => {
      saveToHistory(localData)
      const newData = duplicateColumn(localData, index)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleMoveColumn = useCallback(
    (index: number, direction: "left" | "right") => {
      saveToHistory(localData)
      const newData = moveColumn(localData, index, direction)
      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  // 批量插入行
  const handleBatchInsertRows = useCallback(
    (index: number, count: number, position: "before" | "after") => {
      if (count <= 0) return

      saveToHistory(localData)

      const episodeColumnIndex = findColumnIndex(localData, "episode_number")
      const runtimeColumnIndex = findColumnIndex(localData, "runtime")
      const maxEpisodeNumber = getMaxEpisodeNumber(localData, episodeColumnIndex)

      const prevRowIndex = position === "before" ? index - 1 : index
      const prevRow =
        prevRowIndex >= 0 && prevRowIndex < localData.rows.length
          ? localData.rows[prevRowIndex]
          : null
      const prevRuntimeValue =
        runtimeColumnIndex !== -1 && prevRow
          ? prevRow[runtimeColumnIndex] || ""
          : ""

      const newData = batchInsertRows(localData, index, count, position, {
        episodeColumnIndex,
        runtimeColumnIndex,
        startEpisodeNumber: maxEpisodeNumber + 1,
        prevRuntimeValue,
      })

      syncExternalData(newData)
      onDataChange?.(newData)
    },
    [localData, saveToHistory, syncExternalData, onDataChange]
  )

  const handleContextMenu = useCallback(
    (row: number, col: number) => {
      const newSelection: CellPosition[] = [{ row, col }]
      selectCell({ row, col })
      onSelectionChange?.(newSelection)
    },
    [selectCell, onSelectionChange]
  )

  const handleCellsUpdate = useCallback(
    (cells: { row: number; col: number; value: string }[]) => {
      if (cells.length === 0) return
      saveToHistory(localData)
      cells.forEach(({ row, col, value }) => {
        updateCellData(row, col, value)
      })
    },
    [saveToHistory, localData, updateCellData]
  )

  const handleBatchEditSave = useCallback(
    (value: string) => {
      if (!batchEditData) return
      saveToHistory(localData)
      updateCellData(batchEditData.row, batchEditData.col, value)
      setShowBatchEditDialog(false)
      setBatchEditData(null)
    },
    [batchEditData, saveToHistory, localData, updateCellData]
  )

  const adaptMouseHandler = useCallback(
    (handler: (cell: CellPosition, event: React.MouseEvent) => void) =>
      (row: number, col: number, event: React.MouseEvent) =>
        handler({ row, col }, event),
    []
  )

  return (
    <TableContextMenu
      selectedCells={selectedCells}
      data={localData}
      onCellsUpdate={handleCellsUpdate}
      onCopy={copy}
      onCut={cut}
      onPaste={paste}
      onDelete={() => {
        saveToHistory(localData)
        selectedCells.forEach(({ row, col }) => {
          updateCellData(row, col, "")
        })
      }}
      onInsertRow={handleInsertRow}
      onDeleteRow={handleDeleteRow}
      onInsertColumn={handleInsertColumn}
      onDeleteColumn={handleDeleteColumn}
      onDuplicateRow={handleDuplicateRow}
      onDuplicateColumn={handleDuplicateColumn}
      onBatchInsertRow={(index, position, count) => handleBatchInsertRows(index, count, position)}
      onOpenOverviewEdit={(row, col) => {
        const columnName = localData.headers[col]!
        setBatchEditData({
          row,
          col,
          value: localData.rows[row]![col]!,
          columnName,
        })
        setShowBatchEditDialog(true)
      }}
    >
      <div className={className}>
        <ScrollArea className="h-full">
          <div className="tmdb-table"
            onMouseUp={handleCellMouseUp}
            onMouseLeave={handleCellMouseUp}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {showRowNumbers && (
                    <TableHead className="w-16 text-center bg-muted/50 sticky left-0 z-10 border-r">
                      <div className="flex items-center justify-center space-x-1">
                        <input
                          type="checkbox"
                          checked={isAllRowsSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAll(localData.rows.length)
                            } else {
                              setSelectedRows(new Set())
                              setIsAllRowsSelected(false)
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-muted-foreground">#</span>
                      </div>
                    </TableHead>
                  )}
                  <HeaderRenderer
                    headers={localData.headers}
                    showColumnOperations={showColumnOperations}
                    onInsertColumn={handleInsertColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onDuplicateColumn={handleDuplicateColumn}
                    onMoveColumn={handleMoveColumn}
                    t={t}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {localData.rows.map((row, rowIndex) => (
                  <RowRenderer
                    key={rowIndex}
                    rowIndex={rowIndex}
                    rowData={row}
                    headers={localData.headers}
                    isSelected={selectedRows.has(rowIndex)}
                    selectedCells={selectedCells}
                    activeCell={activeCell}
                    editingCell={editCell}
                    isDragging={isDragging}
                    canStartDragging={false}
                    showRowNumbers={showRowNumbers}
                    showRowOperations={showRowOperations}
                    rowHeight={rowHeight}
                    onCellDoubleClick={adaptMouseHandler(handleCellDoubleClick)}
                    onCellContextMenu={handleContextMenu}
                    onCellMouseMove={adaptMouseHandler(handleCellMouseMove)}
                    onCellMouseDown={adaptMouseHandler(handleCellMouseDown)}
                    onEditInputChange={updateEditValue}
                    onEditFinish={finishEditing}
                    onEditCancel={cancelEditing}
                    onRowSelect={selectRow}
                    onInsertRow={handleInsertRow}
                    onDeleteRow={handleDeleteRow}
                    onDuplicateRow={handleDuplicateRow}
                    onMoveRow={handleMoveRow}
                    editInputRef={editInputRef}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <BatchEditDialog
        open={showBatchEditDialog}
        onOpenChange={setShowBatchEditDialog}
        value={batchEditData?.value || ""}
        onSave={handleBatchEditSave}
        allColumnData={
          batchEditData
            ? localData.rows.map((row, index) => ({
                rowIndex: index,
                value: row[batchEditData.col] || "",
              }))
            : []
        }
        {...(batchEditData ? { currentRowIndex: batchEditData.row } : {})}
        columnName={batchEditData?.columnName || ""}
      />
    </TableContextMenu>
  )
}

export default TMDBTableComponent
export { TMDBTableComponent as TMDBTable }

"use client"

import React, { useState } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/shared/components/ui/context-menu"
import { 
  Calendar, 
  Clock, 
  Copy, 
  Scissors, 
  Trash, 
  ClipboardPaste,
  ArrowDownUp,
  CalendarDays,
  Timer,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Columns,
  Rows,
  FileText
} from "lucide-react"
import DateIntervalDialog from "@/shared/components/ui/date-interval-dialog"
import MinutesDialog from "@/shared/components/ui/minutes-dialog"
import NumberRangeDialog from "@/shared/components/ui/number-range-dialog"
import { isDateColumn, isTimeColumn, isNumericColumn, isValidDateString, generateNumberSequence } from "@/shared/lib/utils/date-utils"
import type { CSVData } from "@/types/csv-editor"

export interface TableContextMenuProps {
  children: React.ReactNode
  selectedCells: { row: number, col: number }[]
  data: CSVData
  onCellsUpdate: (cells: { row: number, col: number, value: string }[]) => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onInsertRow?: (index: number, position: 'before' | 'after') => void
  onDeleteRow?: (index: number) => void
  onInsertColumn?: (index: number, position: 'before' | 'after') => void
  onDeleteColumn?: (index: number) => void
  onDuplicateRow?: (index: number) => void
  onDuplicateColumn?: (index: number) => void
  onBatchInsertRow?: (index: number, position: 'before' | 'after', count: number) => void
  onOpenOverviewEdit?: (row: number, col: number) => void
}

export default function TableContextMenu({
  children,
  selectedCells,
  data,
  onCellsUpdate,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onDuplicateRow,
  onDuplicateColumn,
  onBatchInsertRow,
  onOpenOverviewEdit
}: TableContextMenuProps) {
  // 日期间隔对话框状态
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  // 分钟设置对话框状态
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false)
  // 数字范围填充对话框状态
  const [numberDialogOpen, setNumberDialogOpen] = useState(false)
  
  // 检查选中的单元格是否在同一列
  const isSameColumn = () => {
    if (selectedCells.length <= 1) return true // 单个单元格或空视为在同一列
    
    const firstCol = selectedCells[0].col
    return selectedCells.every(cell => cell.col === firstCol)
  }
  
  // 检查选中的单元格是否在同一行
  const isSameRow = () => {
    if (selectedCells.length <= 1) return true // 单个单元格或空视为在同一行
    
    const firstRow = selectedCells[0].row
    return selectedCells.every(cell => cell.row === firstRow)
  }
  
  // 获取选中单元格的列索引
  const getSelectedColumn = () => {
    if (selectedCells.length === 0) return -1
    return selectedCells[0].col
  }
  
  // 获取选中单元格的行索引
  const getSelectedRow = () => {
    if (selectedCells.length === 0) return -1
    return selectedCells[0].row
  }
  
  // 获取选中单元格的值
  const getSelectedValues = () => {
    if (selectedCells.length === 0) return []
    
    const colIndex = selectedCells[0].col
    return selectedCells
      .map(cell => data.rows[cell.row][colIndex])
      .filter(value => value !== undefined)
  }
  
  // 检查选中的列是否是支持批量编辑的列（overview或name）
  const isSelectedBatchEditColumn = () => {
    if (selectedCells.length === 0) return false

    // 多个单元格时必须确保在同一列
    if (selectedCells.length > 1 && !isSameColumn()) return false

    const colIndex = selectedCells[0].col
    const columnName = data.headers[colIndex]?.toLowerCase()
    return columnName === 'overview' || columnName === 'name'
  }

  // 获取选中列的显示名称
  const getSelectedColumnName = () => {
    if (selectedCells.length === 0) return ''
    return data.headers[selectedCells[0].col] || ''
  }
  
  // 检查选中的列是否是日期列
  const isSelectedDateColumn = () => {
    if (!isSameColumn()) return false
    
    const values = getSelectedValues()
    return isDateColumn(values)
  }
  
  // 检查选中的列是否是时间列
  const isSelectedTimeColumn = () => {
    if (!isSameColumn()) return false
    
    const values = getSelectedValues()
    return isTimeColumn(values)
  }
  
  // 获取选中单元格中的第一个有效日期
  const getFirstValidDate = () => {
    if (!isSelectedDateColumn()) return ""
    
    const values = getSelectedValues()
    for (const value of values) {
      if (isValidDateString(value)) {
        return value
      }
    }
    return ""
  }
  
  // 处理日期递进
  const handleDateSequence = (dates: string[]) => {
    if (dates.length === 0 || !isSameColumn()) return
    
    const colIndex = selectedCells[0].col
    const updates: { row: number, col: number, value: string }[] = []
    
    // 为每个选中的单元格应用递进日期
    selectedCells.forEach((cell, index) => {
      if (index < dates.length) {
        updates.push({
          row: cell.row,
          col: colIndex,
          value: dates[index]
        })
      }
    })
    
    onCellsUpdate(updates)
  }
  
  // 处理分钟设置
  const handleMinutesUpdate = (updatedTimes: string[]) => {
    if (updatedTimes.length === 0 || !isSameColumn()) return
    
    const colIndex = selectedCells[0].col
    const updates: { row: number, col: number, value: string }[] = []
    
    // 为每个选中的单元格应用更新后的时间
    selectedCells.forEach((cell, index) => {
      if (index < updatedTimes.length) {
        updates.push({
          row: cell.row,
          col: colIndex,
          value: updatedTimes[index]
        })
      }
    })
    
    onCellsUpdate(updates)
  }
  
  // 检查选中的列是否是数字列
  const isSelectedNumericColumn = () => {
    if (!isSameColumn()) return false
    
    const values = getSelectedValues()
    return isNumericColumn(values)
  }
  
  // 处理数字范围填充
  const handleNumberSequence = (numbers: string[]) => {
    if (numbers.length === 0 || !isSameColumn()) return
    
    const colIndex = selectedCells[0].col
    const updates: { row: number, col: number, value: string }[] = []
    
    // 为每个选中的单元格应用递进数字
    selectedCells.forEach((cell, index) => {
      if (index < numbers.length) {
        updates.push({
          row: cell.row,
          col: colIndex,
          value: numbers[index]
        })
      }
    })
    
    onCellsUpdate(updates)
  }
  
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {/* 基本操作 */}
          <ContextMenuItem onClick={onCopy} disabled={selectedCells.length === 0}>
            <Copy className="mr-2 h-4 w-4" />
            <span>复制</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={onCut} disabled={selectedCells.length === 0}>
            <Scissors className="mr-2 h-4 w-4" />
            <span>剪切</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={onPaste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            <span>粘贴</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={onDelete} disabled={selectedCells.length === 0}>
            <Trash className="mr-2 h-4 w-4" />
            <span>删除</span>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {/* 行操作 */}
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={selectedCells.length === 0}>
              <Rows className="mr-2 h-4 w-4" />
              <span>行操作</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem
                onClick={() => onInsertRow?.(getSelectedRow(), 'before')}
                disabled={selectedCells.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                在上方插入行
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onInsertRow?.(getSelectedRow(), 'after')}
                disabled={selectedCells.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                在下方插入行
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  const rowIndex = getSelectedRow()
                  if (rowIndex >= 0 && onBatchInsertRow) {
                    onBatchInsertRow(rowIndex, 'after', 1)
                  }
                }}
                disabled={selectedCells.length === 0 || !onBatchInsertRow}
              >
                <Plus className="mr-2 h-4 w-4" />
                批量插入行...
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDuplicateRow?.(getSelectedRow())}
                disabled={!isSameRow()}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制行
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDeleteRow?.(getSelectedRow())}
                disabled={!isSameRow() || data.rows.length <= 1}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                删除行
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* 列操作 */}
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={selectedCells.length === 0}>
              <Columns className="mr-2 h-4 w-4" />
              <span>列操作</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem
                onClick={() => onInsertColumn?.(getSelectedColumn(), 'before')}
                disabled={selectedCells.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                在左侧插入列
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onInsertColumn?.(getSelectedColumn(), 'after')}
                disabled={selectedCells.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                在右侧插入列
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDuplicateColumn?.(getSelectedColumn())}
                disabled={!isSameColumn()}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制列
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDeleteColumn?.(getSelectedColumn())}
                disabled={!isSameColumn() || data.headers.length <= 1}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                删除列
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />
          
          {/* 特殊列操作 */}
          <ContextMenuItem
            onClick={() => {
              const rowIndex = getSelectedRow()
              const colIndex = getSelectedColumn()
              if (rowIndex >= 0 && colIndex >= 0 && onOpenOverviewEdit) {
                onOpenOverviewEdit(rowIndex, colIndex)
              }
            }}
            disabled={!isSelectedBatchEditColumn() || selectedCells.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>批量编辑...</span>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {/* 日期操作 */}
          <ContextMenuItem
            onClick={() => setDateDialogOpen(true)}
            disabled={!isSelectedDateColumn() || selectedCells.length <= 1}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>日期递进...</span>
          </ContextMenuItem>
          
          {/* 数字范围填充 */}
          <ContextMenuItem
            onClick={() => setNumberDialogOpen(true)}
            disabled={!isSelectedNumericColumn() || selectedCells.length <= 1}
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            <span>数字范围填充...</span>
          </ContextMenuItem>
          
          {/* 分钟操作 */}
          <ContextMenuItem
            onClick={() => setMinutesDialogOpen(true)}
            disabled={!isSelectedTimeColumn() || selectedCells.length === 0}
          >
            <Timer className="mr-2 h-4 w-4" />
            <span>统一设置分钟...</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* 日期间隔对话框 */}
      <DateIntervalDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        startDate={getFirstValidDate()}
        count={selectedCells.length}
        onApply={handleDateSequence}
      />
      
      {/* 数字范围填充对话框 */}
      <NumberRangeDialog
        open={numberDialogOpen}
        onOpenChange={setNumberDialogOpen}
        count={selectedCells.length}
        onApply={handleNumberSequence}
      />
      
      {/* 分钟设置对话框 */}
      <MinutesDialog
        open={minutesDialogOpen}
        onOpenChange={setMinutesDialogOpen}
        timeValues={getSelectedValues()}
        onApply={handleMinutesUpdate}
      />
    </>
  )
} 
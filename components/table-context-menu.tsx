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
} from "@/components/ui/context-menu"
import { 
  Calendar, 
  Clock, 
  Copy, 
  Scissors, 
  Trash, 
  ClipboardPaste,
  ArrowDownUp,
  CalendarDays,
  Timer
} from "lucide-react"
import DateIntervalDialog from "./date-interval-dialog"
import MinutesDialog from "./minutes-dialog"
import { isDateColumn, isTimeColumn, isValidDateString } from "@/lib/date-utils"
import { CSVData } from "@/lib/csv-processor"

export interface TableContextMenuProps {
  children: React.ReactNode
  selectedCells: { row: number, col: number }[]
  data: CSVData
  onCellsUpdate: (cells: { row: number, col: number, value: string }[]) => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
}

export default function TableContextMenu({
  children,
  selectedCells,
  data,
  onCellsUpdate,
  onCopy,
  onCut,
  onPaste,
  onDelete
}: TableContextMenuProps) {
  // 日期间隔对话框状态
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  // 分钟设置对话框状态
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false)
  
  // 检查选中的单元格是否在同一列
  const isSameColumn = () => {
    if (selectedCells.length <= 1) return false
    
    const firstCol = selectedCells[0].col
    return selectedCells.every(cell => cell.col === firstCol)
  }
  
  // 获取选中单元格的列索引
  const getSelectedColumn = () => {
    if (!isSameColumn()) return -1
    return selectedCells[0].col
  }
  
  // 获取选中单元格的值
  const getSelectedValues = () => {
    if (!isSameColumn()) return []
    
    const colIndex = selectedCells[0].col
    return selectedCells
      .map(cell => data.rows[cell.row][colIndex])
      .filter(value => value !== undefined)
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
          
          {/* 日期操作 */}
          <ContextMenuItem
            onClick={() => setDateDialogOpen(true)}
            disabled={!isSelectedDateColumn() || selectedCells.length <= 1}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>日期递进...</span>
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
"use client"

import React from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Copy,
  Clipboard,
  Trash2,
  Calendar,
  MousePointer,
  Grid,
  Ban,
} from "lucide-react"

interface TMDBTableContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onCopy: () => void
  onPaste: () => void
  onClear: () => void
  onMarkAsEmpty: () => void
  onAddRowAbove: () => void
  onAddRowBelow: () => void
  onDeleteRow: () => void
  onAddColumnLeft: () => void
  onAddColumnRight: () => void
  onDeleteColumn: () => void
  selectedCells?: { row: number; col: number }[]
}

export function TMDBTableContextMenu({
  position,
  onClose,
  onCopy,
  onPaste,
  onClear,
  onMarkAsEmpty,
  onAddRowAbove,
  onAddRowBelow,
  onDeleteRow,
  onAddColumnLeft,
  onAddColumnRight,
  onDeleteColumn,
  selectedCells = [],
}: TMDBTableContextMenuProps) {
  // 计算选中的行和列
  const selectedRows = selectedCells.length > 0 
    ? [...new Set(selectedCells.map(cell => cell.row))].length 
    : 0;
  
  const selectedColumns = selectedCells.length > 0 
    ? [...new Set(selectedCells.map(cell => cell.col))].length 
    : 0;

  return (
    <div
      className="absolute bg-white dark:bg-gray-900 border rounded shadow-md py-1 z-50 min-w-[180px] max-w-xs animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: position.y,
        left: position.x,
        maxHeight: 'calc(100vh - 20px)',
        overflowY: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 显示选中信息 */}
      {selectedCells.length > 0 && (
        <div className="px-3 py-1 text-xs font-medium bg-muted/50 flex items-center justify-between">
          <span>已选择: {selectedCells.length} 单元格</span>
          {selectedRows > 1 && selectedColumns > 1 && (
            <span className="text-muted-foreground">
              {selectedRows} × {selectedColumns}
            </span>
          )}
        </div>
      )}
      
      <div className="text-xs font-medium text-muted-foreground px-3 py-1 border-b">
        单元格操作
      </div>
      <button
        onClick={onCopy}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Copy className="h-4 w-4 mr-2" />
        <span className="flex-1">复制</span>
        <span className="text-xs text-muted-foreground">Ctrl+C</span>
      </button>
      <button
        onClick={onPaste}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Clipboard className="h-4 w-4 mr-2" />
        <span className="flex-1">粘贴</span>
        <span className="text-xs text-muted-foreground">Ctrl+V</span>
      </button>
      <button
        onClick={onClear}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        <span className="flex-1">清空单元格内容</span>
        <span className="text-xs text-muted-foreground">Delete</span>
      </button>
      <button
        onClick={onMarkAsEmpty}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Ban className="h-4 w-4 mr-2" />
        <span className="flex-1">标记为显式空值</span>
        <span className="text-xs text-muted-foreground">右键</span>
      </button>
      
      <div className="border-t my-1"></div>
      
      {/* 行操作菜单项 */}
      <div className="px-3 py-1 text-xs font-medium">行操作:</div>
      <button
        onClick={onAddRowAbove}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <ArrowUp className="h-4 w-4 mr-2" />
        <span className="flex-1">在上方插入行</span>
      </button>
      <button
        onClick={onAddRowBelow}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <ArrowDown className="h-4 w-4 mr-2" />
        <span className="flex-1">在下方插入行</span>
      </button>
      <button
        onClick={onDeleteRow}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        <span className="flex-1">删除整行</span>
        <span className="text-xs text-muted-foreground">Shift+Del</span>
      </button>
      
      <div className="border-t my-1"></div>
      
      {/* 列操作菜单项 */}
      <div className="px-3 py-1 text-xs font-medium">列操作:</div>
      <button
        onClick={onAddColumnLeft}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="flex-1">在左侧插入列</span>
      </button>
      <button
        onClick={onAddColumnRight}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <ArrowRight className="h-4 w-4 mr-2" />
        <span className="flex-1">在右侧插入列</span>
      </button>
      <button
        onClick={onDeleteColumn}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        <span className="flex-1">删除整列</span>
        <span className="text-xs text-muted-foreground">Ctrl+Del</span>
      </button>
      
      <div className="border-t my-1"></div>
      
      <div className="px-3 py-1 text-xs font-medium">快速填充:</div>
      <button
        onClick={() => {
          const today = new Date().toISOString().split('T')[0]
          // 这里可以添加填充今日日期的逻辑
          onClose()
        }}
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center"
      >
        <Calendar className="h-4 w-4 mr-2" />
        <span className="flex-1">今日日期</span>
      </button>
    </div>
  )
} 
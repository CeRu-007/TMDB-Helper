"use client"

import React from "react"
import { Table } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Copy,
  Clipboard,
  Undo,
  Redo,
  Save,
  X,
  Filter,
  Download,
  Upload,
  Trash2,
  Plus,
  Search,
  FileText,
  Table as TableIcon,
  RefreshCw,
  Settings,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 单元格位置类型
interface CellPosition {
  row: number
  col: number
}

// 工具栏组件属性
interface TMDBTableToolbarProps<TData> {
  table: Table<TData>
  selectedCells: CellPosition[]
  onAddRow: (position: 'above' | 'below') => void
  onDeleteRow: () => void
  onAddColumn: (position: 'left' | 'right') => void
  onDeleteColumn: () => void
  onCopy: () => void
  onPaste: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onCancel: () => void
  globalFilter: string
  setGlobalFilter: (value: string) => void
  isSaving?: boolean
}

export function TMDBTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  onSave,
  onCancel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  selectedCells,
  onCopy,
  onPaste,
  onClear,
  isSaving = false,
}: TMDBTableToolbarProps<TData>) {
  return (
    <div className="flex flex-col gap-1 p-1 border-b">
      {/* 顶部工具栏 - 文件操作和全局功能 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
        <Button
            variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
            className="h-8 gap-1"
        >
            {isSaving ? (
              <span className="animate-spin h-4 w-4">⏳</span>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
        </Button>
        <Button
            variant="ghost"
          size="sm"
          onClick={onCancel}
            className="h-8 gap-1"
        >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">取消</span>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
            variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
            className="h-8"
        >
            <Undo className="h-4 w-4" />
        </Button>
        <Button
            variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
            className="h-8"
        >
            <Redo className="h-4 w-4" />
        </Button>
        </div>

        <div className="flex items-center gap-1">
          <Input
            placeholder="搜索..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>显示列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                      {column.id.startsWith("col-")
                        ? table.getState().columnOrder.indexOf(column.id) - 1 >= 0
                          ? table.getState().columnOrder.indexOf(column.id) - 1
                          : "?"
                        : "#"}
                      {column.id.startsWith("col-") &&
                        `: ${
                          column.id.replace("col-", "")
                        }`}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 底部工具栏 - 编辑操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">添加</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onAddRow("above")}>
                <ArrowUp className="mr-2 h-4 w-4" />
                <span>在上方插入行</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddRow("below")}>
                <ArrowDown className="mr-2 h-4 w-4" />
                <span>在下方插入行</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAddColumn("left")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span>在左侧插入列</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddColumn("right")}>
                <ArrowRight className="mr-2 h-4 w-4" />
                <span>在右侧插入列</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteRow}
            className="h-8 gap-1"
            disabled={selectedCells.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">删除行</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteColumn}
            className="h-8 gap-1"
            disabled={selectedCells.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">删除列</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 gap-1"
            disabled={selectedCells.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">清空单元格</span>
          </Button>
        </div>

        <div className="flex items-center">
          {selectedCells && selectedCells.length > 0 && (
            <Badge variant="outline" className="mr-2">
              已选择 {selectedCells.length} 个单元格
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // 复制到剪贴板
                navigator.clipboard.writeText(
                  table.getRowModel().rows.map((row) => 
                    row.getVisibleCells().map((cell) => 
                      cell.getValue()
                    ).join('\t')
                  ).join('\n')
                )
              }}
              className="h-8"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // 下载为CSV
                const csv = table.getRowModel().rows.map((row) => 
                  row.getVisibleCells().map((cell) => 
                    `"${String(cell.getValue()).replace(/"/g, '""')}"`
                  ).join(',')
                ).join('\n')
                
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `export-${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
              className="h-8"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 
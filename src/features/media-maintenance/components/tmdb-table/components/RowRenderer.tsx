import React from "react"
import { TableRow, TableCell } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
} from "lucide-react"
import CellRenderer from "./CellRenderer"
import type { CellPosition } from "../types"

interface RowRendererProps {
  rowIndex: number
  rowData: string[]
  headers: string[]
  isSelected: boolean
  selectedCells: CellPosition[]
  activeCell: CellPosition | null
  editingCell: { row: number; col: number; value: string } | null
  isDragging: boolean
  canStartDragging: boolean
  showRowNumbers: boolean
  showRowOperations: boolean
  rowHeight?: number
  onCellDoubleClick: (row: number, col: number, event: React.MouseEvent) => void
  onCellContextMenu: (row: number, col: number) => void
  onCellMouseMove: (row: number, col: number, event: React.MouseEvent) => void
  onCellMouseDown: (row: number, col: number, event: React.MouseEvent) => void
  onEditInputChange: (value: string) => void
  onEditFinish: () => void
  onEditCancel: () => void
  onRowSelect: (rowIndex: number, selected: boolean) => void
  onInsertRow: (index: number, position: "before" | "after") => void
  onDeleteRow: (index: number) => void
  onDuplicateRow: (index: number) => void
  onMoveRow: (index: number, direction: "up" | "down") => void
  editInputRef: React.RefObject<HTMLInputElement | null>
}

export const RowRenderer: React.FC<RowRendererProps> = ({
  rowIndex,
  rowData,
  headers,
  isSelected,
  selectedCells,
  activeCell,
  editingCell,
  isDragging,
  canStartDragging,
  showRowNumbers,
  showRowOperations,
  rowHeight,
  onCellDoubleClick,
  onCellContextMenu,
  onCellMouseMove,
  onCellMouseDown,
  onEditInputChange,
  onEditFinish,
  onEditCancel,
  onRowSelect,
  onInsertRow,
  onDeleteRow,
  onDuplicateRow,
  onMoveRow,
  editInputRef,
}) => {
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some((cell) => cell.row === row && cell.col === col)
  }

  const isActiveCell = (row: number, col: number) => {
    return activeCell?.row === row && activeCell?.col === col
  }

  const isEditingCell = (row: number, col: number) => {
    return editingCell?.row === row && editingCell?.col === col
  }

  return (
    <TableRow key={rowIndex} style={{ height: rowHeight }} className="group">
      {showRowNumbers && (
        <TableCell className="w-16 text-center bg-muted/50 sticky left-0 z-10 border-r">
          <div className="flex items-center justify-center space-x-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onRowSelect(rowIndex, e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-xs text-muted-foreground">
              {rowIndex + 1}
            </span>

            {showRowOperations && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onInsertRow(rowIndex, "before")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    在上方插入行
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onInsertRow(rowIndex, "after")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    在下方插入行
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicateRow(rowIndex)}>
                    <Copy className="mr-2 h-4 w-4" />
                    复制行
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onMoveRow(rowIndex, "up")}
                    disabled={rowIndex === 0}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    上移
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onMoveRow(rowIndex, "down")}
                    disabled={rowIndex === rowData.length - 1}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    下移
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteRow(rowIndex)}
                    disabled={rowData.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除行
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TableCell>
      )}

      {rowData.map((cell, colIndex) => (
        <CellRenderer
          key={colIndex}
          row={rowIndex}
          col={colIndex}
          value={cell}
          columnName={headers[colIndex] || ""}
          isSelected={isCellSelected(rowIndex, colIndex)}
          isActive={isActiveCell(rowIndex, colIndex)}
          isEditing={isEditingCell(rowIndex, colIndex)}
          isDragging={isDragging}
          canStartDragging={canStartDragging}
          editValue={editingCell?.value || ""}
          onDoubleClick={(e) => onCellDoubleClick(rowIndex, colIndex, e)}
          onContextMenu={() => onCellContextMenu(rowIndex, colIndex)}
          onMouseMove={(e) => onCellMouseMove(rowIndex, colIndex, e)}
          onMouseDown={(e) => onCellMouseDown(rowIndex, colIndex, e)}
          onEditInputChange={onEditInputChange}
          onEditFinish={onEditFinish}
          onEditCancel={onEditCancel}
          editInputRef={editInputRef}
        />
      ))}
    </TableRow>
  )
}

export default RowRenderer

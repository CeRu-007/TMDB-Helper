import React from "react"
import { TableCell } from "@/shared/components/ui/table"
import { cn } from "@/lib/utils"
import type { CellPosition } from "../types"
import {
  isValidUrl,
  isBackdropColumn,
  isOverviewColumn,
  isAirDateColumn,
} from "../lib"

interface CellRendererProps {
  row: number
  col: number
  value: string
  columnName: string
  isSelected: boolean
  isActive: boolean
  isEditing: boolean
  isDragging: boolean
  canStartDragging: boolean
  editValue: string
  onDoubleClick: (event: React.MouseEvent) => void
  onContextMenu: () => void
  onMouseMove: (event: React.MouseEvent) => void
  onMouseDown: (event: React.MouseEvent) => void
  onEditInputChange: (value: string) => void
  onEditFinish: () => void
  onEditCancel: () => void
  editInputRef: React.RefObject<HTMLInputElement | null>
}

export const CellRenderer: React.FC<CellRendererProps> = ({
  row,
  col,
  value,
  columnName,
  isSelected,
  isActive,
  isEditing,
  isDragging,
  canStartDragging,
  editValue,
  onDoubleClick,
  onContextMenu,
  onMouseMove,
  onMouseDown,
  onEditInputChange,
  onEditFinish,
  onEditCancel,
  editInputRef,
}) => {
  const isBackdrop = isBackdropColumn(columnName)
  const isUrl = isValidUrl(value)
  const isOverview = isOverviewColumn(columnName)
  const isAirDate = isAirDateColumn(columnName)

  const shouldShowUrlFeatures = isBackdrop && isUrl && !isEditing

  const handleUrlClick = (e: React.MouseEvent) => {
    if ((e.ctrlKey || e.metaKey) && shouldShowUrlFeatures) {
      e.stopPropagation()
      window.open(value, "_blank", "noopener,noreferrer")
    }
  }

  const getCellContent = () => {
    const baseClass = "px-2 py-1 text-sm h-full"
    const hoverClass = shouldShowUrlFeatures
      ? "hover:text-primary hover:underline cursor-pointer transition-colors"
      : ""

    if (isOverview) {
      return (
        <div
          className={cn(
            baseClass,
            hoverClass,
            "whitespace-nowrap overflow-hidden text-ellipsis"
          )}
          title={value || ""}
          style={{
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      )
    }

    if (isAirDate) {
      return (
        <div className={cn(baseClass, hoverClass)} title={value || undefined}>
          {value}
        </div>
      )
    }

    return (
      <div
        className={cn(baseClass, "truncate", hoverClass)}
        title={shouldShowUrlFeatures ? "按住Ctrl点击查看图片" : undefined}
      >
        {value}
      </div>
    )
  }

  const getCellStyle = (): React.CSSProperties => {
    if (isOverview) {
      return { minWidth: "400px", maxWidth: "600px", width: "400px" }
    }
    if (isAirDate) {
      return { minWidth: "100px", maxWidth: "none", width: "120px" }
    }
    return {
      minWidth: "100px",
      maxWidth: "250px",
      width: "auto",
    }
  }

  return (
    <TableCell
      className={cn(
        isSelected && !isEditing && "bg-primary/20",
        isActive && !isEditing && "ring-2 ring-primary",
        isDragging && canStartDragging && "cursor-crosshair",
        isEditing
          ? "relative whitespace-nowrap overflow-hidden"
          : "relative select-none whitespace-nowrap overflow-hidden cursor-text hover:bg-accent/30 transition-colors",
        isOverview && "overview-cell"
      )}
      onClick={handleUrlClick}
      onDoubleClick={(e) => {
        e.preventDefault()
        onDoubleClick(e)
      }}
      onContextMenu={onContextMenu}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      data-column={columnName.toLowerCase().replace(/\s+/g, "_")}
      style={getCellStyle()}
    >
      {isEditing ? (
        <input
          ref={editInputRef}
          className="w-full h-full px-2 py-1 border-2 border-primary rounded focus:ring-2 focus:ring-primary/50 focus:outline-none bg-background text-sm absolute inset-0"
          value={editValue}
          onChange={(e) => onEditInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onEditFinish()
            } else if (e.key === "Escape") {
              e.preventDefault()
              onEditCancel()
            } else if (e.key === "Tab") {
              e.preventDefault()
              onEditFinish()
            }
          }}
          onBlur={onEditFinish}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          autoFocus
          style={{ zIndex: 50 }}
        />
      ) : (
        getCellContent()
      )}
    </TableCell>
  )
}

export default CellRenderer

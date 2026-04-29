import type { CSVData } from "@/types/csv-editor"

export interface CellPosition {
  row: number
  col: number
}

export interface CellSelection {
  start: CellPosition | null
  end: CellPosition | null
}

export interface EditCell {
  row: number
  col: number
  value: string
}

export interface BatchEditData {
  row: number
  col: number
  value: string
  columnName: string
}

export interface TMDBTableProps {
  data: CSVData
  className?: string
  enableColumnResizing?: boolean
  enableColumnReordering?: boolean
  rowHeight?: number
  onCellChange?: (row: number, col: number, value: string) => void
  onSelectionChange?: (selection: CellPosition[]) => void
  onDataChange?: (newData: CSVData) => void
  showRowNumbers?: boolean
  showColumnOperations?: boolean
  showRowOperations?: boolean
}

export interface UseTMDBTableStateOptions {
  initialData: CSVData
  onDataChange?: (newData: CSVData) => void
  onCellChange?: (row: number, col: number, value: string) => void
}

export interface UseTMDBTableStateReturn {
  localData: CSVData
  isEditing: boolean
  editCell: EditCell | null
  stateRef: React.MutableRefObject<{
    localData: CSVData
    isEditing: boolean
    editCell: EditCell | null
  }>
  updateCellData: (row: number, col: number, value: string) => void
  startEditing: (row: number, col: number) => void
  finishEditing: () => void
  cancelEditing: () => void
  updateEditValue: (value: string) => void
  syncExternalData: (data: CSVData) => void
  updateStateRef: () => void
}

export interface UseTMDBTableSelectionReturn {
  selectedCells: CellPosition[]
  activeCell: CellPosition | null
  selectedRows: Set<number>
  isAllRowsSelected: boolean
  selectCell: (cell: CellPosition) => void
  selectCells: (cells: CellPosition[]) => void
  clearSelection: () => void
  selectRow: (rowIndex: number, selected: boolean) => void
  selectAll: (totalRows: number) => void
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>
  setIsAllRowsSelected: React.Dispatch<React.SetStateAction<boolean>>
}

export interface UseTMDBTableHistoryReturn {
  history: CSVData[]
  currentIndex: number
  canUndo: boolean
  canRedo: boolean
  saveToHistory: (data: CSVData) => void
  undo: () => CSVData | null
  redo: () => CSVData | null
  clearHistory: () => void
}

export interface UseTMDBTableKeyboardOptions {
  isActive: boolean
  selectedCells: CellPosition[]
  activeCell: CellPosition | null
  isEditing: boolean
  onDelete?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onSelectAll?: () => void
  onNavigate?: (direction: string, shiftKey: boolean) => void
  onEdit?: () => void
  onEscape?: () => void
}

export interface UseTMDBTableMouseOptions {
  onCellClick?: (cell: CellPosition, event: React.MouseEvent) => void
  onCellDoubleClick?: (cell: CellPosition, event: React.MouseEvent) => void
  onSelectionStart?: (cell: CellPosition) => void
  onSelectionChange?: (cells: CellPosition[]) => void
  onSelectionEnd?: () => void
}

export interface UseTMDBTableMouseReturn {
  isDragging: boolean
  isShiftSelecting: boolean
  dragStart: CellPosition | null
  canStartDragging: boolean
  handleMouseDown: (cell: CellPosition, event: React.MouseEvent) => void
  handleMouseMove: (cell: CellPosition, event: React.MouseEvent) => void
  handleMouseUp: () => void
  handleDoubleClick: (cell: CellPosition, event: React.MouseEvent) => void
  setIsShiftSelecting: React.Dispatch<React.SetStateAction<boolean>>
}

export interface UseTMDBTableClipboardOptions {
  selectedCells: CellPosition[]
  localData: CSVData
  updateCellData: (updates: Array<{ row: number; col: number; value: string }>) => void
}

export interface UseTMDBTableClipboardReturn {
  copy: () => Promise<boolean>
  paste: () => Promise<boolean>
  cut: () => Promise<boolean>
}

export interface BatchInsertOptions {
  episodeColumnIndex?: number
  runtimeColumnIndex?: number
  startEpisodeNumber?: number
  prevRuntimeValue?: string
}

export interface BatchModificationInfo {
  pattern: string
  replaceWith: string
  affectedRows: number[]
}

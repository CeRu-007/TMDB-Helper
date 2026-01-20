export interface CSVData {
  headers: string[]
  rows: string[][]
}

export interface CellPosition {
  row: number
  col: number
}

export interface CellSelection {
  start: CellPosition | null
  end: CellPosition | null
}

export interface CSVEditorProps {
  data: CSVData
  onChange: (newData: CSVData) => void
  onSave: () => void
  onCancel: () => void
}

export interface HistoryItem {
  data: CSVData
  timestamp: number
}

export interface DatePickerState {
  show: boolean
  position: { x: number; y: number }
  selectedDate?: Date
}

export interface ScrollState {
  thumbWidth: number
  thumbPosition: number
  showIndicator: boolean
}

export type EditorMode = 'table' | 'text' 
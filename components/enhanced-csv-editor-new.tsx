"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Save, ArrowRight, Copy, Calendar, ArrowDownUp, Trash2, ArrowDown, ArrowLeft, ArrowRight as ArrowRightIcon, X, Undo } from "lucide-react"
import { format } from "date-fns"
import BaseCSVEditor from "./base-csv-editor"
import type { CSVData, CSVEditorProps, CellPosition, HistoryItem, DatePickerState, ScrollState } from "@/types/csv-editor"

export default function EnhancedCSVEditor({ data, onChange, onSave, onCancel }: CSVEditorProps) {
  // 继承基础编辑器状态
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([])
  const [clipboard, setClipboard] = useState<string[][]>([])
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<number | null>(0)
  
  // 历史记录状态
  const [history, setHistory] = useState<HistoryItem[]>([{ data, timestamp: Date.now() }])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0)
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false)

  // 日期选择器状态
  const [datePicker, setDatePicker] = useState<DatePickerState>({
    show: false,
    position: { x: 0, y: 0 },
  })
  const [dateInterval, setDateInterval] = useState(7)
  const [episodesPerDate, setEpisodesPerDate] = useState(1)
  const [startDate, setStartDate] = useState<Date>(new Date())

  // 滚动状态
  const [scroll, setScroll] = useState<ScrollState>({
    thumbWidth: 100,
    thumbPosition: 0,
    showIndicator: false,
  })

  // 快捷键帮助
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)

  // 引用
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 处理历史记录
  const addToHistory = (newData: CSVData) => {
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false)
      return
    }

    const newHistory = history.slice(0, currentHistoryIndex + 1)
    newHistory.push({
      data: newData,
      timestamp: Date.now(),
    })

    setHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (currentHistoryIndex > 0) {
      setIsUndoRedoAction(true)
      setCurrentHistoryIndex(currentHistoryIndex - 1)
      onChange(history[currentHistoryIndex - 1].data)
    }
  }

  const redo = () => {
    if (currentHistoryIndex < history.length - 1) {
      setIsUndoRedoAction(true)
      setCurrentHistoryIndex(currentHistoryIndex + 1)
      onChange(history[currentHistoryIndex + 1].data)
    }
  }

  // 处理日期相关操作
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || selectedCells.length === 0) return

    const newData = { ...data }
    selectedCells.forEach(cell => {
      newData.rows[cell.row][cell.col] = format(date, "yyyy-MM-dd")
    })

    onChange(newData)
    addToHistory(newData)
    setDatePicker({ ...datePicker, show: false })
  }

  const applyDateSequence = () => {
    if (selectedCells.length === 0) return

    const newData = { ...data }
    let currentDate = startDate
    let episodeCount = 0

    selectedCells.forEach(cell => {
      if (episodeCount >= episodesPerDate) {
        currentDate = new Date(currentDate.getTime() + dateInterval * 24 * 60 * 60 * 1000)
        episodeCount = 0
      }
      newData.rows[cell.row][cell.col] = format(currentDate, "yyyy-MM-dd")
      episodeCount++
    })

    onChange(newData)
    addToHistory(newData)
  }

  // 处理复制粘贴
  const handleCopy = () => {
    if (selectedCells.length === 0) return

    const minRow = Math.min(...selectedCells.map(cell => cell.row))
    const minCol = Math.min(...selectedCells.map(cell => cell.col))
    const maxRow = Math.max(...selectedCells.map(cell => cell.row))
    const maxCol = Math.max(...selectedCells.map(cell => cell.col))

    const copiedData: string[][] = []
    for (let i = minRow; i <= maxRow; i++) {
      const row: string[] = []
      for (let j = minCol; j <= maxCol; j++) {
        row.push(data.rows[i][j])
      }
      copiedData.push(row)
    }

    setClipboard(copiedData)
    toast({
      title: "已复制",
      description: `已复制 ${copiedData.length}x${copiedData[0].length} 个单元格`,
    })
  }

  const handlePaste = () => {
    if (selectedCells.length === 0 || clipboard.length === 0) return

    const startCell = selectedCells[0]
    const newData = { ...data }

    clipboard.forEach((row, rowOffset) => {
      row.forEach((cell, colOffset) => {
        const targetRow = startCell.row + rowOffset
        const targetCol = startCell.col + colOffset
        if (targetRow < newData.rows.length && targetCol < newData.rows[targetRow].length) {
          newData.rows[targetRow][targetCol] = cell
        }
      })
    })

    onChange(newData)
    addToHistory(newData)
  }

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setIsCtrlPressed(true)
      }

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            handleCopy()
            break
          case "v":
            handlePaste()
            break
          case "z":
            if (!e.shiftKey) undo()
            break
          case "y":
            redo()
            break
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setIsCtrlPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [selectedCells, clipboard, currentHistoryIndex])

  // 处理数据变化
  useEffect(() => {
    if (!isUndoRedoAction) {
      addToHistory(data)
    }
  }, [data])

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 border-b">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={currentHistoryIndex === 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={selectedCells.length === 0}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制 (Ctrl+C)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePicker({ ...datePicker, show: true })}
              disabled={selectedCells.length === 0}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>设置日期</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  return (
    <div className="enhanced-csv-editor-container">
      {renderToolbar()}
      
      <BaseCSVEditor
        data={data}
        onChange={onChange}
        onSave={onSave}
        onCancel={onCancel}
      />

      {/* 日期选择器 */}
      {datePicker.show && (
        <div
          className="absolute bg-white dark:bg-gray-800 border rounded-md shadow-lg p-2"
          style={{
            left: datePicker.position.x,
            top: datePicker.position.y,
          }}
        >
          <CalendarComponent
            mode="single"
            selected={datePicker.selectedDate}
            onSelect={handleDateSelect}
          />
        </div>
      )}

      {/* 快捷键帮助 */}
      {showShortcutHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">快捷键</h3>
            <ul className="space-y-2">
              <li>Ctrl + C: 复制选中单元格</li>
              <li>Ctrl + V: 粘贴到选中单元格</li>
              <li>Ctrl + Z: 撤销</li>
              <li>Ctrl + Y: 重做</li>
              <li>Enter: 完成编辑</li>
              <li>Esc: 取消编辑</li>
            </ul>
            <Button
              className="mt-4"
              onClick={() => setShowShortcutHelp(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 这是一个临时文件，用于添加CSS样式

// 在组件的return语句结束前添加以下内容:

{/* 添加全局CSS覆盖样式 */}
<style jsx global>{`
  /* 强化滚动容器 */
  .scroll-container {
    overflow-x: scroll !important;
    overflow-y: auto !important;
    scrollbar-width: thin !important;
    scrollbar-color: #888 #f1f1f1 !important;
    display: block !important;
    width: 100% !important;
    position: relative !important;
    z-index: 5 !important;
    max-width: 100% !important;
  }
  
  /* 表格包装器 */
  .table-wrapper {
    width: max-content !important;
    min-width: 100% !important;
    position: relative !important;
  }
  
  /* 强制表格布局 */
  .enhanced-csv-editor {
    table-layout: fixed !important;
    border-collapse: collapse !important;
    width: max-content !important;
    min-width: 100% !important;
  }
  
  /* 强制覆盖所有可能影响表格的样式 */
  .absolute-cell-content {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-height: 28px !important;
    height: 28px !important;
    display: block !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    padding: 0 4px !important;
    line-height: 28px !important;
    margin: 0 !important;
    border: none !important;
    font-size: 12px !important;
    pointer-events: none !important; /* 确保内容元素不阻挡鼠标事件 */
    z-index: 1 !important; /* 确保内容在底层 */
    word-break: keep-all !important; /* 防止单词断行 */
    word-wrap: normal !important; /* 防止长单词换行 */
    letter-spacing: normal !important; /* 正常字母间距 */
    text-align: left !important; /* 左对齐 */
    text-indent: 0 !important; /* 无缩进 */
    max-width: 100% !important; /* 确保不超过容器宽度 */
    box-sizing: border-box !important; /* 确保padding计入宽度 */
    transform: translateZ(0) !important; /* 启用GPU加速，减少渲染问题 */
    -webkit-font-smoothing: antialiased !important; /* 字体平滑 */
    user-select: none !important; /* 禁止文本选择 */
  }
  
  /* 覆盖表格单元格样式，确保鼠标事件正常工作 */
  .enhanced-csv-editor td {
    height: 28px !important;
    max-height: 28px !important;
    min-height: 28px !important;
    overflow: hidden !important;
    padding: 0 !important;
    position: relative !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
    cursor: cell !important; /* 添加明确的单元格光标 */
    word-break: keep-all !important; /* 防止单词断行 */
    word-wrap: normal !important; /* 防止长单词换行 */
    box-sizing: border-box !important; /* 确保padding计入宽度 */
    vertical-align: middle !important; /* 垂直居中 */
    border-bottom: 1px solid #e5e7eb !important;
    border-right: 1px solid #e5e7eb !important;
  }
  
  /* 特别处理可能的问题单元格，针对overview列 */
  .enhanced-csv-editor td.overview-cell {
    height: 28px !important;
    max-height: 28px !important;
    min-height: 28px !important;
    line-height: 28px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    padding: 0 !important; /* 移除内边距 */
    font-size: 12px !important; /* 确保字体大小一致 */
    position: relative !important; /* 确保定位正确 */
  }
  
  /* 确保单元格可点击 */
  .enhanced-csv-editor td > div {
    pointer-events: none !important; /* 内容不拦截事件 */
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 100% !important; /* 确保不超过容器宽度 */
    transform: translateZ(0) !important; /* 硬件加速 */
  }
  
  /* 确保表格组件接收所有事件 */
  .enhanced-csv-editor-container {
    z-index: 10 !important;
    position: relative !important;
    overflow: hidden !important; /* 防止内部元素溢出 */
    width: 100% !important;
  }
  
  /* 表格容器样式 */
  .table-container {
    position: relative !important;
    width: 100% !important;
    overflow-x: hidden !important;
  }
  
  /* 确保表头不会换行 */
  .enhanced-csv-editor th {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    height: 36px !important;
    position: relative !important;
    background-color: #f9fafb !important;
    z-index: 5 !important;
  }

  /* 自定义滚动条样式 - Webkit浏览器 */
  .overflow-auto::-webkit-scrollbar {
    width: 8px !important;
    height: 10px !important; /* 增加滚动条高度使其更容易点击 */
    background-color: #f1f1f1 !important;
  }
  
  .overflow-auto::-webkit-scrollbar-track {
    background: #f1f1f1 !important;
    border-radius: 4px !important;
  }
  
  .overflow-auto::-webkit-scrollbar-thumb {
    background: #888 !important;
    border-radius: 4px !important;
    border: 1px solid #f1f1f1 !important;
  }
  
  .overflow-auto::-webkit-scrollbar-thumb:hover {
    background: #555 !important;
  }
  
  /* 强制始终显示水平滚动条 */
  .enhanced-csv-editor-container .overflow-auto {
    overflow-x: scroll !important;
    scrollbar-width: thin !important;
    scrollbar-color: #888 #f1f1f1 !important;
    -webkit-overflow-scrolling: touch !important;
  }
  
  /* 移动端滚动优化 */
  @media (pointer: coarse) {
    .overflow-auto::-webkit-scrollbar {
      width: 12px !important;
      height: 12px !important;
    }
    
    .overflow-auto::-webkit-scrollbar-thumb {
      min-height: 40px !important;
      min-width: 40px !important;
    }
  }

  /* 修复Firefox浏览器的水平滚动问题 */
  @-moz-document url-prefix() {
    .scroll-container {
      scrollbar-width: auto !important;
    }
  }

  /* 修复IE/Edge浏览器的滚动问题 */
  @supports (-ms-ime-align:auto) {
    .scroll-container {
      -ms-overflow-style: -ms-autohiding-scrollbar !important;
    }
  }
`}</style> 
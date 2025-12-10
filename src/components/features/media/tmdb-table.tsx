"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table"
import { ScrollArea } from "@/components/common/scroll-area"
import { Button } from "@/components/common/button"
import { cn } from "@/lib/utils"
import TableContextMenu from "../../common/table-context-menu"
import { 
  Plus, 
  Minus, 
  ChevronDown, 
  MoreHorizontal, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Copy,
  Trash2,
  Edit3
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/dropdown-menu"

// 导入CSV数据类型
export interface CSVData {
  headers: string[]
  rows: string[][]
}

// 表格属性接口
export interface TMDBTableProps {
  data: CSVData
  className?: string
  enableColumnResizing?: boolean
  enableColumnReordering?: boolean
  rowHeight?: number
  onCellChange?: (row: number, col: number, value: string) => void
  onSelectionChange?: (selection: { row: number, col: number }[]) => void
  onDataChange?: (newData: CSVData) => void
  showRowNumbers?: boolean
  showColumnOperations?: boolean
  showRowOperations?: boolean
}

// 剪贴板数据接口
interface ClipboardData {
  data: string[][]
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

// 拖拽框选配置
const DEBOUNCE_DELAY = 16; // 鼠标移动防抖延迟，单位毫秒（约60fps）

/**
 * 防抖函数 - 用于优化频繁触发的事件
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, delay);
  };
}

/**
 * TMDBTable 组件
 * 基本的表格组件，用于显示和编辑CSV数据
 */
const TMDBTableComponent = ({
  data,
  className,
  enableColumnResizing = true,
  enableColumnReordering = true,
  rowHeight,
  onCellChange,
  onSelectionChange,
  onDataChange,
  showRowNumbers = true,
  showColumnOperations = true,
  showRowOperations = true
}: TMDBTableProps) => {
  // 列宽状态
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  // 选中单元格状态
  const [selectedCells, setSelectedCells] = useState<{ row: number, col: number }[]>([])
  // 表格容器引用
  const tableRef = useRef<HTMLDivElement>(null)
  // 当前活动单元格（用于键盘导航）
  const [activeCell, setActiveCell] = useState<{ row: number, col: number } | null>(null)
  // 拖拽选择状态
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ row: number, col: number } | null>(null)
  // 是否可以开始拖拽（只有在长按后才能拖拽）
  const [canStartDragging, setCanStartDragging] = useState(false)
  // 鼠标是否处于按下状态
  const [isMouseDown, setIsMouseDown] = useState(false)
  // 鼠标位置状态
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number, y: number } | null>(null)
  // 剪贴板数据
  const [clipboardData, setClipboardData] = useState<string[][] | null>(null)
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false)
  const [editCell, setEditCell] = useState<{ row: number, col: number, value: string } | null>(null)
  // 编辑输入引用
  const editInputRef = useRef<HTMLInputElement>(null)
  // 表格数据的本地副本
  const [localData, setLocalData] = useState<CSVData>(data)
  // 选择区域信息
  const [selectionInfo, setSelectionInfo] = useState<{
    rows: number,
    cols: number,
    visible: boolean
  }>({ rows: 0, cols: 0, visible: false })
  // 是否使用Shift键框选
  const [isShiftSelecting, setIsShiftSelecting] = useState(false)
  // 记录鼠标移动处理函数的引用
  const mouseMoveHandlerRef = useRef<any>(null)
  // 操作历史记录
  const [history, setHistory] = useState<CSVData[]>([])
  // 最大历史记录数量
  const MAX_HISTORY_SIZE = 50
  // 长按定时器引用
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  // 长按激活时间（毫秒）- 优化为200ms以提供更好的响应性
  const LONG_PRESS_DELAY = 200
  // 记录初始点击的单元格位置
  const [initialClickCell, setInitialClickCell] = useState<{ row: number, col: number } | null>(null)
  // 行选择状态
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  // 全选状态
  const [isAllRowsSelected, setIsAllRowsSelected] = useState(false)
  
  // 使用useRef存储最新状态，避免事件监听器频繁重新创建
  const stateRef = useRef({
    selectedCells,
    activeCell,
    isEditing,
    localData,
    isDragging,
    isShiftSelecting,
    history
  })
  
  // 更新状态引用
  useEffect(() => {
    stateRef.current = {
      selectedCells,
      activeCell,
      isEditing,
      localData,
      isDragging,
      isShiftSelecting,
      history
    }
  })
  
  // 缓存选中单元格的计算结果，避免每次渲染都重新计算
  const selectedCellsSet = useMemo(() => {
    const set = new Set<string>()
    selectedCells.forEach(cell => {
      set.add(`${cell.row}-${cell.col}`)
    })
    return set
  }, [selectedCells])
  
  // 缓存是否有选中单元格的结果
  const hasSelectedCells = useMemo(() => selectedCells.length > 0, [selectedCells.length])
  
  // 缓存表格行数和列数
  const tableSize = useMemo(() => ({
    rows: localData.rows.length,
    cols: localData.headers.length
  }), [localData.rows.length, localData.headers.length])
  
  // 当外部数据变化时更新本地数据
  useEffect(() => {
    setLocalData(data)
  }, [data])
  
  // 初始化列宽
  useEffect(() => {
    if (data && data.headers) {
      // 默认列宽为150px
      setColumnWidths(data.headers.map(() => 150))
    }
  }, [data])
  
  // 监听全选状态变化，确保表格正确渲染
  useEffect(() => {
    if (isAllRowsSelected || selectedRows.size > 0) {
      // 延迟执行以确保DOM更新完成
      const timer = setTimeout(() => {
        // 触发表格重新计算布局
        const tableContainer = document.querySelector('.tmdb-table');
        if (tableContainer) {
          const scrollArea = tableContainer.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollArea) {
            // 强制重新计算滚动区域
            const currentScrollTop = scrollArea.scrollTop;
            scrollArea.style.height = scrollArea.style.height; // 触发重新计算
            scrollArea.scrollTop = currentScrollTop;
          }
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isAllRowsSelected, selectedRows.size])
  
  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { selectedCells, activeCell, isEditing, localData, isDragging, isShiftSelecting, history } = stateRef.current
      
      if (isEditing) return; // 编辑模式下不处理全局键盘事件
      
      // 删除选中单元格内容 (Del键)
      if (e.key === 'Delete' && selectedCells.length > 0) {
        e.preventDefault()
        handleDeleteSelectedCells()
      }
      
      // 复制 (Ctrl+C)
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && selectedCells.length > 0) {
        e.preventDefault()
        handleCopy()
      }
      
      // 剪切 (Ctrl+X)
      if (e.key === 'x' && (e.ctrlKey || e.metaKey) && selectedCells.length > 0) {
        e.preventDefault()
        handleCut()
      }
      
      // 粘贴 (Ctrl+V)
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handlePaste()
      }
      
      // 撤销 (Ctrl+Z)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        
        // 内联撤销函数，避免依赖问题
        if (history.length === 0) {
          
          return;
        }

        // 获取最近的历史记录
        const prevData = history[0];
        if (prevData) {
          // 从历史记录中移除该记录并恢复数据
          setHistory(prev => prev.slice(1));
          setLocalData(prevData);
          onDataChange?.(prevData);

        }
      }
      
      // 全选 (Ctrl+A)
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSelectAll()
      }
      
      // 键盘导航
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        handleKeyboardNavigation(e.key, e.shiftKey)
      }
      
      // 按Enter键开始编辑
      if (e.key === 'Enter' && activeCell && !isEditing) {
        e.preventDefault()
        startEditing(activeCell.row, activeCell.col)
      }
      
      // 按F2键开始编辑
      if (e.key === 'F2' && activeCell && !isEditing) {
        e.preventDefault()
        startEditing(activeCell.row, activeCell.col)
      }
      
      // 插入行快捷键 (Ctrl+Shift+Plus)
      if (e.key === '+' && e.ctrlKey && e.shiftKey && activeCell) {
        e.preventDefault()
        insertRow(activeCell.row, 'after')
      }
      
      // 插入列快捷键 (Ctrl+Alt+Plus)
      if (e.key === '+' && e.ctrlKey && e.altKey && activeCell) {
        e.preventDefault()
        insertColumn(activeCell.col, 'after')
      }
      
      // 删除行快捷键 (Ctrl+Shift+Minus)
      if (e.key === '-' && e.ctrlKey && e.shiftKey && activeCell && localData.rows.length > 1) {
        e.preventDefault()
        deleteRow(activeCell.row)
      }
      
      // 删除列快捷键 (Ctrl+Alt+Minus)
      if (e.key === '-' && e.ctrlKey && e.altKey && activeCell && localData.headers.length > 1) {
        e.preventDefault()
        deleteColumn(activeCell.col)
      }
      
      // 按Escape键取消选择或框选模式
      if (e.key === 'Escape') {
        e.preventDefault()
        
        // 如果正在框选模式，先取消框选模式
        if (isDragging || isShiftSelecting) {
          setIsShiftSelecting(false)
          setIsDragging(false)
          setSelectionInfo(prev => ({ ...prev, visible: false }))
        } 
        // 否则清除选择
        else {
          setSelectedCells([])
          onSelectionChange?.([])
        }
      }
      
      // 使用Shift键临时启用框选模式
      if (e.key === 'Shift' && activeCell && !isShiftSelecting) {
        setIsShiftSelecting(true)
        setDragStart(activeCell)
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const { isShiftSelecting } = stateRef.current
      
      // 松开Shift键时，如果是通过Shift键启用的框选模式，则退出框选模式
      if (e.key === 'Shift' && isShiftSelecting) {
        setIsShiftSelecting(false)
        
        // 隐藏选择区域信息（延迟一段时间）
        setTimeout(() => {
          setSelectionInfo(prev => ({ ...prev, visible: false }))
        }, 1500)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, []) // 移除所有依赖，使用useRef来访问最新状态
  
  // 处理单元格点击
  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    // 清除之前的长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // 重置拖拽状态
    setCanStartDragging(false)
    setIsDragging(false)
    
    // 设置鼠标按下状态
    setIsMouseDown(true)
    
    // 设置活动单元格
    setActiveCell({ row, col })
    
    // 如果正在编辑，先结束编辑
    if (isEditing) {
      finishEditing()
    }
    
    // 如果按住Ctrl键，添加或移除选中单元格
    if (event.ctrlKey) {
      const cellIndex = selectedCells.findIndex(cell => cell.row === row && cell.col === col)
      if (cellIndex === -1) {
        const newSelection = [...selectedCells, { row, col }]
        setSelectedCells(newSelection)
        onSelectionChange?.(newSelection)
      } else {
        const newSelection = selectedCells.filter((_, index) => index !== cellIndex)
        setSelectedCells(newSelection)
        onSelectionChange?.(newSelection)
      }
    }
    // 如果按住Shift键，选择范围
    else if (event.shiftKey && selectedCells.length > 0) {
      // 传统的Shift+点击选择范围
      const lastCell = selectedCells[selectedCells.length - 1]
      if (lastCell) {
        const startRow = Math.min(lastCell.row, row)
        const endRow = Math.max(lastCell.row, row)
        const startCol = Math.min(lastCell.col, col)
        const endCol = Math.max(lastCell.col, col)
        
        const newSelection = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            newSelection.push({ row: r, col: c })
          }
        }
        
        setSelectedCells(newSelection)
        onSelectionChange?.(newSelection)
      }
    }
    // 普通点击，选择单个单元格
    else {
      const newSelection = [{ row, col }]
      setSelectedCells(newSelection)
      onSelectionChange?.(newSelection)
      
      // 记录初始点击的单元格位置
      if (newSelection[0]) {
        setInitialClickCell(newSelection[0])
      }
      
      // 使用长按定时器启用框选模式
      longPressTimerRef.current = setTimeout(() => {
        // 长按时间到，启用框选模式
        setCanStartDragging(true)
        setIsDragging(true)
        setDragStart({ row, col })
        // 记录鼠标按下的位置（只在长按后记录）
        setMouseDownPosition({ x: event.clientX, y: event.clientY })
        
        // 清除定时器引用
        longPressTimerRef.current = null;
      }, LONG_PRESS_DELAY);
      
      // 阻止默认的文本选择行为
      event.preventDefault()
    }
  }
  
  // 原始鼠标移动处理函数（未防抖）
  const handleMouseMoveOriginal = (row: number, col: number, event: React.MouseEvent) => {
    const { isDragging, selectedCells } = stateRef.current
    
    // 只有在鼠标按下且允许拖拽框选后才能执行拖拽操作
    if (isDragging && dragStart && canStartDragging && isMouseDown) {
      const startRow = Math.min(dragStart.row, row)
      const endRow = Math.max(dragStart.row, row)
      const startCol = Math.min(dragStart.col, col)
      const endCol = Math.max(dragStart.col, col)
      
      // 计算选择区域大小
      const rowCount = endRow - startRow + 1
      const colCount = endCol - startCol + 1
      
      // 优化：只有在选择区域发生变化时才更新选中单元格
      const selectionSize = rowCount * colCount
      const currentSelectionKey = `${startRow}-${endRow}-${startCol}-${endCol}`
      
      // 使用更精确的比较，避免不必要的更新
      if (selectedCells.length !== selectionSize || 
          !selectedCells.every((cell, index) => {
            const expectedRow = startRow + Math.floor(index / colCount)
            const expectedCol = startCol + (index % colCount)
            return cell.row === expectedRow && cell.col === expectedCol
          })) {
        
        const newSelection = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            newSelection.push({ row: r, col: c })
          }
        }
        
        setSelectedCells(newSelection)
        onSelectionChange?.(newSelection)
      }
      
      // 阻止默认的文本选择行为
      event.preventDefault()
    }
  }
  
  // 使用防抖处理鼠标移动
  const handleMouseMove = useCallback(
    debounce((row: number, col: number, event: React.MouseEvent) => {
      handleMouseMoveOriginal(row, col, event)
    }, DEBOUNCE_DELAY),
    [] // 移除依赖数组，使用stateRef访问最新状态
  )
  
  // 处理鼠标抬起（结束拖拽选择）
  const handleMouseUp = () => {
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    setIsDragging(false)
    setIsShiftSelecting(false)
    setMouseDownPosition(null)
    setCanStartDragging(false)
    setInitialClickCell(null)
    setIsMouseDown(false)
  }
  
  // 处理鼠标离开表格
  const handleMouseLeave = () => {
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp, { once: true })
    }
    setMouseDownPosition(null)
    setCanStartDragging(false)
    setInitialClickCell(null)
    setIsMouseDown(false)
  }
  
  // 处理单元格鼠标按下事件
  const handleCellMouseDown = (row: number, col: number, event: React.MouseEvent) => {
    // 设置鼠标按下状态
    setIsMouseDown(true)
    
    // 阻止默认事件
    event.preventDefault()
  }
  
  // 处理单元格双击，进入编辑模式
  const handleCellDoubleClick = (row: number, col: number, event: React.MouseEvent) => {
    // 如果按住Ctrl键，选择整列
    if (event.ctrlKey) {
      const colSelection = []
      for (let r = 0; r < localData.rows.length; r++) {
        colSelection.push({ row: r, col })
      }
      setSelectedCells(colSelection)
      onSelectionChange?.(colSelection)
    }
    // 如果按住Shift键，选择整行
    else if (event.shiftKey) {
      const rowSelection = []
      for (let c = 0; c < localData.headers.length; c++) {
        rowSelection.push({ row, col: c })
      }
      setSelectedCells(rowSelection)
      onSelectionChange?.(rowSelection)
    }
    // 普通双击，进入编辑模式
    else {
      startEditing(row, col)
    }
    
    // 阻止默认的文本选择行为
    event.preventDefault()
  }
  
  // 开始编辑单元格
  const startEditing = (row: number, col: number) => {
    if (row < 0 || row >= localData.rows.length || col < 0 || col >= localData.headers.length) {
      return
    }
    
    setEditCell({
      row,
      col,
      value: localData.rows[row][col]
    })
    setIsEditing(true)
    
    // 聚焦到编辑输入框
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus()
        editInputRef.current.select()
      }
    }, 0)
  }
  
  // 完成编辑
  const finishEditing = () => {
    if (editCell && editCell.row < localData.rows.length && editCell.col < localData.headers.length) {
      // 保存当前状态到历史记录
      saveToHistory(localData);
      
      // 更新数据
      const newData = { ...localData }
      newData.rows = [...newData.rows]
      if (newData.rows[editCell.row]) {
        newData.rows[editCell.row] = [...newData.rows[editCell.row]]
        newData.rows[editCell.row][editCell.col] = editCell.value
        
        setLocalData(newData)
        onCellChange?.(editCell.row, editCell.col, editCell.value)
        onDataChange?.(newData)
      }
    }
    
    setIsEditing(false)
    setEditCell(null)
  }
  
  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false)
    setEditCell(null)
  }
  
  // 处理编辑输入变化
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editCell) {
      setEditCell({
        ...editCell,
        value: e.target.value
      })
    }
  }
  
  // 处理编辑输入键盘事件
  const handleEditInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finishEditing()
      
      // Enter后移动到下一行同一列
      if (activeCell && activeCell.row < localData.rows.length - 1) {
        const nextCell = { row: activeCell.row + 1, col: activeCell.col }
        setActiveCell(nextCell)
        setSelectedCells([nextCell])
        onSelectionChange?.([nextCell])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      finishEditing()
      
      // Tab键移动到下一列
      if (activeCell) {
        let nextRow = activeCell.row
        let nextCol = activeCell.col + 1
        
        // 如果到了行末，移动到下一行的第一列
        if (nextCol >= localData.headers.length) {
          nextCol = 0
          nextRow = activeCell.row + 1
        }
        
        // 如果还在表格范围内
        if (nextRow < localData.rows.length) {
          const nextCell = { row: nextRow, col: nextCol }
          setActiveCell(nextCell)
          setSelectedCells([nextCell])
          onSelectionChange?.([nextCell])
        }
      }
    }
  }
  
  // 处理删除选中单元格内容
  const handleDeleteSelectedCells = () => {
    if (selectedCells.length === 0) return
    
    // 保存当前状态到历史记录
    saveToHistory(localData);
    
    const newData = { ...localData }
    newData.rows = [...newData.rows]
    
    // 创建已修改行的集合，避免重复创建同一行的副本
    const modifiedRows = new Set<number>()
    
    // 清空选中单元格的内容
    selectedCells.forEach(cell => {
      if (cell.row >= 0 && cell.row < newData.rows.length && 
          cell.col >= 0 && cell.col < newData.headers.length) {
        
        // 如果这一行还没有被修改过，创建它的副本
        if (!modifiedRows.has(cell.row)) {
          newData.rows[cell.row] = [...newData.rows[cell.row]]
          modifiedRows.add(cell.row)
        }
        
        // 设置单元格内容为空字符串
        newData.rows[cell.row][cell.col] = ''
        
        // 触发单元格变更回调
        onCellChange?.(cell.row, cell.col, '')
      }
    })
    
    // 更新本地数据并触发数据变更回调
    setLocalData(newData)
    onDataChange?.(newData)
  }
  
  // 处理复制操作
  const handleCopy = async () => {
    if (selectedCells.length === 0) return
    
    // 找出选中区域的边界
    const rows = selectedCells.map(cell => cell.row)
    const cols = selectedCells.map(cell => cell.col)
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)
    
    // 创建复制数据的二维数组
    const copyData: string[][] = []
    
    // 填充数据
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: string[] = []
      for (let c = minCol; c <= maxCol; c++) {
        // 检查该单元格是否被选中
        const isSelected = selectedCells.some(cell => cell.row === r && cell.col === c)
        
        if (isSelected && r < localData.rows.length && c < localData.headers.length) {
          rowData.push(localData.rows[r][c])
        } else {
          rowData.push('')
        }
      }
      copyData.push(rowData)
    }
    
    // 保存到剪贴板数据
    setClipboardData(copyData)
    
    // 转换为制表符分隔的文本，用于系统剪贴板
    const copyText = copyData.map(row => row.join('\t')).join('\n')
    
    try {
      await navigator.clipboard.writeText(copyText)
      
    } catch (err) {
      
    }
  }
  
  // 处理剪切操作
  const handleCut = async () => {
    if (selectedCells.length === 0) return
    
    // 先复制
    await handleCopy()
    
    // 然后删除（handleDeleteSelectedCells函数内部已经会保存历史记录）
    handleDeleteSelectedCells()
  }
  
  // 处理粘贴操作
  const handlePaste = async () => {
    // 如果没有活动单元格，无法确定粘贴位置
    if (!activeCell) return
    
    try {
      // 从系统剪贴板获取文本
      const clipText = await navigator.clipboard.readText()
      
      // 解析剪贴板文本为二维数组
      // 假设文本是制表符分隔的行，换行符分隔的列
      const pasteData = clipText
        .split('\n')
        .map(line => line.split('\t'))
      
      // 如果没有数据，直接返回
      if (pasteData.length === 0 || (pasteData.length === 1 && pasteData[0].length === 0)) {
        return
      }
      
      // 保存当前状态到历史记录
      saveToHistory(localData);
      
      // 创建新的数据副本
      const newData = { ...localData }
      newData.rows = [...newData.rows]
      
      // 从活动单元格开始粘贴
      const startRow = activeCell.row
      const startCol = activeCell.col
      
      // 计算粘贴区域的边界
      const endRow = Math.min(startRow + pasteData.length - 1, newData.rows.length - 1)
      const endCol = Math.min(startCol + Math.max(...pasteData.map(row => row.length)) - 1, newData.headers.length - 1)
      
      // 创建新的选择区域
      const newSelection: { row: number, col: number }[] = []
      
      // 粘贴数据
      for (let r = startRow; r <= endRow; r++) {
        // 创建行的副本
        if (r < newData.rows.length) {
          newData.rows[r] = [...newData.rows[r]]
          
          const pasteRow = pasteData[r - startRow]
          if (pasteRow) {
            for (let c = startCol; c <= endCol; c++) {
              const pasteCol = c - startCol
              if (pasteCol < pasteRow.length) {
                newData.rows[r][c] = pasteRow[pasteCol]
                
                // 添加到选择区域
                newSelection.push({ row: r, col: c })
                
                // 触发单元格变更回调
                onCellChange?.(r, c, pasteRow[pasteCol])
              }
            }
          }
        }
      }
      
      // 更新本地数据
      setLocalData(newData)
      onDataChange?.(newData)
      
      // 更新选择区域
      setSelectedCells(newSelection)
      onSelectionChange?.(newSelection)
      
    } catch (err) {
      
    }
  }
  
  // 处理全选操作
  const handleSelectAll = () => {
    if (!localData || !localData.rows || localData.rows.length === 0) return
    
    const allCells: { row: number, col: number }[] = []
    
    // 选择所有单元格
    for (let r = 0; r < localData.rows.length; r++) {
      for (let c = 0; c < localData.headers.length; c++) {
        allCells.push({ row: r, col: c })
      }
    }
    
    setSelectedCells(allCells)
    onSelectionChange?.(allCells)
  }
  
  // 处理键盘导航
  const handleKeyboardNavigation = (key: string, shiftKey: boolean) => {
    if (!activeCell) return
    
    const { row, col } = activeCell
    let newRow = row
    let newCol = col
    
    // 计算新的活动单元格位置
    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1)
        break
      case 'ArrowDown':
        newRow = Math.min(localData.rows.length - 1, row + 1)
        break
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1)
        break
      case 'ArrowRight':
        newCol = Math.min(localData.headers.length - 1, col + 1)
        break
    }
    
    // 如果位置没有变化，直接返回
    if (newRow === row && newCol === col) return
    
    // 更新活动单元格
    setActiveCell({ row: newRow, col: newCol })
    
    // 如果按住Shift键，扩展选择区域
    if (shiftKey && selectedCells.length > 0) {
      // 找出当前选择区域的起点
      const anchorCell = selectedCells[0]
      
      // 计算新的选择区域
      const startRow = Math.min(anchorCell.row, newRow)
      const endRow = Math.max(anchorCell.row, newRow)
      const startCol = Math.min(anchorCell.col, newCol)
      const endCol = Math.max(anchorCell.col, newCol)
      
      const newSelection = []
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelection.push({ row: r, col: c })
        }
      }
      
      setSelectedCells(newSelection)
      onSelectionChange?.(newSelection)
            } else {
      // 否则，只选择新的活动单元格
      const newSelection = [{ row: newRow, col: newCol }]
      setSelectedCells(newSelection)
      onSelectionChange?.(newSelection)
    }
  }
  
  // 检查单元格是否被选中
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col)
  }
  
  // 检查单元格是否是活动单元格
  const isActiveCell = (row: number, col: number) => {
    return activeCell?.row === row && activeCell?.col === col
  }
  
  // 处理批量单元格更新
  const handleCellsUpdate = (cells: { row: number, col: number, value: string }[]) => {
    if (cells.length === 0) return
    
    // 保存当前状态到历史记录
    saveToHistory(localData);
    
    // 创建新的数据副本
    const newData = { ...localData }
    newData.rows = [...newData.rows]
    
    // 创建已修改行的集合
    const modifiedRows = new Set<number>()
    
    // 更新单元格
    cells.forEach(cell => {
      if (cell.row >= 0 && cell.row < newData.rows.length && 
          cell.col >= 0 && cell.col < newData.headers.length) {
        
        // 如果这一行还没有被修改过，创建它的副本
        if (!modifiedRows.has(cell.row)) {
          newData.rows[cell.row] = [...newData.rows[cell.row]]
          modifiedRows.add(cell.row)
        }
        
        // 更新单元格值
        newData.rows[cell.row][cell.col] = cell.value
        
        // 触发单元格变更回调
        onCellChange?.(cell.row, cell.col, cell.value)
      }
    })
    
    // 更新本地数据并触发数据变更回调
    setLocalData(newData)
    onDataChange?.(newData)
  }
  
  // 清除鼠标事件处理器引用
  const clearMouseHandlers = () => {
    if (mouseMoveHandlerRef.current) {
      clearInterval(mouseMoveHandlerRef.current)
      mouseMoveHandlerRef.current = null
    }
    
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // 重置拖拽状态
    setCanStartDragging(false)
    setInitialClickCell(null)
    setIsMouseDown(false)
  }
  
  // 组件卸载时清除事件处理器
  useEffect(() => {
    return () => {
      clearMouseHandlers()
    }
  }, [])
  
  // 处理鼠标按下事件，阻止默认行为
  const handleMouseDown = (event: React.MouseEvent) => {
    // 阻止默认的文本选择和复制行为
    event.preventDefault();
  };
  
  // 保存当前状态到历史记录
  const saveToHistory = (currentData: CSVData) => {
    
    // 创建当前数据的深拷贝
    const dataCopy: CSVData = {
      headers: [...currentData.headers],
      rows: currentData.rows.map(row => [...row])
    };
    
    // 添加到历史记录，并限制历史记录大小
    setHistory(prev => {
      const newHistory = [dataCopy, ...prev];
      
      return newHistory.slice(0, MAX_HISTORY_SIZE);
    });
  };

  // 列操作函数
  const insertColumn = (index: number, position: 'before' | 'after' = 'after') => {
    saveToHistory(localData);
    
    const insertIndex = position === 'before' ? index : index + 1;
    const newData = { ...localData };
    
    // 插入新列头
    newData.headers = [
      ...newData.headers.slice(0, insertIndex),
      `新列${insertIndex + 1}`,
      ...newData.headers.slice(insertIndex)
    ];
    
    // 为每行插入新的空单元格
    newData.rows = newData.rows.map(row => [
      ...row.slice(0, insertIndex),
      '',
      ...row.slice(insertIndex)
    ]);
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  const deleteColumn = (index: number) => {
    if (localData.headers.length <= 1) return; // 至少保留一列
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    
    // 删除列头
    newData.headers = newData.headers.filter((_, i) => i !== index);
    
    // 删除每行对应的单元格
    newData.rows = newData.rows.map(row => row.filter((_, i) => i !== index));
    
    setLocalData(newData);
    onDataChange?.(newData);
    
    // 清除选择状态
    setSelectedCells([]);
    setActiveCell(null);
  };

  const duplicateColumn = (index: number) => {
    saveToHistory(localData);
    
    const newData = { ...localData };
    
    // 复制列头
    const originalHeader = newData.headers[index];
    newData.headers = [
      ...newData.headers.slice(0, index + 1),
      `${originalHeader}_副本`,
      ...newData.headers.slice(index + 1)
    ];
    
    // 复制每行对应的单元格
    newData.rows = newData.rows.map(row => [
      ...row.slice(0, index + 1),
      row[index] || '',
      ...row.slice(index + 1)
    ]);
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  const moveColumn = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= localData.headers.length) return;
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    
    // 交换列头
    [newData.headers[fromIndex], newData.headers[toIndex]] = 
    [newData.headers[toIndex], newData.headers[fromIndex]];
    
    // 交换每行对应的单元格
    newData.rows = newData.rows.map(row => {
      const newRow = [...row];
      [newRow[fromIndex], newRow[toIndex]] = [newRow[toIndex], newRow[fromIndex]];
      return newRow;
    });
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  // 行操作函数
  const insertRow = (index: number, position: 'before' | 'after' = 'after') => {
    saveToHistory(localData);
    
    const insertIndex = position === 'before' ? index : index + 1;
    const newData = { ...localData };
    
    // 创建新的空行
    const newRow = new Array(newData.headers.length).fill('');
    
    newData.rows = [
      ...newData.rows.slice(0, insertIndex),
      newRow,
      ...newData.rows.slice(insertIndex)
    ];
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  const deleteRow = (index: number) => {
    if (localData.rows.length <= 1) return; // 至少保留一行
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    newData.rows = newData.rows.filter((_, i) => i !== index);
    
    setLocalData(newData);
    onDataChange?.(newData);
    
    // 清除选择状态
    setSelectedCells([]);
    setActiveCell(null);
  };

  const duplicateRow = (index: number) => {
    saveToHistory(localData);
    
    const newData = { ...localData };
    const rowToDuplicate = [...newData.rows[index]];
    
    newData.rows = [
      ...newData.rows.slice(0, index + 1),
      rowToDuplicate,
      ...newData.rows.slice(index + 1)
    ];
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  const moveRow = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    
    if (toIndex < 0 || toIndex >= localData.rows.length) return;
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    [newData.rows[fromIndex], newData.rows[toIndex]] = 
    [newData.rows[toIndex], newData.rows[fromIndex]];
    
    setLocalData(newData);
    onDataChange?.(newData);
  };

  // 行选择相关函数
  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (checked) {
      newSelectedRows.add(rowIndex);
    } else {
      newSelectedRows.delete(rowIndex);
    }
    setSelectedRows(newSelectedRows);
    
    // 更新全选状态
    setIsAllRowsSelected(newSelectedRows.size === localData.rows.length);
  };

  const handleSelectAllRows = useCallback((checked: boolean) => {
    // 使用requestAnimationFrame确保DOM更新完成后再处理状态
    requestAnimationFrame(() => {
      if (checked) {
        const allRows = new Set(Array.from({ length: localData.rows.length }, (_, i) => i));
        setSelectedRows(allRows);
        setIsAllRowsSelected(true);
      } else {
        setSelectedRows(new Set());
        setIsAllRowsSelected(false);
      }
      
      // 确保滚动容器正确更新
      setTimeout(() => {
        const scrollArea = document.querySelector('.tmdb-table .scroll-area-viewport');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollTop; // 触发重新计算
        }
      }, 0);
    });
  }, [localData.rows.length]);

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    if (localData.rows.length - selectedRows.size < 1) {
      // 至少保留一行
      return;
    }
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    const sortedIndices = Array.from(selectedRows).sort((a, b) => b - a); // 从大到小排序，避免索引问题
    
    sortedIndices.forEach(index => {
      newData.rows.splice(index, 1);
    });
    
    setLocalData(newData);
    onDataChange?.(newData);
    
    // 清除选择状态
    setSelectedRows(new Set());
    setIsAllRowsSelected(false);
    setSelectedCells([]);
    setActiveCell(null);
  };

  const duplicateSelectedRows = () => {
    if (selectedRows.size === 0) return;
    
    saveToHistory(localData);
    
    const newData = { ...localData };
    const sortedIndices = Array.from(selectedRows).sort((a, b) => a - b); // 从小到大排序
    
    // 从后往前插入，避免索引问题
    for (let i = sortedIndices.length - 1; i >= 0; i--) {
      const index = sortedIndices[i];
      const rowToDuplicate = [...newData.rows[index]];
      newData.rows.splice(index + 1, 0, rowToDuplicate);
    }
    
    setLocalData(newData);
    onDataChange?.(newData);
    
    // 清除选择状态
    setSelectedRows(new Set());
    setIsAllRowsSelected(false);
  };
  
  // 如果没有数据，显示空表格
  if (!localData || !localData.headers || !localData.rows) {
    return (
      <div className={cn("tmdb-table-empty", className)}>
        <p className="text-center p-4">无数据</p>
      </div>
    )
  }
  
  return (
    <TableContextMenu
        selectedCells={selectedCells}
      data={localData}
      onCellsUpdate={handleCellsUpdate}
        onCopy={handleCopy}
      onCut={handleCut}
        onPaste={handlePaste}
      onDelete={handleDeleteSelectedCells}
      onInsertRow={insertRow}
      onDeleteRow={deleteRow}
      onInsertColumn={insertColumn}
      onDeleteColumn={deleteColumn}
      onDuplicateRow={duplicateRow}
      onDuplicateColumn={duplicateColumn}
    >
      <div 
        className={cn(
          "tmdb-table", 
          className,
          isAllRowsSelected && "selecting-all"
        )} 
        ref={tableRef}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onSelect={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
      >
        {/* 批量操作工具栏 */}
        {selectedRows.size > 0 && (
          <div className="mb-2 bg-background border rounded-lg shadow-sm p-2 flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              已选择 {selectedRows.size} 行
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={duplicateSelectedRows}
              className="h-7 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              复制
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelectedRows}
              disabled={localData.rows.length - selectedRows.size < 1}
              className="h-7 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              删除
            </Button>
          </div>
        )}

        {/* 测试按钮，仅用于开发调试 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 right-2 z-50">
            <button
              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded"
              onClick={() => {
                
                // 内联撤销函数
                if (history.length === 0) {
                  
                  return;
                }

                // 获取最近的历史记录
                const prevData = history[0];
                
                // 从历史记录中移除该记录并恢复数据
                setHistory(prev => prev.slice(1));
                setLocalData(prevData);
                onDataChange?.(prevData);

              }}
            >
              撤销(测试)
            </button>
          </div>
        )}
        
        <ScrollArea className="h-full w-full scroll-area-viewport">
          <div className="relative w-fit min-w-full" style={{ paddingBottom: '1px' }}>
            <Table>
            <TableHeader>
                <TableRow>
                  {/* 行号列头 */}
                  {showRowNumbers && (
                    <TableHead className="w-16 text-center bg-muted/50 sticky left-0 z-10">
                      <div className="flex items-center justify-center space-x-1">
                        <input
                          type="checkbox"
                          checked={isAllRowsSelected}
                          onChange={(e) => handleSelectAllRows(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">#</span>
                      </div>
                    </TableHead>
                  )}
                  
                  {localData.headers.map((header, index) => (
                    <TableHead 
                      key={index}
                      style={{ 
                        width: columnWidths[index], 
                        minWidth: columnWidths[index] 
                      }}
                      data-column={header.toLowerCase().replace(/\s+/g, '_')}
                      className="relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{header}</span>
                        
                        {/* 列操作按钮 */}
                        {showColumnOperations && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => insertColumn(index, 'before')}>
                                <Plus className="mr-2 h-4 w-4" />
                                在左侧插入列
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => insertColumn(index, 'after')}>
                                <Plus className="mr-2 h-4 w-4" />
                                在右侧插入列
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateColumn(index)}>
                                <Copy className="mr-2 h-4 w-4" />
                                复制列
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => moveColumn(index, 'left')}
                                disabled={index === 0}
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                左移
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => moveColumn(index, 'right')}
                                disabled={index === localData.headers.length - 1}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                右移
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteColumn(index)}
                                disabled={localData.headers.length <= 1}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除列
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableHead>
              ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {localData.rows.map((row, rowIndex) => (
                          <TableRow
                    key={rowIndex}
                    style={{ height: rowHeight }}
                    className="group"
                  >
                    {/* 行号和行操作 */}
                    {showRowNumbers && (
                      <TableCell className="w-16 text-center bg-muted/50 sticky left-0 z-10 border-r">
                        <div className="flex items-center justify-center space-x-1">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowIndex)}
                            onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
                          
                          {/* 行操作按钮 */}
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
                                <DropdownMenuItem onClick={() => insertRow(rowIndex, 'before')}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  在上方插入行
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => insertRow(rowIndex, 'after')}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  在下方插入行
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateRow(rowIndex)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  复制行
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => moveRow(rowIndex, 'up')}
                                  disabled={rowIndex === 0}
                                >
                                  <ArrowUp className="mr-2 h-4 w-4" />
                                  上移
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => moveRow(rowIndex, 'down')}
                                  disabled={rowIndex === localData.rows.length - 1}
                                >
                                  <ArrowDown className="mr-2 h-4 w-4" />
                                  下移
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteRow(rowIndex)}
                                  disabled={localData.rows.length <= 1}
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
                    
                    {row.map((cell, colIndex) => (
                              <TableCell 
                        key={colIndex}
                        className={cn(
                          isCellSelected(rowIndex, colIndex) && "bg-primary/20",
                          isActiveCell(rowIndex, colIndex) && "ring-2 ring-primary",
                          isDragging && canStartDragging && dragStart?.row === rowIndex && dragStart?.col === colIndex && "cursor-crosshair",
                          isShiftSelecting && "cursor-crosshair",
                          canStartDragging && isDragging && "cursor-crosshair",
                          "relative select-none group/cell" // 添加select-none类以防止文本选择
                        )}
                        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                        onDoubleClick={(e) => handleCellDoubleClick(rowIndex, colIndex, e)}
                        onMouseMove={(e) => handleMouseMove(rowIndex, colIndex, e)}
                        onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                        data-column={localData.headers[colIndex].toLowerCase().replace(/\s+/g, '_')}
                      >
                        <div className="relative w-full h-full">
                          {isEditing && editCell?.row === rowIndex && editCell?.col === colIndex ? (
                            <input
                              ref={editInputRef}
                              className="w-full h-full p-1 border border-primary rounded focus:ring-2 focus:ring-primary/50 focus:outline-none bg-background"
                              value={editCell.value}
                              onChange={handleEditInputChange}
                              onKeyDown={handleEditInputKeyDown}
                              onBlur={finishEditing}
                            />
                          ) : (
                            <>
                              <div className="truncate pr-6">{cell}</div>
                              {/* 单元格编辑按钮 */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(rowIndex, colIndex);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </>
                        )}
                        </div>
                  </TableCell>
                  ))}
                </TableRow>
                ))}
            </TableBody>
          </Table>
      </div>
        </ScrollArea>
        </div>
    </TableContextMenu>
  )
}

// 使用React.memo优化性能，避免不必要的重新渲染
export const TMDBTable = React.memo(TMDBTableComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data === nextProps.data &&
    prevProps.className === nextProps.className &&
    prevProps.enableColumnResizing === nextProps.enableColumnResizing &&
    prevProps.enableColumnReordering === nextProps.enableColumnReordering &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.showRowNumbers === nextProps.showRowNumbers &&
    prevProps.showColumnOperations === nextProps.showColumnOperations &&
    prevProps.showRowOperations === nextProps.showRowOperations
  )
})

TMDBTable.displayName = 'TMDBTable'
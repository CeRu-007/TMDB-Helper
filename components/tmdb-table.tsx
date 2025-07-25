"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import TableContextMenu from "./table-context-menu"

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
const DEBOUNCE_DELAY = 10; // 鼠标移动防抖延迟，单位毫秒

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
export function TMDBTable({
  data,
  className,
  enableColumnResizing = true,
  enableColumnReordering = true,
  rowHeight,
  onCellChange,
  onSelectionChange,
  onDataChange
}: TMDBTableProps) {
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
  // 长按激活时间（毫秒）- 增加到500ms以提供更明显的长按感知
  const LONG_PRESS_DELAY = 500
  // 记录初始点击的单元格位置
  const [initialClickCell, setInitialClickCell] = useState<{ row: number, col: number } | null>(null)
  
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
  
  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        console.log('检测到Ctrl+Z按键');
        
        // 内联撤销函数，避免依赖问题
        if (history.length === 0) {
          console.log('没有历史记录可撤销');
          return;
        }
        
        console.log('执行撤销操作，当前历史记录数量:', history.length);
        
        // 获取最近的历史记录
        const prevData = history[0];
        
        // 从历史记录中移除该记录并恢复数据
        setHistory(prev => prev.slice(1));
        setLocalData(prevData);
        onDataChange?.(prevData);
        
        console.log('撤销完成，恢复到历史记录:', prevData);
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
  }, [selectedCells, activeCell, isEditing, localData, isDragging, isShiftSelecting, history])
  
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
    // 普通点击，选择单个单元格
    else {
      const newSelection = [{ row, col }]
      setSelectedCells(newSelection)
      onSelectionChange?.(newSelection)
      
      // 记录初始点击的单元格位置
      setInitialClickCell(newSelection[0])
      
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
      if (selectedCells.length !== selectionSize) {
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
    [mouseDownPosition, isDragging, dragStart, isShiftSelecting, canStartDragging, isMouseDown, selectedCells.length]
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
    if (editCell) {
      // 保存当前状态到历史记录
      saveToHistory(localData);
      
      // 更新数据
      const newData = { ...localData }
      newData.rows = [...newData.rows]
      newData.rows[editCell.row] = [...newData.rows[editCell.row]]
      newData.rows[editCell.row][editCell.col] = editCell.value
      
      setLocalData(newData)
      onCellChange?.(editCell.row, editCell.col, editCell.value)
      onDataChange?.(newData)
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
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
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
      console.log('数据已复制到剪贴板')
    } catch (err) {
      console.error('复制到剪贴板失败:', err)
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
      console.error('粘贴操作失败:', err)
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
    console.log('准备保存历史记录');
    
    // 创建当前数据的深拷贝
    const dataCopy: CSVData = {
      headers: [...currentData.headers],
      rows: currentData.rows.map(row => [...row])
    };
    
    // 添加到历史记录，并限制历史记录大小
    setHistory(prev => {
      const newHistory = [dataCopy, ...prev];
      console.log('历史记录已保存，当前历史记录数量:', newHistory.length);
      return newHistory.slice(0, MAX_HISTORY_SIZE);
    });
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
    >
      <div 
        className={cn("tmdb-table", className)} 
        ref={tableRef}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onSelect={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
      >
        {/* 测试按钮，仅用于开发调试 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 right-2 z-50">
            <button
              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded"
              onClick={() => {
                console.log('手动触发撤销操作');
                // 内联撤销函数
                if (history.length === 0) {
                  console.log('没有历史记录可撤销');
                  return;
                }
                
                console.log('执行撤销操作，当前历史记录数量:', history.length);
                
                // 获取最近的历史记录
                const prevData = history[0];
                
                // 从历史记录中移除该记录并恢复数据
                setHistory(prev => prev.slice(1));
                setLocalData(prevData);
                onDataChange?.(prevData);
                
                console.log('撤销完成，恢复到历史记录:', prevData);
              }}
            >
              撤销(测试)
            </button>
          </div>
        )}
        
        <ScrollArea className="h-full w-full">
          <div className="relative w-fit min-w-full">
            <Table>
            <TableHeader>
                <TableRow>
                  {localData.headers.map((header, index) => (
                    <TableHead 
                      key={index}
                      style={{ 
                        width: columnWidths[index], 
                        minWidth: columnWidths[index] 
                      }}
                      data-column={header.toLowerCase().replace(/\s+/g, '_')}
                    >
                      {header}
                    </TableHead>
              ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {localData.rows.map((row, rowIndex) => (
                          <TableRow
                    key={rowIndex}
                    style={{ height: rowHeight }}
                  >
                    {row.map((cell, colIndex) => (
                              <TableCell 
                        key={colIndex}
                        className={cn(
                          isCellSelected(rowIndex, colIndex) && "bg-primary/20",
                          isActiveCell(rowIndex, colIndex) && "ring-2 ring-primary",
                          isDragging && canStartDragging && dragStart?.row === rowIndex && dragStart?.col === colIndex && "cursor-crosshair",
                          isShiftSelecting && "cursor-crosshair",
                          canStartDragging && isDragging && "cursor-crosshair",
                          "relative select-none" // 添加select-none类以防止文本选择
                        )}
                        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                        onDoubleClick={(e) => handleCellDoubleClick(rowIndex, colIndex, e)}
                        onMouseMove={(e) => handleMouseMove(rowIndex, colIndex, e)}
                        onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                        data-column={localData.headers[colIndex].toLowerCase().replace(/\s+/g, '_')}
                      >
                        {isEditing && editCell?.row === rowIndex && editCell?.col === colIndex ? (
                          <input
                            ref={editInputRef}
                            className="w-full h-full p-0 border-0 focus:ring-0 focus:outline-none bg-transparent"
                            value={editCell.value}
                            onChange={handleEditInputChange}
                            onKeyDown={handleEditInputKeyDown}
                            onBlur={finishEditing}
                          />
                        ) : (
                          cell
                      )}
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
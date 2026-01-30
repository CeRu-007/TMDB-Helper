"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Info, Search, Zap, Wand2, MousePointer, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BatchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onSave: (value: string) => void
  onBatchSave?: (matchInfo: { pattern: string, replaceWith: string, affectedRows: number[] }) => void
  allColumnData?: { rowIndex: number, value: string }[]
  currentRowIndex?: number
  columnName?: string
}

interface DuplicatePattern {
  pattern: string
  count: number
  occurrences: number[]
}

type ViewMode = 'edit' | 'batch-auto' | 'batch-manual'
type ManualMatchMode = 'text' | 'position'

type TextSelection = { start: number, end: number, text: string }

// 通用的文本高亮渲染函数
function renderHighlightedText(
  text: string,
  matchText: string,
  matchType: 'prefix' | 'suffix' | 'text' | 'position' = 'text',
  selection?: TextSelection
): React.ReactNode {
  if (!text) return text
  if (!matchText && matchType !== 'position') return text

  let before = ''
  let match = ''
  let after = ''

  switch (matchType) {
    case 'prefix':
      if (text.startsWith(matchText)) {
        match = matchText
        after = text.substring(matchText.length)
      } else {
        return text
      }
      break

    case 'suffix':
      if (text.endsWith(matchText)) {
        before = text.substring(0, text.length - matchText.length)
        match = matchText
      } else {
        return text
      }
      break

    case 'text':
      const index = text.indexOf(matchText)
      if (index === -1) return text
      before = text.substring(0, index)
      match = matchText
      after = text.substring(index + matchText.length)
      break

    case 'position':
      if (!selection) return text
      const { start, end } = selection
      if (start >= end || end > text.length) return text
      before = text.substring(0, start)
      match = text.substring(start, end)
      after = text.substring(end)
      break
  }

  const highlightClass = "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through decoration-red-500 decoration-2 px-0.5 rounded"

  return (
    <>
      {before}
      <span className={highlightClass}>
        {match}
      </span>
      {after}
    </>
  )
}

export default function BatchEditDialog({
  open,
  onOpenChange,
  value,
  onSave,
  onBatchSave,
  allColumnData = [],
  currentRowIndex = -1,
  columnName = "内容"
}: BatchEditDialogProps) {
  const [editValue, setEditValue] = useState(value)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [selectedPattern, setSelectedPattern] = useState<DuplicatePattern | null>(null)
  const [manualSelection, setManualSelection] = useState<{ start: number, end: number, text: string } | null>(null)
  const [manualMatchMode, setManualMatchMode] = useState<ManualMatchMode>('text')
  const [replaceWith, setReplaceWith] = useState("")
  const [affectedRows, setAffectedRows] = useState<number[]>([])

  // 当对话框打开时，更新编辑值
  useEffect(() => {
    if (open) {
      setEditValue(value)
      setViewMode('edit')
      setSelectedPattern(null)
      setManualSelection(null)
      setManualMatchMode('text')
      setReplaceWith("")
      setAffectedRows([])
    }
  }, [open, value])

  // 计算受影响的行
  const affectedRowsMap = useMemo(() => {
    const result = {
      auto: [] as number[],
      manualText: [] as number[],
      manualPosition: [] as number[]
    }

    // 自动模式：匹配前缀或后缀
    if (selectedPattern) {
      result.auto = allColumnData
        .filter(({ value }) => value && (
          value.endsWith(selectedPattern.pattern) ||
          value.startsWith(selectedPattern.pattern)
        ))
        .map(({ rowIndex }) => rowIndex)
    }

    // 手动模式
    if (manualSelection) {
      // 文本匹配
      result.manualText = allColumnData
        .filter(({ value }) => value && value.includes(manualSelection.text))
        .map(({ rowIndex }) => rowIndex)

      // 位置匹配
      const { start, end } = manualSelection
      result.manualPosition = allColumnData
        .filter(({ value }) => value && start < end && end <= value.length)
        .map(({ rowIndex }) => rowIndex)
    }

    return result
  }, [selectedPattern, manualSelection, allColumnData])

  const autoAffectedRows = affectedRowsMap.auto
  const manualTextAffectedRows = affectedRowsMap.manualText
  const manualPositionAffectedRows = affectedRowsMap.manualPosition

  // 获取当前受影响的行
  const currentAffectedRows = useMemo(() => {
    if (viewMode === 'batch-auto') return autoAffectedRows
    if (viewMode === 'batch-manual') {
      return manualMatchMode === 'text' ? manualTextAffectedRows : manualPositionAffectedRows
    }
    return []
  }, [viewMode, manualMatchMode, autoAffectedRows, manualTextAffectedRows, manualPositionAffectedRows])

  // 更新受影响的行
  useEffect(() => {
    setAffectedRows(currentAffectedRows)
  }, [currentAffectedRows])

  // 检测重复模式 - 查找在多个文本中出现的前缀或后缀
  const duplicatePatterns = useMemo(() => {
    if (viewMode === 'edit' || allColumnData.length === 0) {
      return []
    }

    const patterns = new Map<string, DuplicatePattern>()

    // 收集所有可能的模式
    allColumnData.forEach(({ value: text }) => {
      if (!text || text.length < 5) return

      const minLength = 3
      const maxLength = Math.min(100, text.length)

      for (let len = minLength; len <= maxLength; len++) {
        // 检测后缀
        const suffix = text.slice(-len)
        if (suffix.trim()) addPattern(suffix, patterns, allColumnData, 'ends')

        // 检测前缀
        const prefix = text.slice(0, len)
        if (prefix.trim()) addPattern(prefix, patterns, allColumnData, 'starts')
      }
    })

    return Array.from(patterns.values())
      .filter(p => p.count >= 2)
      .sort((a, b) => {
        // 优先按出现次数排序，其次按模式长度排序
        if (b.count !== a.count) return b.count - a.count
        return b.pattern.length - a.pattern.length
      })
      .slice(0, 15)
  }, [viewMode, allColumnData, currentRowIndex])

  // 辅助函数：添加模式到集合
  function addPattern(
    pattern: string,
    patterns: Map<string, DuplicatePattern>,
    data: { rowIndex: number, value: string }[],
    matchType: 'starts' | 'ends'
  ) {
    let count = 0
    const occurrences: number[] = []

    data.forEach(({ rowIndex, value }) => {
      if (value && (matchType === 'starts' ? value.startsWith(pattern) : value.endsWith(pattern))) {
        count++
        occurrences.push(rowIndex)
      }
    })

    if (count >= 2) {
      patterns.set(pattern, {
        pattern,
        count,
        occurrences
      })
    }
  }

  const handleSave = () => {
    if (viewMode !== 'edit' && affectedRows.length > 0 && onBatchSave) {
      const pattern = viewMode === 'batch-auto' ? selectedPattern?.pattern : manualSelection?.text || ''
      onBatchSave({
        pattern: pattern,
        replaceWith: replaceWith,
        affectedRows
      })
    } else {
      onSave(editValue)
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handlePatternSelect = (pattern: DuplicatePattern) => {
    setSelectedPattern(pattern)
    setReplaceWith("")
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      if (selectedText) {
        const container = document.getElementById('manualSelectTextarea')
        if (container && container.contains(range.commonAncestorContainer)) {
          const textContent = container.innerText || ''
          const start = textContent.indexOf(selectedText)
          if (start !== -1) {
            setManualSelection({ start, end: start + selectedText.length, text: selectedText })
          }
        }
      }
    }
  }

  const isBatchMode = viewMode !== 'edit'
  const currentAffectedCount = currentAffectedRows.length

  // 获取预览数据 - 只返回受影响的行数据
  const previewData = useMemo(() => {
    if (!isBatchMode || currentAffectedRows.length === 0) return []

    return allColumnData
      .filter(({ rowIndex }) => currentAffectedRows.includes(rowIndex))
      .slice(0, 10)
  }, [isBatchMode, currentAffectedRows, allColumnData])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* 头部 */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">编辑{columnName}</DialogTitle>
          <DialogDescription className="text-sm">
            {isBatchMode ? `批量修改${columnName}内容` : `编辑当前词条的${columnName}内容`}
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换栏 - 放在顶部作为主导航 */}
        {allColumnData.length > 1 && (
          <div className="px-6 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setViewMode('edit')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'edit'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Zap className="h-4 w-4" />
                普通编辑
              </button>
              <button
                onClick={() => setViewMode('batch-auto')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'batch-auto'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Wand2 className="h-4 w-4" />
                自动批量
              </button>
              <button
                onClick={() => setViewMode('batch-manual')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  viewMode === 'batch-manual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <MousePointer className="h-4 w-4" />
                手动批量
              </button>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* 普通编辑模式 */}
          {viewMode === 'edit' && (
            <div className="space-y-3">
              <Label htmlFor="contentTextarea" className="text-sm font-medium">
                {columnName}内容
              </Label>
              <Textarea
                id="contentTextarea"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`请输入${columnName}内容...`}
                className="min-h-[250px] resize-none text-sm"
                rows={12}
              />
              <div className="text-xs text-muted-foreground text-right">
                {editValue.length} 个字符
              </div>
            </div>
          )}

          {/* 自动批量模式 */}
          {viewMode === 'batch-auto' && (
            <div className="space-y-4">
              {duplicatePatterns.length > 0 ? (
                <>
                  <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                      检测到 {duplicatePatterns.length} 个重复模式，选择一个进行批量替换
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">选择重复模式</Label>
                    <ScrollArea className="h-[180px] border rounded-lg">
                      <div className="p-2 space-y-1">
                        {duplicatePatterns.map((pattern, index) => (
                          <button
                            key={index}
                            onClick={() => handlePatternSelect(pattern)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-md text-left transition-all",
                              selectedPattern?.pattern === pattern.pattern
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 hover:bg-muted'
                            )}
                          >
                            <span className="text-sm font-mono truncate flex-1 mr-3">
                              {pattern.pattern.length > 50
                                ? pattern.pattern.slice(0, 50) + '...'
                                : pattern.pattern}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full shrink-0",
                              selectedPattern?.pattern === pattern.pattern
                                ? 'bg-primary-foreground/20'
                                : 'bg-background'
                            )}>
                              {pattern.count} 条
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {selectedPattern && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">将选中的内容替换为：</span>
                        <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through decoration-red-500 decoration-2 px-2 py-0.5 rounded text-xs">
                          {selectedPattern.pattern.length > 30
                            ? selectedPattern.pattern.slice(0, 30) + '...'
                            : selectedPattern.pattern}
                        </span>
                      </div>
                      <Textarea
                        value={replaceWith}
                        onChange={(e) => setReplaceWith(e.target.value)}
                        placeholder="输入替换内容（留空表示删除）"
                        className="resize-none text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">未检测到重复模式</p>
                  <p className="text-xs mt-1">所有内容都是唯一的</p>
                </div>
              )}
            </div>
          )}

          {/* 手动批量模式 */}
          {viewMode === 'batch-manual' && (
            <div className="space-y-4">
              <Alert className="bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <MousePointer className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                  在下方文本中划选要删除或替换的内容
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label className="text-sm font-medium">选择要处理的文本</Label>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  id="manualSelectTextarea"
                  onMouseUp={handleTextSelection}
                  onSelect={handleTextSelection}
                  className="min-h-[150px] p-4 bg-muted/30 border rounded-lg whitespace-pre-wrap break-words select-text text-sm leading-relaxed"
                  style={{ cursor: 'text', outline: 'none' }}
                >
                  {manualSelection ? (
                    <>
                      {value.substring(0, manualSelection.start)}
                      <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">{value.substring(manualSelection.start, manualSelection.end)}</mark>
                      {value.substring(manualSelection.end)}
                    </>
                  ) : (
                    value
                  )}
                </div>
                {manualSelection && (
                  <p className="text-xs text-muted-foreground">
                    已选择: "{manualSelection.text.length > 30 ? manualSelection.text.slice(0, 30) + '...' : manualSelection.text}"
                  </p>
                )}
              </div>

              {manualSelection && (
                <div className="space-y-3 pt-2 border-t">
                  {/* 匹配模式切换 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">匹配模式</Label>
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                      <button
                        onClick={() => setManualMatchMode('text')}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                          manualMatchMode === 'text'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        )}
                      >
                        匹配相同文本
                      </button>
                      <button
                        onClick={() => setManualMatchMode('position')}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                          manualMatchMode === 'position'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        )}
                      >
                        匹配相同位置
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">将选中的内容替换为：</span>
                    <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 line-through decoration-red-500 decoration-2 px-2 py-0.5 rounded text-xs">
                      {manualSelection.text.length > 30
                        ? manualSelection.text.slice(0, 30) + '...'
                        : manualSelection.text}
                    </span>
                  </div>
                  <Textarea
                    value={replaceWith}
                    onChange={(e) => setReplaceWith(e.target.value)}
                    placeholder="输入替换内容（留空表示删除）"
                    className="resize-none text-sm"
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {/* 预览区域 - 只显示一行原文，删除部分划删除线 */}
          {isBatchMode && currentAffectedCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  预览 ({currentAffectedCount} 行将受影响)
                </Label>
              </div>
              <ScrollArea className="h-[200px] border rounded-lg bg-muted/20">
                <div className="p-3 space-y-3">
                  {previewData.map(({ rowIndex, value: text }) => (
                    <div key={rowIndex} className="text-sm">
                      <div className="text-xs text-muted-foreground mb-1">行 {rowIndex + 1}</div>
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {viewMode === 'batch-auto' && selectedPattern
                          ? (() => {
                              // 检查是前缀还是后缀
                              if (text.startsWith(selectedPattern.pattern)) {
                                return renderHighlightedText(text, selectedPattern.pattern, 'prefix')
                              } else if (text.endsWith(selectedPattern.pattern)) {
                                return renderHighlightedText(text, selectedPattern.pattern, 'suffix')
                              }
                              return text
                            })()
                          : viewMode === 'batch-manual' && manualSelection
                            ? manualMatchMode === 'text'
                              ? renderHighlightedText(text, manualSelection.text, 'text')
                              : renderHighlightedText(text, '', 'position', manualSelection)
                            : text
                        }
                      </div>
                    </div>
                  ))}
                  {currentAffectedCount > 10 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      还有 {currentAffectedCount - 10} 行...
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-100 dark:bg-red-900/40 rounded"></span>
                  <span>将被删除/替换</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <DialogFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isBatchMode && currentAffectedCount === 0}
          >
            {isBatchMode ? `批量修改 (${currentAffectedCount})` : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

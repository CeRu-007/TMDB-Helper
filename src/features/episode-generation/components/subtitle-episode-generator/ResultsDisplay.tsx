import React, { useState, useRef, useEffect } from "react"
import {
  Check,
  Copy,
  Edit,
  X,
  ArrowUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Sparkles,
  Wand2
} from "lucide-react"
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/shared/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/shared/components/ui/tooltip"
import { AIImprovementPanel } from './components/AIImprovementPanel'
import { REWRITE_MODE_STYLES } from './constants'
import { ResultsDisplayProps, EnhanceOperation, GenerationResult } from './types'
import { truncateFileName } from './utils'

export function ResultsDisplay({
  results,
  onUpdateResult,
  onMoveToTop,
  onEnhanceContent,
  onAIImprovement,
  aiImprovingIndex
}: ResultsDisplayProps): JSX.Element {
  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingSummary, setEditingSummary] = useState('')

  // Enhancement state
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhancingOperation, setEnhancingOperation] = useState<string | null>(null)
  const [improvementOpenIndex, setImprovementOpenIndex] = useState<number | null>(null)

  // Rewrite state
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [selectionStart, setSelectionStart] = useState<number>(0)
  const [selectionEnd, setSelectionEnd] = useState<number>(0)
  const [isRewritingText, setIsRewritingText] = useState<boolean>(false)

  // Custom selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionHighlight, setSelectionHighlight] = useState<{start: number, end: number} | null>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)

  function handleStartEdit(index: number, result: { generatedTitle: string; generatedSummary: string }): void {
    setEditingIndex(index)
    setEditingTitle(result.generatedTitle)
    setEditingSummary(result.generatedSummary)
  }

  async function handleEnhance(index: number, operation: EnhanceOperation): Promise<void> {
    if (enhancingIndex !== null) return

    setEnhancingIndex(index)
    setEnhancingOperation(operation)

    try {
      await onEnhanceContent?.(index, operation)
    } finally {
      setEnhancingIndex(null)
      setEnhancingOperation(null)
    }
  }

  // Text selection utilities
  function getTextNodeAtPosition(container: Element, offset: number): {node: Text, offset: number} | null {
    let currentOffset = 0
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node = walker.nextNode() as Text
    while (node) {
      const nodeLength = node.textContent?.length || 0
      if (currentOffset + nodeLength >= offset) {
        return { node, offset: offset - currentOffset }
      }
      currentOffset += nodeLength
      node = walker.nextNode() as Text
    }

    return null
  }

  function getOffsetFromTextNode(container: Element, targetNode: Node, targetOffset: number): number {
    let offset = 0

    try {
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )

      let node = walker.nextNode()
      while (node) {
        if (node === targetNode) {
          return offset + targetOffset
        }
        offset += node.textContent?.length || 0
        node = walker.nextNode()
      }

      // Fallback handling for different node types
      if (targetNode.nodeType === Node.TEXT_NODE) {
        return offset + targetOffset
      }

      // For element nodes, calculate offset to element
      const textContent = container.textContent || ''
      const nodeText = targetNode.textContent || ''
      const nodeIndex = textContent.indexOf(nodeText)
      return nodeIndex >= 0 ? nodeIndex + targetOffset : offset
    } catch (error) {
      logger.error('计算偏移量错误:', error)
      return 0
    }
  }

  function handleCustomMouseDown(e: React.MouseEvent, index: number): void {
    if (rewritingIndex !== index) return

    e.preventDefault()
    e.stopPropagation()

    // Initialize selection state
    setIsSelecting(true)
    setSelectionHighlight(null)
    setSelectedText('')

    // Clear browser selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }

    const container = textContainerRef.current
    if (!container) return

    const { clientX: startX, clientY: startY } = e
    let startOffset = 0

    // Calculate start position
    startOffset = calculateTextPosition(container, startX, startY)

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      moveEvent.preventDefault()
      moveEvent.stopPropagation()

      const endOffset = calculateTextPosition(container, moveEvent.clientX, moveEvent.clientY)
      updateSelection(startOffset, endOffset, container)
    }

    const handleMouseUp = (upEvent: MouseEvent): void => {
      upEvent.preventDefault()
      upEvent.stopPropagation()

      setIsSelecting(false)
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })

      // Ensure browser selection is cleared
      setTimeout(() => {
        window.getSelection()?.removeAllRanges()
      }, 0)
    }

    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false })
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false })
  }

  function calculateTextPosition(container: HTMLElement, x: number, y: number): number {
    try {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y)
        if (range && container.contains(range.startContainer)) {
          return getOffsetFromTextNode(container, range.startContainer, range.startOffset)
        }
      }

      // Fallback: position-based estimation
      const rect = container.getBoundingClientRect()
      const relativeX = x - rect.left
      const relativeY = y - rect.top
      const fullText = container.textContent || ''

      const LINE_HEIGHT = 20
      const CHAR_WIDTH = 8
      const lineIndex = Math.floor(relativeY / LINE_HEIGHT)
      const charIndex = Math.floor(relativeX / CHAR_WIDTH)

      return Math.min(lineIndex * 50 + charIndex, fullText.length)
    } catch (error) {
      logger.error('计算位置错误:', error)
      return 0
    }
  }

  function updateSelection(startOffset: number, endOffset: number, container: HTMLElement): void {
    const start = Math.min(startOffset, endOffset)
    const end = Math.max(startOffset, endOffset)

    if (end > start) {
      const fullText = container.textContent || ''
      const selected = fullText.substring(start, end)

      setSelectionHighlight({ start, end })
      setSelectedText(selected)
      setSelectionStart(start)
      setSelectionEnd(end)
    }
  }

  function handleWordClick(e: React.MouseEvent, text: string): void {
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as HTMLElement
    const clickedText = target.textContent?.trim() || ''

    if (!clickedText) return

    const fullText = text
    const startIndex = fullText.indexOf(clickedText)

    if (startIndex === -1) return

    const endIndex = startIndex + clickedText.length

    setSelectedText(clickedText)
    setSelectionStart(startIndex)
    setSelectionEnd(endIndex)
    setSelectionHighlight({ start: startIndex, end: endIndex })
  }

  function renderTextWithHighlight(text: string, highlight: {start: number, end: number} | null): JSX.Element {
    if (!highlight) {
      // Split text into words for click selection
      const words = text.split(/(\s+)/)
      return (
        <span>
          {words.map((word, index) => (
            <span
              key={index}
              className={word.trim() ? "hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer px-0.5 rounded" : ""}
              onClick={word.trim() ? (e) => handleWordClick(e, text) : undefined}
            >
              {word}
            </span>
          ))}
        </span>
      )
    }

    const before = text.substring(0, highlight.start)
    const selected = text.substring(highlight.start, highlight.end)
    const after = text.substring(highlight.end)

    return (
      <span>
        {before}
        <span className="bg-blue-500 text-white px-1 rounded">{selected}</span>
        {after}
      </span>
    )
  }

  function handleStartRewrite(index: number): void {
    setRewritingIndex(index)
    resetSelectionState()
    document.body.classList.add('rewrite-mode-active')
  }

  function resetSelectionState(): void {
    setSelectedText('')
    setSelectionStart(0)
    setSelectionEnd(0)
    setSelectionHighlight(null)
    setIsSelecting(false)
  }

  // Browser behavior control for rewrite mode
  useEffect(() => {
    if (rewritingIndex === null) return

    // Block browser text selection
    const globalEventBlocker = (event: Event): void => {
      const target = event.target as Element
      const isInsideContainer = textContainerRef.current?.contains(target)

      // Different blocking rules for inside/outside container
      const shouldBlock = isInsideContainer
        ? ['selectstart', 'contextmenu'].includes(event.type)
        : ['selectstart', 'contextmenu', 'copy', 'cut', 'mousedown', 'mouseup'].includes(event.type)

      if (shouldBlock) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    }

    // Register global event blockers
    const eventTypes = ['selectstart', 'contextmenu', 'copy', 'cut', 'mouseup', 'mousedown', 'dragstart', 'drag']
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, globalEventBlocker, {
        capture: true,
        passive: false
      })
      window.addEventListener(eventType, globalEventBlocker, {
        capture: true,
        passive: false
      })
    })

    // ESC key handler
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleCancelRewrite()
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })

    // Cleanup
    return () => {
      eventTypes.forEach(eventType => {
        document.removeEventListener(eventType, globalEventBlocker, { capture: true })
        window.removeEventListener(eventType, globalEventBlocker, { capture: true })
      })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })

      // Clear selection
      try {
        window.getSelection()?.removeAllRanges()
      } catch {
        // Ignore errors
      }
    }
  }, [rewritingIndex])

  function handleCancelRewrite(): void {
    setRewritingIndex(null)
    resetSelectionState()
    document.body.classList.remove('rewrite-mode-active')
    window.getSelection()?.removeAllRanges()
  }

  function handleTextSelection(_index: number): void {
    // Custom selection handles this
    return
  }

  function handleSaveEdit(index: number): void {
    if (!onUpdateResult) return

    onUpdateResult(index, {
      generatedTitle: editingTitle,
      generatedSummary: editingSummary,
      wordCount: editingSummary.length
    })

    resetEditingState()
  }

  async function handleConfirmRewrite(index: number): Promise<void> {
    if (!selectedText.trim()) {
      logger.warn('没有选择要改写的文字')
      return
    }

    if (isRewritingText) return

    setIsRewritingText(true)

    try {
      await onEnhanceContent?.(index, 'rewrite', {
        text: selectedText,
        start: selectionStart,
        end: selectionEnd
      })
    } catch (error) {
      logger.error('改写失败:', error)
    } finally {
      setIsRewritingText(false)
      handleCancelRewrite()
    }
  }

  function handleCancelEdit(): void {
    resetEditingState()
  }

  function resetEditingState(): void {
    setEditingIndex(null)
    setEditingTitle('')
    setEditingSummary('')
  }

  return (
    <div className="h-full overflow-auto">
      {/* 警告提示 */}
      <div className="p-4 pb-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">⚠️ 重要提醒</p>
              <p className="leading-relaxed">
                AI生成的分集简介仅作<strong>辅助作用</strong>，请务必观看对应视频内容审核修改后再使用。
                <strong className="text-amber-900 dark:text-amber-100">禁止直接上传至TMDB</strong>等数据库平台。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {results.map((result, index) => (
          <div
            key={`${result.fileName || 'default'}-${result.episodeNumber}-${index}`}
            className="group border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            {/* 标题行 - 紧凑布局 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {/* 标签组 */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {result.fileName && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 max-w-[140px] cursor-help">
                          <span className="truncate">📁 {truncateFileName(result.fileName, 15)}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm break-all">
                        <p>文件：{result.fileName}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {result.styleName && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                      🎨 {result.styleName}
                    </Badge>
                  )}
                  {index === 0 && (
                    <Badge className="text-xs px-1.5 py-0.5 bg-blue-600 text-white">
                      ⭐ 优先
                    </Badge>
                  )}
                </div>

                {/* 标题 */}
                <div className="flex-1 min-w-0">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full px-2 py-1 text-sm font-medium border border-blue-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                      placeholder="编辑标题..."
                    />
                  ) : (
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.generatedTitle}
                    </h3>
                  )}
                </div>
              </div>

              {/* 右侧信息和操作 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Badge
                  variant={result.confidence > 0.8 ? "default" : result.confidence > 0.6 ? "secondary" : "destructive"}
                  className="text-xs px-1.5 py-0.5"
                >
                  {Math.round(result.confidence * 100)}%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editingIndex === index ? editingSummary.length : result.wordCount}字
                </span>

                {/* 操作按钮 */}
                {editingIndex === index ? (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleSaveEdit(index)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && onMoveToTop && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onMoveToTop(index)}
                        title="置顶"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleStartEdit(index, result)}
                      title="编辑"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        const textToCopy = `标题：${result.generatedTitle}\n\n简介：${result.generatedSummary}`
                        navigator.clipboard.writeText(textToCopy)
                      }}
                      title="复制"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="更多操作"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'polish')}>
                          <Sparkles className="h-3 w-3 mr-2" />
                          润色
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'shorten')}>
                          <Minus className="h-3 w-3 mr-2" />
                          缩写
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'expand')}>
                          <Plus className="h-3 w-3 mr-2" />
                          扩写
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEnhance(index, 'proofread')}>
                          <CheckCircle className="h-3 w-3 mr-2" />
                          纠错
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStartRewrite(index)}>
                          <Edit className="h-3 w-3 mr-2" />
                          改写
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
            {/* 简介内容 - 紧凑显示 */}
            <div className="mb-3">
              {editingIndex === index ? (
                <textarea
                  value={editingSummary}
                  onChange={(e) => setEditingSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="编辑简介内容..."
                />
              ) : rewritingIndex === index ? (
                <div className="relative rewrite-mode-container">
                  <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 请拖拽选择文字或点击单词来选择需要改写的内容 (按ESC键取消)
                  </div>
                  <div
                    ref={textContainerRef}
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed p-2 rounded border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-text select-none"
                    onMouseDown={(e) => handleCustomMouseDown(e, index)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      return false
                    }}
                    style={{
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                      minHeight: '60px',
                      width: '100%'
                    }}
                  >
                    {renderTextWithHighlight(result.generatedSummary, selectionHighlight)}
                  </div>
                  {selectedText && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-xs">
                      <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">已选择文字：</div>
                      <div className="text-yellow-700 dark:text-yellow-300 italic">"{selectedText}"</div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={() => handleConfirmRewrite(index)}
                      disabled={!selectedText || isRewritingText}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {isRewritingText ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>改写中...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          <span>确认改写</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelRewrite}
                      disabled={isRewritingText}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <X className="h-3 w-3" />
                      <span>取消</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {result.generatedSummary}
                </p>
              )}
            </div>

            {/* 底部信息行 */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span>🤖 {result.model.split('/').pop()}</span>
                <span>🕒 {new Date(result.generationTime).toLocaleTimeString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    const newIndex = improvementOpenIndex === index ? null : index
                    setImprovementOpenIndex(newIndex)
                  }}
                  title="与AI改进简介"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  与AI改进
                </Button>
              </div>
              {enhancingIndex === index && (
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">
                    {enhancingOperation === 'polish' && '润色中...'}
                    {enhancingOperation === 'shorten' && '缩写中...'}
                    {enhancingOperation === 'expand' && '扩写中...'}
                    {enhancingOperation === 'proofread' && '纠错中...'}
                  </span>
                </div>
              )}
              {aiImprovingIndex && aiImprovingIndex.resultIndex === index && (
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">AI改进中...</span>
                </div>
              )}
              {rewritingIndex === index && !isRewritingText && (
                <div className="flex items-center space-x-1">
                  <Edit className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">改写模式</span>
                </div>
              )}
            </div>

            {improvementOpenIndex === index && (
              <AIImprovementPanel
                result={result}
                resultIndex={index}
                onUpdateResult={onUpdateResult || (() => {})}
                onClose={() => setImprovementOpenIndex(null)}
                onAIImprovement={onAIImprovement}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = REWRITE_MODE_STYLES
  if (!document.head.querySelector('style[data-rewrite-mode]')) {
    styleElement.setAttribute('data-rewrite-mode', 'true')
    document.head.appendChild(styleElement)
  }
}
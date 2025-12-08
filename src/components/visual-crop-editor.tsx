"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Move, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Info
} from "lucide-react"

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface VisualCropEditorProps {
  imageUrl: string
  imageName: string
  imageWidth: number
  imageHeight: number
  initialCrop?: CropArea
  onCropChange: (crop: CropArea) => void
  onReset: () => void
}

export function VisualCropEditor({
  imageUrl,
  imageName,
  imageWidth,
  imageHeight,
  initialCrop,
  onCropChange,
  onReset
}: VisualCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<string>('')
  const [displayScale, setDisplayScale] = useState(1)
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 })
  
  // 裁切区域状态（相对于原始图片的像素坐标）
  const [cropArea, setCropArea] = useState<CropArea>(
    initialCrop || {
      x: Math.round((imageWidth - (imageHeight * 16/9)) / 2),
      y: 0,
      width: Math.round(imageHeight * 16/9),
      height: imageHeight
    }
  )

  // 计算显示尺寸和缩放比例
  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const container = containerRef.current
      const maxWidth = container.clientWidth - 40 // 留出边距
      const maxHeight = 400 // 最大高度
      
      const scaleX = maxWidth / imageWidth
      const scaleY = maxHeight / imageHeight
      const scale = Math.min(scaleX, scaleY, 1) // 不放大，只缩小
      
      setDisplayScale(scale)
      setImageDisplaySize({
        width: imageWidth * scale,
        height: imageHeight * scale
      })
    }
  }, [imageWidth, imageHeight])

  // 将原始坐标转换为显示坐标
  const toDisplayCoords = useCallback((originalCoords: CropArea) => {
    return {
      x: originalCoords.x * displayScale,
      y: originalCoords.y * displayScale,
      width: originalCoords.width * displayScale,
      height: originalCoords.height * displayScale
    }
  }, [displayScale])

  // 将显示坐标转换为原始坐标
  const toOriginalCoords = useCallback((displayCoords: CropArea) => {
    return {
      x: Math.round(displayCoords.x / displayScale),
      y: Math.round(displayCoords.y / displayScale),
      width: Math.round(displayCoords.width / displayScale),
      height: Math.round(displayCoords.height / displayScale)
    }
  }, [displayScale])

  // 确保裁切区域在图片边界内
  const constrainCropArea = useCallback((crop: CropArea): CropArea => {
    const maxX = imageWidth - crop.width
    const maxY = imageHeight - crop.height
    
    return {
      x: Math.max(0, Math.min(crop.x, maxX)),
      y: Math.max(0, Math.min(crop.y, maxY)),
      width: Math.min(crop.width, imageWidth),
      height: Math.min(crop.height, imageHeight)
    }
  }, [imageWidth, imageHeight])

  // 更新裁切区域
  const updateCropArea = useCallback((newCrop: CropArea) => {
    const constrainedCrop = constrainCropArea(newCrop)
    setCropArea(constrainedCrop)
    onCropChange(constrainedCrop)
  }, [constrainCropArea, onCropChange])

  // 处理鼠标按下事件
  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setDragStart({ x, y })
    
    if (handle) {
      setIsResizing(true)
      setResizeHandle(handle)
    } else {
      setIsDragging(true)
    }
  }, [])

  // 处理鼠标移动事件
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return
    
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    const deltaX = currentX - dragStart.x
    const deltaY = currentY - dragStart.y

    const displayCrop = toDisplayCoords(cropArea)

    if (isDragging) {
      // 移动裁切框
      const newDisplayCrop = {
        ...displayCrop,
        x: displayCrop.x + deltaX,
        y: displayCrop.y + deltaY
      }
      
      const newOriginalCrop = toOriginalCoords(newDisplayCrop)
      updateCropArea(newOriginalCrop)
      
      setDragStart({ x: currentX, y: currentY })
    } else if (isResizing) {
      // 调整裁切框大小（保持16:9比例）
      let newWidth = displayCrop.width
      let newHeight = displayCrop.height
      let newX = displayCrop.x
      let newY = displayCrop.y

      if (resizeHandle.includes('right')) {
        newWidth = displayCrop.width + deltaX
      } else if (resizeHandle.includes('left')) {
        newWidth = displayCrop.width - deltaX
        newX = displayCrop.x + deltaX
      }

      // 保持16:9比例
      newHeight = newWidth / (16/9)
      
      // 调整Y坐标以保持中心点
      if (resizeHandle.includes('top')) {
        newY = displayCrop.y + displayCrop.height - newHeight
      } else if (resizeHandle.includes('bottom')) {
        // Y坐标保持不变
      } else {
        // 居中调整
        newY = displayCrop.y + (displayCrop.height - newHeight) / 2
      }

      const newDisplayCrop = {
        x: newX,
        y: newY,
        width: Math.max(50, newWidth), // 最小宽度
        height: Math.max(50 / (16/9), newHeight) // 最小高度
      }

      const newOriginalCrop = toOriginalCoords(newDisplayCrop)
      updateCropArea(newOriginalCrop)
      
      setDragStart({ x: currentX, y: currentY })
    }
  }, [isDragging, isResizing, dragStart, cropArea, resizeHandle, toDisplayCoords, toOriginalCoords, updateCropArea])

  // 处理鼠标释放事件
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle('')
  }, [])

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // 重置到居中位置
  const handleReset = useCallback(() => {
    const centerX = Math.round((imageWidth - (imageHeight * 16/9)) / 2)
    const defaultCrop = {
      x: Math.max(0, centerX),
      y: 0,
      width: Math.min(Math.round(imageHeight * 16/9), imageWidth),
      height: imageHeight
    }
    
    updateCropArea(defaultCrop)
    onReset()
  }, [imageWidth, imageHeight, updateCropArea, onReset])

  // 获取显示用的裁切区域
  const displayCrop = toDisplayCoords(cropArea)

  return (
    <div className="space-y-4">
      {/* 图片信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{imageName}</h4>
          <p className="text-sm text-muted-foreground">
            原始尺寸: {imageWidth} × {imageHeight}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            裁切区域: {cropArea.width} × {cropArea.height}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* 操作说明 */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">操作说明：</p>
              <ul className="space-y-1 text-xs">
                <li>• 拖拽裁切框移动位置</li>
                <li>• 拖拽四角手柄调整大小（自动保持16:9比例）</li>
                <li>• 点击重置按钮恢复居中位置</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 图片预览和裁切区域 */}
      <div 
        ref={containerRef}
        className="relative flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
      >
        <div className="relative">
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageName}
            className="max-w-full max-h-96 object-contain select-none"
            style={{
              width: imageDisplaySize.width,
              height: imageDisplaySize.height
            }}
            draggable={false}
          />
          
          {/* 裁切框覆盖层 */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 遮罩层 */}
            <div 
              className="absolute inset-0 bg-black/40"
              style={{
                clipPath: `polygon(
                  0% 0%, 
                  0% 100%, 
                  ${displayCrop.x}px 100%, 
                  ${displayCrop.x}px ${displayCrop.y}px, 
                  ${displayCrop.x + displayCrop.width}px ${displayCrop.y}px, 
                  ${displayCrop.x + displayCrop.width}px ${displayCrop.y + displayCrop.height}px, 
                  ${displayCrop.x}px ${displayCrop.y + displayCrop.height}px, 
                  ${displayCrop.x}px 100%, 
                  100% 100%, 
                  100% 0%
                )`
              }}
            />
            
            {/* 裁切框 */}
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-move pointer-events-auto"
              style={{
                left: displayCrop.x,
                top: displayCrop.y,
                width: displayCrop.width,
                height: displayCrop.height
              }}
              onMouseDown={(e) => handleMouseDown(e)}
            >
              {/* 四角调整手柄 */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(handle => (
                <div
                  key={handle}
                  className={`absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize ${
                    handle.includes('top') ? 'top-0' : 'bottom-0'
                  } ${
                    handle.includes('left') ? 'left-0' : 'right-0'
                  } ${
                    handle.includes('top') && handle.includes('left') ? '-translate-x-1/2 -translate-y-1/2' :
                    handle.includes('top') && handle.includes('right') ? 'translate-x-1/2 -translate-y-1/2' :
                    handle.includes('bottom') && handle.includes('left') ? '-translate-x-1/2 translate-y-1/2' :
                    'translate-x-1/2 translate-y-1/2'
                  }`}
                  onMouseDown={(e) => handleMouseDown(e, handle)}
                />
              ))}
              
              {/* 中心移动图标 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg">
                  <Move className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 裁切信息 */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <Label className="text-xs text-muted-foreground">X坐标</Label>
          <p className="font-mono">{cropArea.x}px</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Y坐标</Label>
          <p className="font-mono">{cropArea.y}px</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">宽度</Label>
          <p className="font-mono">{cropArea.width}px</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">高度</Label>
          <p className="font-mono">{cropArea.height}px</p>
        </div>
      </div>
    </div>
  )
}

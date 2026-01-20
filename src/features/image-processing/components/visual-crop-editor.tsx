"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import {
  Move,
  RotateCcw
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
  aspectRatio: number // 宽高比，如 2/3 或 16/9
  initialCrop?: CropArea
  onCropChange: (crop: CropArea) => void
  onReset: () => void
}

export function VisualCropEditor({
  imageUrl,
  imageName,
  imageWidth,
  imageHeight,
  aspectRatio,
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
  const [cropArea, setCropArea] = useState<CropArea>(() => {
    if (initialCrop) {
      return initialCrop
    }

    // 计算默认裁切区域，确保不超出图片边界
    let defaultWidth = Math.round(imageHeight * aspectRatio)
    let defaultHeight = imageHeight
    let defaultX = Math.round((imageWidth - defaultWidth) / 2)
    let defaultY = 0

    // 如果图片宽度小于所需裁切宽度，调整裁切区域
    if (imageWidth < defaultWidth) {
      defaultWidth = imageWidth
      defaultHeight = Math.round(imageWidth / aspectRatio)
      defaultX = 0
      defaultY = Math.round((imageHeight - defaultHeight) / 2)
    }

    // 确保坐标不为负数
    return {
      x: Math.max(0, defaultX),
      y: Math.max(0, defaultY),
      width: Math.max(1, defaultWidth),
      height: Math.max(1, defaultHeight)
    }
  })

  // 计算显示尺寸和缩放比例
  useEffect(() => {
    const calculateDisplaySize = () => {
      if (imageRef.current && containerRef.current) {
        const container = containerRef.current
        const maxWidth = container.clientWidth - 40 // 留出边距
        const maxHeight = Math.max(200, container.clientHeight - 80) // 动态最大高度，最小200px

        const scaleX = maxWidth / imageWidth
        const scaleY = maxHeight / imageHeight
        const scale = Math.min(scaleX, scaleY, 1) // 不放大，只缩小

        setDisplayScale(scale)
        setImageDisplaySize({
          width: imageWidth * scale,
          height: imageHeight * scale
        })
      }
    }

    calculateDisplaySize()

    // 监听窗口大小变化
    window.addEventListener('resize', calculateDisplaySize)
    return () => window.removeEventListener('resize', calculateDisplaySize)
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

  
  // 限制裁切区域在图片范围内
  const constrainCropArea = useCallback((crop: CropArea): CropArea => {
    // 确保裁切框不超过图片尺寸
    const maxWidth = imageWidth
    const maxHeight = imageHeight
    
    // 如果宽度或高度超过图片，调整到最大尺寸
    let width = Math.min(crop.width, maxWidth)
    let height = Math.min(crop.height, maxHeight)
    
    // 如果是固定比例，需要同时调整宽高以保持比例
    if (aspectRatio > 0) {
      if (width / height > aspectRatio) {
        // 宽度太大，以高度为准
        width = height * aspectRatio
      } else {
        // 高度太大，以宽度为准
        height = width / aspectRatio
      }
    }
    
    // 确保位置在有效范围内
    const maxX = Math.max(0, imageWidth - width)
    const maxY = Math.max(0, imageHeight - height)
    
    return {
      x: Math.max(0, Math.min(crop.x, maxX)),
      y: Math.max(0, Math.min(crop.y, maxY)),
      width,
      height
    }
  }, [imageWidth, imageHeight, aspectRatio])

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

    // 直接使用相对于图片的坐标
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

    // 直接使用相对于图片的坐标
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    const deltaX = currentX - dragStart.x
    const deltaY = currentY - dragStart.y

    if (isDragging) {
      // 直接操作原始坐标，更简单直接
      const newOriginalCrop = {
        x: cropArea.x + Math.round(deltaX / displayScale),
        y: cropArea.y + Math.round(deltaY / displayScale),
        width: cropArea.width,
        height: cropArea.height
      }

      updateCropArea(newOriginalCrop)

      // 更新拖拽起始点
      setDragStart({ x: currentX, y: currentY })
    } else if (isResizing) {
      // 调整裁切框大小（保持指定宽高比）
      let newWidth = cropArea.width
      let newHeight = cropArea.height
      let newX = cropArea.x
      let newY = cropArea.y

      // 计算最小尺寸（原始坐标）
      const minSize = Math.max(10, Math.round(50 / displayScale))

      // 根据不同的调整手柄处理
      if (resizeHandle.includes('right')) {
        newWidth = Math.max(minSize, cropArea.width + Math.round(deltaX / displayScale))
      } else if (resizeHandle.includes('left')) {
        newWidth = Math.max(minSize, cropArea.width - Math.round(deltaX / displayScale))
        newX = cropArea.x + cropArea.width - newWidth
      }

      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(minSize / aspectRatio, cropArea.height + Math.round(deltaY / displayScale))
      } else if (resizeHandle.includes('top')) {
        newHeight = Math.max(minSize / aspectRatio, cropArea.height - Math.round(deltaY / displayScale))
        newY = cropArea.y + cropArea.height - newHeight
      }

      // 如果只调整了一个方向，根据比例计算另一个方向
      if (resizeHandle.includes('left') || resizeHandle.includes('right')) {
        // 调整宽度，高度按比例
        newHeight = newWidth / aspectRatio
        // 垂直居中
        newY = cropArea.y + (cropArea.height - newHeight) / 2
      } else if (resizeHandle.includes('top') || resizeHandle.includes('bottom')) {
        // 调整高度，宽度按比例
        newWidth = newHeight * aspectRatio
        // 水平居中
        newX = cropArea.x + (cropArea.width - newWidth) / 2
      }

      const newOriginalCrop = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }

      updateCropArea(newOriginalCrop)

      // 更新拖拽起始点
      setDragStart({ x: currentX, y: currentY })
    }
  }, [isDragging, isResizing, dragStart, cropArea, resizeHandle, aspectRatio, displayScale, updateCropArea])

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
    const centerX = Math.round((imageWidth - (imageHeight * aspectRatio)) / 2)
    const defaultCrop = {
      x: Math.max(0, centerX),
      y: 0,
      width: Math.min(Math.round(imageHeight * aspectRatio), imageWidth),
      height: imageHeight
    }
    
    updateCropArea(defaultCrop)
    onReset()
  }, [imageWidth, imageHeight, aspectRatio, updateCropArea, onReset])

  // 获取显示用的裁切区域
  const displayCrop = toDisplayCoords(cropArea)

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 图片信息 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h4 className="font-medium text-sm">{imageName}</h4>
          <p className="text-xs text-muted-foreground">
            原始尺寸: {imageWidth} × {imageHeight}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            裁切区域: {cropArea.width} × {cropArea.height}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* 图片预览和裁切区域 */}
      <div
        ref={containerRef}
        className="relative flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex-1 overflow-auto"
      >
        <div className="relative flex items-center justify-center min-h-full">
          <div
            ref={imageRef}
            className="relative"
            style={{
              width: imageDisplaySize.width,
              height: imageDisplaySize.height
            }}
          >
            <img
              src={imageUrl}
              alt={imageName}
              className="w-full h-full object-contain select-none"
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
      </div>

      {/* 裁切信息 */}
      <div className="grid grid-cols-4 gap-2 text-xs flex-shrink-0">
        <div>
          <Label className="text-xs text-muted-foreground">X</Label>
          <p className="font-mono">{cropArea.x}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Y</Label>
          <p className="font-mono">{cropArea.y}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">宽</Label>
          <p className="font-mono">{cropArea.width}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">高</Label>
          <p className="font-mono">{cropArea.height}</p>
        </div>
      </div>
    </div>
  )
}

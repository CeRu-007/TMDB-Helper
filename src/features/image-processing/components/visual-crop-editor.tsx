"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { RotateCcw } from "lucide-react"

export interface CropArea {
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
  aspectRatio: number
  initialCrop?: CropArea
  onCropChange: (crop: CropArea) => void
  onReset: () => void
}

function constrainCropArea(crop: CropArea, imageWidth: number, imageHeight: number, aspectRatio: number): CropArea {
  let { x, y, width, height } = crop

  width = Math.min(width, imageWidth)
  height = Math.min(height, imageHeight)

  if (width / height > aspectRatio) {
    width = height * aspectRatio
  } else {
    height = width / aspectRatio
  }

  const maxX = Math.max(0, imageWidth - width)
  const maxY = Math.max(0, imageHeight - height)

  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
    width,
    height
  }
}

function getDefaultCrop(imageWidth: number, imageHeight: number, aspectRatio: number): CropArea {
  let width, height, x, y

  if (imageWidth / imageHeight > aspectRatio) {
    height = imageHeight
    width = height * aspectRatio
    x = Math.round((imageWidth - width) / 2)
    y = 0
  } else {
    width = imageWidth
    height = width / aspectRatio
    x = 0
    y = Math.round((imageHeight - height) / 2)
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  }
}

const MIN_CROP_SIZE_ORIGINAL = 50

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
  const [resizeHandle, setResizeHandle] = useState<string>("")
  const [displayScale, setDisplayScale] = useState(1)
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 })

  const [cropArea, setCropArea] = useState<CropArea>(() => {
    if (initialCrop) return initialCrop
    return getDefaultCrop(imageWidth, imageHeight, aspectRatio)
  })

  useEffect(() => {
    if (initialCrop) {
      setCropArea(initialCrop)
    }
  }, [initialCrop])

  useEffect(() => {
    const calculateDisplaySize = () => {
      if (!imageRef.current || !containerRef.current) return
      const container = containerRef.current
      const maxWidth = container.clientWidth - 40
      const maxHeight = Math.max(200, container.clientHeight - 80)

      const scaleX = maxWidth / imageWidth
      const scaleY = maxHeight / imageHeight
      const scale = Math.min(scaleX, scaleY, 1)

      setDisplayScale(scale)
      setImageDisplaySize({
        width: imageWidth * scale,
        height: imageHeight * scale
      })
    }

    calculateDisplaySize()
    window.addEventListener("resize", calculateDisplaySize)
    return () => window.removeEventListener("resize", calculateDisplaySize)
  }, [imageWidth, imageHeight])

  const toDisplayCoords = useCallback(
    (c: CropArea) => ({
      x: c.x * displayScale,
      y: c.y * displayScale,
      width: c.width * displayScale,
      height: c.height * displayScale
    }),
    [displayScale]
  )

  const updateCropArea = useCallback(
    (newCrop: CropArea) => {
      const constrained = constrainCropArea(newCrop, imageWidth, imageHeight, aspectRatio)
      setCropArea(constrained)
      onCropChange(constrained)
    },
    [imageWidth, imageHeight, aspectRatio, onCropChange]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle?: string) => {
      e.preventDefault()
      e.stopPropagation()

      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect) return

      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })

      if (handle) {
        setIsResizing(true)
        setResizeHandle(handle)
      } else {
        setIsDragging(true)
      }
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) return

      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect) return

      const currentX = e.clientX - rect.left
      const currentY = e.clientY - rect.top
      const deltaX = currentX - dragStart.x
      const deltaY = currentY - dragStart.y

      if (isDragging) {
        const newCrop = {
          x: cropArea.x + Math.round(deltaX / displayScale),
          y: cropArea.y + Math.round(deltaY / displayScale),
          width: cropArea.width,
          height: cropArea.height
        }
        updateCropArea(newCrop)
        setDragStart({ x: currentX, y: currentY })
      } else if (isResizing) {
        const minSize = Math.round(MIN_CROP_SIZE_ORIGINAL / displayScale)
        let newWidth = cropArea.width
        let newHeight = cropArea.height
        let newX = cropArea.x
        let newY = cropArea.y

        if (resizeHandle.includes("right")) {
          newWidth = Math.max(minSize, cropArea.width + Math.round(deltaX / displayScale))
        } else if (resizeHandle.includes("left")) {
          newWidth = Math.max(minSize, cropArea.width - Math.round(deltaX / displayScale))
          newX = cropArea.x + cropArea.width - newWidth
        }

        if (resizeHandle.includes("bottom")) {
          newHeight = Math.max(Math.round(minSize / aspectRatio), cropArea.height + Math.round(deltaY / displayScale))
        } else if (resizeHandle.includes("top")) {
          newHeight = Math.max(Math.round(minSize / aspectRatio), cropArea.height - Math.round(deltaY / displayScale))
          newY = cropArea.y + cropArea.height - newHeight
        }

        if (resizeHandle.includes("left") || resizeHandle.includes("right")) {
          newHeight = newWidth / aspectRatio
          newY = cropArea.y + (cropArea.height - newHeight) / 2
        } else if (resizeHandle.includes("top") || resizeHandle.includes("bottom")) {
          newWidth = newHeight * aspectRatio
          newX = cropArea.x + (cropArea.width - newWidth) / 2
        }

        updateCropArea({ x: newX, y: newY, width: newWidth, height: newHeight })
        setDragStart({ x: currentX, y: currentY })
      }
    },
    [isDragging, isResizing, dragStart, cropArea, resizeHandle, aspectRatio, displayScale, updateCropArea]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle("")
  }, [])

  useEffect(() => {
    if (!isDragging && !isResizing) return
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const handleReset = useCallback(() => {
    const centerX = Math.round((imageWidth - imageHeight * aspectRatio) / 2)
    const defaultCrop = {
      x: Math.max(0, centerX),
      y: 0,
      width: Math.min(Math.round(imageHeight * aspectRatio), imageWidth),
      height: imageHeight
    }
    updateCropArea(defaultCrop)
    onReset()
  }, [imageWidth, imageHeight, aspectRatio, updateCropArea, onReset])

  const displayCrop = toDisplayCoords(cropArea)

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="relative flex-1 flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden"
      >
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

          <div className="absolute inset-0 pointer-events-none">
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
              {["top-left", "top-right", "bottom-left", "bottom-right"].map((handle) => (
                <div
                  key={handle}
                  className={`absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize ${
                    handle.includes("top") ? "top-0" : "bottom-0"
                  } ${handle.includes("left") ? "left-0" : "right-0"} ${
                    handle.includes("top") && handle.includes("left")
                      ? "-translate-x-1/2 -translate-y-1/2"
                      : handle.includes("top") && handle.includes("right")
                        ? "translate-x-1/2 -translate-y-1/2"
                        : handle.includes("bottom") && handle.includes("left")
                          ? "-translate-x-1/2 translate-y-1/2"
                          : "translate-x-1/2 translate-y-1/2"
                  }`}
                  onMouseDown={(e) => handleMouseDown(e, handle)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 py-2 flex-shrink-0">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            X: {cropArea.x} Y: {cropArea.y}
          </span>
          <span>
            {cropArea.width} × {cropArea.height}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          重置裁切
        </button>
      </div>
    </div>
  )
}

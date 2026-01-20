"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"

interface BoundingBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface VideoPreviewProps {
  videoUrl: string
  currentTime: number
  duration: number
  subtitleRegions: BoundingBox[]
  onRegionAdd: (region: BoundingBox) => void
  onRegionUpdate: (id: string, region: Partial<BoundingBox>) => void
  onRegionRemove: (id: string) => void
  onSeek: (time: number) => void
  onDurationChange: (duration: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onVideoRef?: (video: HTMLVideoElement | null) => void
}

export function VideoPreview({
  videoUrl,
  currentTime,
  duration,
  subtitleRegions,
  onRegionAdd,
  onRegionUpdate,
  onRegionRemove,
  onSeek,
  onDurationChange,
  isPlaying,
  onPlayPause,
  onVideoRef
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [newRegion, setNewRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 })
  const wasDraggingRef = useRef(false)

  // 视频时间同步
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime
    }
  }, [currentTime])

  // 播放/暂停
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  // 传递视频引用
  useEffect(() => {
    if (onVideoRef) {
      onVideoRef(videoRef.current)
    }
  }, [onVideoRef, videoUrl])

  // 获取相对于视频的坐标
  const getVideoRelativePos = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const video = videoRef.current
    if (!video) return null

    const videoRect = video.getBoundingClientRect()
    return {
      x: e.clientX - videoRect.left,
      y: e.clientY - videoRect.top
    }
  }, [])

  // 检查是否点击了删除按钮
  const isInDeleteButton = useCallback((x: number, y: number, region: BoundingBox, video: HTMLVideoElement): boolean => {
    const rx = (region.x / 100) * video.videoWidth
    const ry = (region.y / 100) * video.videoHeight
    const rw = (region.width / 100) * video.videoWidth
    return x >= rx + rw - 20 && x <= rx + rw && y >= ry - 20 && y <= ry
  }, [])

  // 获取点击的区域
  const getRegionAtPoint = useCallback((x: number, y: number, video: HTMLVideoElement): BoundingBox | null => {
    for (const region of subtitleRegions) {
      const rx = (region.x / 100) * video.videoWidth
      const ry = (region.y / 100) * video.videoHeight
      const rw = (region.width / 100) * video.videoWidth
      const rh = (region.height / 100) * video.videoHeight

      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
        return region
      }
    }
    return null
  }, [subtitleRegions])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const video = videoRef.current
    if (!video) return

    const coords = getVideoRelativePos(e)
    if (!coords) return

    // 检查删除按钮
    for (const region of subtitleRegions) {
      if (isInDeleteButton(coords.x, coords.y, region, video)) {
        onRegionRemove(region.id)
        return
      }
    }

    // 检查是否点击了区域
    const clickedRegion = getRegionAtPoint(coords.x, coords.y, video)
    if (clickedRegion) {
      setSelectedRegionId(clickedRegion.id)
      setIsMoving(true)
      setMoveOffset({
        x: coords.x - (clickedRegion.x / 100) * video.videoWidth,
        y: coords.y - (clickedRegion.y / 100) * video.videoHeight
      })
      wasDraggingRef.current = false
      return
    }

    // 开始拖拽创建新区域
    setIsDragging(true)
    setDragStart(coords)
    setNewRegion({ x: coords.x, y: coords.y, width: 0, height: 0 })
    wasDraggingRef.current = false
  }, [getVideoRelativePos, isInDeleteButton, getRegionAtPoint, subtitleRegions, onRegionRemove])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const video = videoRef.current
    if (!video) return

    const coords = getVideoRelativePos(e)
    if (!coords) return

    // 移动区域
    if (isMoving && selectedRegionId) {
      const distance = Math.sqrt(Math.pow(coords.x - moveOffset.x, 2) + Math.pow(coords.y - moveOffset.y, 2))
      if (distance > 3) wasDraggingRef.current = true

      const newX = ((coords.x - moveOffset.x) / video.videoWidth) * 100
      const newY = ((coords.y - moveOffset.y) / video.videoHeight) * 100

      onRegionUpdate(selectedRegionId, {
        x: Math.max(0, Math.min(99, newX)),
        y: Math.max(0, Math.min(99, newY))
      })
      return
    }

    // 拖拽创建
    if (isDragging && dragStart) {
      const distance = Math.sqrt(Math.pow(coords.x - dragStart.x, 2) + Math.pow(coords.y - dragStart.y, 2))
      if (distance > 5) wasDraggingRef.current = true

      setNewRegion({
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        width: Math.abs(coords.x - dragStart.x),
        height: Math.abs(coords.y - dragStart.y)
      })
    }
  }, [getVideoRelativePos, isMoving, selectedRegionId, moveOffset, isDragging, dragStart, onRegionUpdate])

  const handleMouseUp = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // 完成移动
    if (isMoving) {
      setIsMoving(false)
      setSelectedRegionId(null)
      setMoveOffset({ x: 0, y: 0 })
    }

    // 完成创建
    if (isDragging && newRegion && newRegion.width > 20 && newRegion.height > 10) {
      onRegionAdd({
        id: `region-${Date.now()}`,
        x: (newRegion.x / video.videoWidth) * 100,
        y: (newRegion.y / video.videoHeight) * 100,
        width: (newRegion.width / video.videoWidth) * 100,
        height: (newRegion.height / video.videoHeight) * 100
      })
    }

    setIsDragging(false)
    setDragStart(null)
    setNewRegion(null)
  }, [isDragging, isMoving, newRegion, onRegionAdd])

  const handleVideoClick = useCallback(() => {
    if (!wasDraggingRef.current && !isMoving && !isDragging) {
      onPlayPause()
    }
  }, [isMoving, isDragging, onPlayPause])

  if (!videoUrl) {
    return (
      <div
        ref={wrapperRef}
        className="w-full h-full flex items-center justify-center bg-gray-900"
      >
        <div className="text-center">
          <p className="text-gray-400 mb-2">请上传视频或输入视频链接</p>
          <p className="text-gray-500 text-sm">
            点击视频画面并拖动来框选字幕区域
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 视频和区域放在同一个定位上下文中 */}
      <div className="relative inline-block max-w-full max-h-full">
        {/* 视频元素 */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="block max-w-full max-h-full object-contain"
          onClick={handleVideoClick}
          onTimeUpdate={(e) => {
            const video = e.target as HTMLVideoElement
            if (Math.abs(video.currentTime - currentTime) > 0.5) {
              onSeek(video.currentTime)
            }
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement
            onSeek(video.currentTime)
            onDurationChange(video.duration || 0)
          }}
          onEnded={() => onSeek(0)}
          crossOrigin="anonymous"
        />

        {/* 区域层 - 直接覆盖在视频上，使用相同的定位 */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 已有区域 - 百分比定位 */}
          {subtitleRegions.map((region) => (
            <div
              key={region.id}
              className="absolute border-2 border-green-500 bg-green-500/25 cursor-move group pointer-events-auto"
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                handleMouseDown(e as any)
              }}
            >
              {/* 删除按钮 */}
              <button
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-20"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onRegionRemove(region.id)
                }}
              >
                ×
              </button>
            </div>
          ))}

          {/* 新拖拽区域 - 像素定位 */}
          {newRegion && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/25 pointer-events-none"
              style={{
                left: newRegion.x,
                top: newRegion.y,
                width: newRegion.width,
                height: newRegion.height
              }}
            />
          )}
        </div>
      </div>

      {/* 提示文字 */}
      {/* <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm pointer-events-none">
        拖拽绘制区域 · 拖动移动区域 · 点击红色×删除
      </div> */}

    </div>
  )
}
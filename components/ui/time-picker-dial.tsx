"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface TimePickerDialProps {
  hour: number
  minute: number
  onTimeChange: (hour: number, minute: number) => void
  mode?: "hour" | "minute"
  minuteStep?: number
  use12Hours?: boolean
  className?: string
}

export function TimePickerDial({
  hour,
  minute,
  onTimeChange,
  mode = "hour",
  minuteStep = 5,
  use12Hours = false,
  className,
}: TimePickerDialProps) {
  const dialRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeValue, setActiveValue] = useState<number | null>(null)
  
  // 计算表盘项
  const getDialItems = () => {
    if (mode === "hour") {
      // 小时表盘项
      return Array.from({ length: use12Hours ? 12 : 24 }, (_, i) => {
        const value = use12Hours ? (i === 0 ? 12 : i) : i
        const angle = (value / (use12Hours ? 12 : 24)) * 360
        return { value, angle }
      })
    } else {
      // 分钟表盘项
      const items = []
      for (let i = 0; i < 60; i += minuteStep) {
        const angle = (i / 60) * 360
        items.push({ value: i, angle })
      }
      return items
    }
  }
  
  const dialItems = getDialItems()
  
  // 计算表盘项位置
  const getItemPosition = (angle: number, radius: number) => {
    const radians = (angle - 90) * (Math.PI / 180)
    const x = Math.cos(radians) * radius
    const y = Math.sin(radians) * radius
    return { x, y }
  }
  
  // 处理点击或拖动
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!dialRef.current) return
    
    const rect = dialRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // 计算角度
    const dx = clientX - centerX
    const dy = clientY - centerY
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    
    // 找到最接近的表盘项
    const step = mode === "hour" ? (use12Hours ? 30 : 15) : (360 / (60 / minuteStep))
    const roundedAngle = Math.round(angle / step) * step
    
    // 找到对应的值
    const item = dialItems.find(item => Math.abs(item.angle - roundedAngle) < 0.001) || 
                 dialItems.reduce((prev, curr) => {
                   const prevDiff = Math.abs(prev.angle - roundedAngle)
                   const currDiff = Math.abs(curr.angle - roundedAngle)
                   return prevDiff < currDiff ? prev : curr
                 })
    
    if (item) {
      setActiveValue(item.value)
      if (mode === "hour") {
        // 如果是12小时制，需要保留AM/PM
        const newHour = use12Hours 
          ? (item.value === 12 ? 0 : item.value) + (hour >= 12 ? 12 : 0)
          : item.value
        onTimeChange(newHour, minute)
      } else {
        onTimeChange(hour, item.value)
      }
    }
  }
  
  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleInteraction(e.clientX, e.clientY)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleInteraction(e.clientX, e.clientY)
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }
  
  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    
    e.preventDefault()
    setIsDragging(true)
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    
    const handleTouchEnd = () => {
      setIsDragging(false)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
    
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)
  }
  
  // 渲染表盘
  return (
    <div 
      className={cn(
        "relative w-64 h-64 rounded-full bg-muted/20 border border-muted/30",
        isDragging && "cursor-grabbing",
        className
      )}
      ref={dialRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* 中心点 */}
      <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2" />
      
      {/* 指针 */}
      {activeValue !== null && (
        <div 
          className="absolute top-1/2 left-1/2 w-1 bg-primary origin-bottom rounded-full"
          style={{
            height: "40%",
            transform: `translateX(-50%) rotate(${mode === "hour" 
              ? (((use12Hours ? (activeValue === 0 ? 12 : activeValue) : activeValue) / (use12Hours ? 12 : 24)) * 360) 
              : ((activeValue / 60) * 360)}deg)`,
          }}
        />
      )}
      
      {/* 表盘项 */}
      {dialItems.map((item) => {
        const isActive = mode === "hour" 
          ? (use12Hours ? (hour % 12 === 0 ? 12 : hour % 12) : hour) === item.value
          : minute === item.value
        
        const { x, y } = getItemPosition(item.angle, 100)
        
        return (
          <div
            key={item.value}
            className={cn(
              "absolute flex items-center justify-center w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2 select-none",
              isActive ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"
            )}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (mode === "hour") {
                const newHour = use12Hours 
                  ? (item.value === 12 ? 0 : item.value) + (hour >= 12 ? 12 : 0)
                  : item.value
                onTimeChange(newHour, minute)
              } else {
                onTimeChange(hour, item.value)
              }
            }}
          >
            {item.value}
          </div>
        )
      })}
    </div>
  )
} 
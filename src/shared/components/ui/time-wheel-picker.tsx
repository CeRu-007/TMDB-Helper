"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"

interface TimeWheelPickerProps {
  hour: number
  minute: number
  onTimeChange: (hour: number, minute: number) => void
  minuteStep?: number
  className?: string
}

interface WheelOptionProps {
  value: string | number
  isSelected: boolean
  distance: number
}

const WheelOption = ({ value, isSelected, distance }: WheelOptionProps) => {
  // 计算基于距离的样式
  const opacity = Math.max(0, 1 - Math.abs(distance) * 0.25)
  const scale = Math.max(0.8, 1 - Math.abs(distance) * 0.1)
  
  return (
    <div
      className={cn(
        "transition-all duration-200 ease-out text-center py-2 px-4 select-none",
        isSelected ? "text-primary font-medium scale-105" : "text-muted-foreground"
      )}
      style={{
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {value.toString().padStart(2, "0")}
    </div>
  )
}

const TimeWheelPicker = ({
  hour,
  minute,
  onTimeChange,
  minuteStep = 1,
  className,
}: TimeWheelPickerProps) => {
  // 状态
  const [activeWheel, setActiveWheel] = useState<"hour" | "minute" | null>(null)
  const [startY, setStartY] = useState(0)
  const [lastY, setLastY] = useState(0)
  const [velocity, setVelocity] = useState(0)
  
  // 引用
  const hourWheelRef = useRef<HTMLDivElement>(null)
  const minuteWheelRef = useRef<HTMLDivElement>(null)
  
  // 生成选项数据
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) }, 
    (_, i) => i * minuteStep
  ).filter(m => m < 60)
  
  // 常量配置
  const visibleOptions = 5
  const optionHeight = 36 // 像素
  
  // 为了避免闭包问题，创建memoized函数
  const updateTime = useCallback((newHour: number, newMinute: number) => {
    onTimeChange(
      (newHour + 24) % 24, 
      (newMinute + 60) % 60
    )
  }, [onTimeChange])
  
  // 处理移动增量
  const handleDeltaMovement = useCallback((delta: number, type: "hour" | "minute") => {
    if (Math.abs(delta) < 10) return // 需要足够的移动才改变值
    
    if (type === "hour") {
      let change = delta > 0 ? -1 : 1 // 向上滑动减少，向下滑动增加
      let newHour = (hour + change) % 24
      if (newHour < 0) newHour += 24
      updateTime(newHour, minute)
    } else {
      let change = delta > 0 ? -minuteStep : minuteStep
      let newMinute = (minute + change) % 60
      if (newMinute < 0) newMinute += 60
      updateTime(hour, newMinute)
    }
  }, [hour, minute, minuteStep, updateTime])
  
  // 处理惯性效果
  const applyInertia = useCallback(() => {
    if (Math.abs(velocity) < 3 || activeWheel === null) return
    
    const direction = velocity > 0 ? 1 : -1
    const magnitude = Math.min(Math.abs(velocity) / 5, 3)
    
    if (activeWheel === "hour") {
      let newHour = (hour - direction * Math.round(magnitude)) % 24
      if (newHour < 0) newHour += 24
      updateTime(newHour, minute)
    } else {
      let newMinute = (minute - direction * Math.round(magnitude) * minuteStep) % 60
      if (newMinute < 0) newMinute += 60
      updateTime(hour, newMinute)
    }
  }, [activeWheel, hour, minute, minuteStep, velocity, updateTime])
  
  // 鼠标和触摸事件处理
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (activeWheel === null) return
    
    e.preventDefault()
    const clientY = e.clientY
    const deltaY = clientY - lastY
    
    setVelocity(deltaY)
    handleDeltaMovement(deltaY, activeWheel)
    setLastY(clientY)
  }, [activeWheel, lastY, handleDeltaMovement])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (activeWheel === null || e.touches.length !== 1) return
    
    e.preventDefault()
    const clientY = e.touches[0].clientY
    const deltaY = clientY - lastY
    
    setVelocity(deltaY)
    handleDeltaMovement(deltaY, activeWheel)
    setLastY(clientY)
  }, [activeWheel, lastY, handleDeltaMovement])
  
  const handleMouseUp = useCallback(() => {
    applyInertia()
    
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    
    setActiveWheel(null)
    setVelocity(0)
  }, [applyInertia, handleMouseMove])
  
  const handleTouchEnd = useCallback(() => {
    applyInertia()
    
    document.removeEventListener("touchmove", handleTouchMove)
    document.removeEventListener("touchend", handleTouchEnd)
    
    setActiveWheel(null)
    setVelocity(0)
  }, [applyInertia, handleTouchMove])
  
  // 处理wheel开始拖动
  const handleWheelMouseDown = useCallback((e: React.MouseEvent, type: "hour" | "minute") => {
    e.preventDefault()
    
    const clientY = e.clientY
    setStartY(clientY)
    setLastY(clientY)
    setActiveWheel(type)
    
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove, handleMouseUp])
  
  // 处理wheel触摸开始
  const handleWheelTouchStart = useCallback((e: React.TouchEvent, type: "hour" | "minute") => {
    e.preventDefault()
    
    if (e.touches.length !== 1) return
    const clientY = e.touches[0].clientY
    
    setStartY(clientY)
    setLastY(clientY)
    setActiveWheel(type)
    
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)
  }, [handleTouchMove, handleTouchEnd])
  
  // 处理滚轮事件
  const handleWheel = useCallback((e: React.WheelEvent, type: "hour" | "minute") => {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? 1 : -1 // 向下滚动增加，向上滚动减少
    
    if (type === "hour") {
      let newHour = (hour + delta) % 24
      if (newHour < 0) newHour += 24
      updateTime(newHour, minute)
    } else {
      let newMinute = (minute + delta * minuteStep) % 60
      if (newMinute < 0) newMinute += 60
      updateTime(hour, newMinute)
    }
  }, [hour, minute, minuteStep, updateTime])
  
  // 处理按钮点击
  const handleButtonClick = useCallback((type: "hour" | "minute", direction: "up" | "down") => {
    const delta = direction === "up" ? -1 : 1
    
    if (type === "hour") {
      let newHour = (hour + delta) % 24
      if (newHour < 0) newHour += 24
      updateTime(newHour, minute)
    } else {
      let newMinute = (minute + delta * minuteStep) % 60
      if (newMinute < 0) newMinute += 60
      updateTime(hour, newMinute)
    }
  }, [hour, minute, minuteStep, updateTime])
  
  // 清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])
  
  // 渲染wheel选项
  const renderWheelOptions = (options: number[], currentValue: number) => {
    const currentIndex = options.indexOf(currentValue)
    const extendedOptions = [...options, ...options, ...options]
    const startIndex = options.length + currentIndex - Math.floor(visibleOptions / 2)
    
    return extendedOptions
      .slice(startIndex, startIndex + visibleOptions)
      .map((value, index) => {
        const actualValue = value
        const distance = index - Math.floor(visibleOptions / 2)
        
        return (
          <WheelOption
            key={`${actualValue}-${index}`}
            value={actualValue}
            isSelected={actualValue === currentValue}
            distance={distance}
          />
        )
      })
  }
  
  // 返回组件UI
  return (
    <div className={cn("flex gap-4 items-center justify-center", className)}>
      {/* 小时选择器 */}
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          className="text-muted-foreground hover:text-primary p-2 transition-colors"
          onClick={() => handleButtonClick("hour", "up")}
          aria-label="减小时"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        
        <div 
          ref={hourWheelRef}
          className={cn(
            "flex flex-col overflow-hidden h-[calc(36px*3)] relative cursor-ns-resize",
            activeWheel === "hour" ? "cursor-grabbing bg-muted/5" : ""
          )}
          onMouseDown={(e) => handleWheelMouseDown(e, "hour")}
          onTouchStart={(e) => handleWheelTouchStart(e, "hour")}
          onWheel={(e) => handleWheel(e, "hour")}
        >
          {/* 顶部和底部边框 */}
          <div className="absolute top-0 left-0 right-0 h-[36px] pointer-events-none border-t border-muted/20" />
          <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none border-b border-muted/20" />
          
          {/* 选中项背景 */}
          <div className="absolute left-0 right-0 h-[36px] top-[36px] bg-muted/10 rounded-sm pointer-events-none" />
          
          {/* 选项列表 */}
          <div className="flex flex-col">
            {renderWheelOptions(hours, hour)}
          </div>
        </div>
        
        <button
          type="button"
          className="text-muted-foreground hover:text-primary p-2 transition-colors"
          onClick={() => handleButtonClick("hour", "down")}
          aria-label="加小时"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        
        <div className="text-xs text-muted-foreground pt-1">时</div>
      </div>
      
      <div className="text-lg font-light text-muted-foreground">:</div>
      
      {/* 分钟选择器 */}
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          className="text-muted-foreground hover:text-primary p-2 transition-colors"
          onClick={() => handleButtonClick("minute", "up")}
          aria-label="减分钟"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        
        <div 
          ref={minuteWheelRef}
          className={cn(
            "flex flex-col overflow-hidden h-[calc(36px*3)] relative cursor-ns-resize",
            activeWheel === "minute" ? "cursor-grabbing bg-muted/5" : ""
          )}
          onMouseDown={(e) => handleWheelMouseDown(e, "minute")}
          onTouchStart={(e) => handleWheelTouchStart(e, "minute")}
          onWheel={(e) => handleWheel(e, "minute")}
        >
          {/* 顶部和底部边框 */}
          <div className="absolute top-0 left-0 right-0 h-[36px] pointer-events-none border-t border-muted/20" />
          <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none border-b border-muted/20" />
          
          {/* 选中项背景 */}
          <div className="absolute left-0 right-0 h-[36px] top-[36px] bg-muted/10 rounded-sm pointer-events-none" />
          
          {/* 选项列表 */}
          <div className="flex flex-col">
            {renderWheelOptions(minutes, minute)}
          </div>
        </div>
        
        <button
          type="button"
          className="text-muted-foreground hover:text-primary p-2 transition-colors"
          onClick={() => handleButtonClick("minute", "down")}
          aria-label="加分钟"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        
        <div className="text-xs text-muted-foreground pt-1">分</div>
      </div>
    </div>
  )
}

export { TimeWheelPicker } 
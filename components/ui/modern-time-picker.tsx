"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { TimePickerDial } from "./time-picker-dial"
import { TimePickerPresets } from "./time-picker-presets"

interface ModernTimePickerProps {
  hour: number
  minute: number
  onTimeChange: (hour: number, minute: number) => void
  minuteStep?: number
  className?: string
  disabled?: boolean
  use12Hours?: boolean
}

export function ModernTimePicker({
  hour,
  minute,
  onTimeChange,
  minuteStep = 1,
  className,
  disabled = false,
  use12Hours = false,
}: ModernTimePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "dial" | "presets">("input")
  const [dialMode, setDialMode] = useState<"hour" | "minute">("hour")
  const [internalHour, setInternalHour] = useState(hour)
  const [internalMinute, setInternalMinute] = useState(minute)
  
  // 同步内部状态和外部状态
  useEffect(() => {
    setInternalHour(hour)
    setInternalMinute(minute)
  }, [hour, minute])

  // 格式化时间显示
  const formatTime = (h: number, m: number) => {
    const formattedHour = h.toString().padStart(2, '0')
    const formattedMinute = m.toString().padStart(2, '0')
    return `${formattedHour}:${formattedMinute}`
  }

  // 处理直接输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const [hourStr, minuteStr] = value.split(':')
    
    let newHour = parseInt(hourStr, 10)
    let newMinute = parseInt(minuteStr, 10)
    
    if (isNaN(newHour)) newHour = internalHour
    if (isNaN(newMinute)) newMinute = internalMinute
    
    // 验证范围
    newHour = Math.max(0, Math.min(23, newHour))
    newMinute = Math.max(0, Math.min(59, newMinute))
    
    setInternalHour(newHour)
    setInternalMinute(newMinute)
    onTimeChange(newHour, newMinute)
  }

  // 增加小时
  const increaseHour = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let newHour = internalHour + 1
    if (newHour > 23) newHour = 0
    
    setInternalHour(newHour)
    onTimeChange(newHour, internalMinute)
  }

  // 减少小时
  const decreaseHour = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let newHour = internalHour - 1
    if (newHour < 0) newHour = 23
    
    setInternalHour(newHour)
    onTimeChange(newHour, internalMinute)
  }

  // 增加分钟
  const increaseMinute = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let newMinute = internalMinute + minuteStep
    let newHour = internalHour
    
    if (newMinute > 59) {
      newMinute = newMinute % 60
      newHour = (internalHour + 1) % 24
    }
    
    setInternalMinute(newMinute)
    setInternalHour(newHour)
    onTimeChange(newHour, newMinute)
  }

  // 减少分钟
  const decreaseMinute = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let newMinute = internalMinute - minuteStep
    let newHour = internalHour
    
    if (newMinute < 0) {
      newMinute = 60 + newMinute
      newHour = internalHour - 1
      if (newHour < 0) newHour = 23
    }
    
    setInternalMinute(newMinute)
    setInternalHour(newHour)
    onTimeChange(newHour, newMinute)
  }

  // 处理表盘模式切换
  const toggleDialMode = () => {
    setDialMode(prev => prev === "hour" ? "minute" : "hour")
  }

  // 生成小时选项
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)
  
  // 生成分钟选项
  const minuteOptions = []
  for (let i = 0; i < 60; i += minuteStep) {
    minuteOptions.push(i)
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex items-center">
            <Input
              type="text"
              value={formatTime(internalHour, internalMinute)}
              onChange={handleInputChange}
              className="pr-20 text-center"
              placeholder="00:00"
              disabled={disabled}
            />
            <div className="absolute right-1 top-1 bottom-1 flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-full rounded-l-none border-l"
                onClick={(e) => {
                  e.preventDefault()
                  setIsPopoverOpen(true)
                }}
                disabled={disabled}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Tabs defaultValue="input" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="border-b px-3">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="input">数字输入</TabsTrigger>
                <TabsTrigger value="dial">时钟表盘</TabsTrigger>
                <TabsTrigger value="presets">快捷选择</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-4">
              <TabsContent value="input" className="mt-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* 小时选择器 */}
                  <div className="flex flex-col items-center border rounded-md">
                    <div 
                      className="w-full flex justify-center py-2 cursor-pointer hover:bg-muted rounded-b-none border-b"
                      onClick={increaseHour}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </div>
                    <div className="py-4 text-center font-mono text-2xl">
                      {internalHour.toString().padStart(2, '0')}
                    </div>
                    <div 
                      className="w-full flex justify-center py-2 cursor-pointer hover:bg-muted rounded-t-none border-t"
                      onClick={decreaseHour}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  
                  {/* 分钟选择器 */}
                  <div className="flex flex-col items-center border rounded-md">
                    <div 
                      className="w-full flex justify-center py-2 cursor-pointer hover:bg-muted rounded-b-none border-b"
                      onClick={increaseMinute}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </div>
                    <div className="py-4 text-center font-mono text-2xl">
                      {internalMinute.toString().padStart(2, '0')}
                    </div>
                    <div 
                      className="w-full flex justify-center py-2 cursor-pointer hover:bg-muted rounded-t-none border-t"
                      onClick={decreaseMinute}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-4 gap-1">
                  {[0, 6, 12, 18].map((h) => (
                    <Button
                      key={h}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInternalHour(h)
                        onTimeChange(h, internalMinute)
                      }}
                    >
                      {h.toString().padStart(2, '0')}:00
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="dial" className="mt-0">
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <Button variant="outline" onClick={toggleDialMode}>
                      {dialMode === "hour" ? "选择小时" : "选择分钟"}：
                      <span className="ml-1 font-mono">
                        {dialMode === "hour" 
                          ? internalHour.toString().padStart(2, '0') 
                          : internalMinute.toString().padStart(2, '0')}
                      </span>
                    </Button>
                  </div>
                  
                  <TimePickerDial
                    hour={internalHour}
                    minute={internalMinute}
                    onTimeChange={(h, m) => {
                      setInternalHour(h)
                      setInternalMinute(m)
                      onTimeChange(h, m)
                    }}
                    mode={dialMode}
                    minuteStep={minuteStep}
                    use12Hours={use12Hours}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="presets" className="mt-0">
                <div className="flex flex-col space-y-4">
                  <div className="text-center mb-2">
                    <div className="font-mono text-3xl">
                      {formatTime(internalHour, internalMinute)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      当前选择的时间
                    </div>
                  </div>
                  
                  <TimePickerPresets 
                    onSelectPreset={(h, m) => {
                      setInternalHour(h)
                      setInternalMinute(m)
                      onTimeChange(h, m)
                    }} 
                  />
                </div>
              </TabsContent>
            </div>
            
            <div className="flex items-center justify-between p-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  const h = now.getHours()
                  const m = now.getMinutes()
                  setInternalHour(h)
                  setInternalMinute(m)
                  onTimeChange(h, m)
                }}
              >
                <Clock className="h-4 w-4 mr-1" />
                当前时间
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPopoverOpen(false)}
              >
                确定
              </Button>
            </div>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
} 
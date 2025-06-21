import { useState } from "react"
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker"

export default function TestWheelPage() {
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(30)
  
  const handleTimeChange = (newHour: number, newMinute: number) => {
    console.log(`时间更新为: ${newHour}:${newMinute}`)
    setHour(newHour)
    setMinute(newMinute)
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-center mb-8">时间滚轮选择器测试</h1>
      
      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col items-center gap-4">
          <TimeWheelPicker
            hour={hour}
            minute={minute}
            onTimeChange={handleTimeChange}
            minuteStep={1}
          />
          
          <div className="mt-4 text-center">
            <p className="text-xl font-semibold">
              当前选择: {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (可尝试滚轮滚动、鼠标拖拽和按钮点击)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
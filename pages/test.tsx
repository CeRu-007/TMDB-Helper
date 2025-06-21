import { useState } from "react"
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker"

export default function TestPage() {
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(30)
  
  const handleTimeChange = (newHour: number, newMinute: number) => {
    console.log(`时间更新为: ${newHour}:${newMinute}`)
    setHour(newHour)
    setMinute(newMinute)
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-8 text-2xl font-bold">时间选择器测试页面</h1>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center">请尝试调整时间</h2>
        
        <TimeWheelPicker 
          hour={hour} 
          minute={minute} 
          onTimeChange={handleTimeChange}
        />
        
        <div className="mt-4 text-center">
          <p className="text-lg">当前时间: {hour}:{minute.toString().padStart(2, '0')}</p>
        </div>
      </div>
    </div>
  )
} 
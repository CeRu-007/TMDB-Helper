"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { setTimeMinutes } from "@/lib/utils/date-utils"

export interface MinutesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeValues: string[]
  onApply: (updatedTimes: string[]) => void
}

export default function MinutesDialog({
  open,
  onOpenChange,
  timeValues,
  onApply
}: MinutesDialogProps) {
  // 要设置的分钟值
  const [minutes, setMinutes] = useState<number>(0)
  
  // 处理分钟变化
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 0 && value <= 59) {
      setMinutes(value)
    }
  }
  
  // 处理应用按钮点击
  const handleApply = () => {
    // 更新所有时间值的分钟部分
    const updatedTimes = timeValues.map(time => setTimeMinutes(time, minutes))
    onApply(updatedTimes)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>设置统一分钟</DialogTitle>
          <DialogDescription>
            将选中的时间单元格设置为相同的分钟值。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="minutes" className="text-right">
              分钟值
            </Label>
            <Input
              id="minutes"
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={handleMinutesChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">预览</Label>
            <div className="col-span-3 bg-muted p-2 rounded text-sm">
              <div className="max-h-[100px] overflow-y-auto">
                {timeValues.length > 0 ? (
                  <div>
                    <div className="py-1 border-b border-border">
                      <span className="font-medium">原始值:</span> {timeValues[0]}
                    </div>
                    <div className="py-1">
                      <span className="font-medium">更新后:</span> {setTimeMinutes(timeValues[0], minutes)}
                    </div>
                    {timeValues.length > 1 && (
                      <div className="mt-2 text-muted-foreground">
                        (将应用于 {timeValues.length} 个单元格)
                      </div>
                    )}
                  </div>
                ) : (
                  <p>无预览数据</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleApply}>应用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 

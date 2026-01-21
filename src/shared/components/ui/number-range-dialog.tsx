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
import { generateNumberSequence } from "@/shared/lib/utils/date-utils"

export interface NumberRangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onApply: (numbers: string[]) => void
}

export default function NumberRangeDialog({
  open,
  onOpenChange,
  count,
  onApply
}: NumberRangeDialogProps) {
  const [startValue, setStartValue] = useState<string>("1")
  const [step, setStep] = useState<string>("1")

  const handleApply = () => {
    const start = parseInt(startValue, 10)
    const stepValue = parseInt(step, 10)
    
    if (isNaN(start) || isNaN(stepValue) || start <= 0 || stepValue <= 0) {
      return
    }
    
    const numbers = generateNumberSequence(start, count, stepValue)
    onApply(numbers)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>设置数字范围填充</DialogTitle>
          <DialogDescription>
            设置起始值和步长，自动递增填充选中的单元格
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startValue" className="text-right">
              起始值
            </Label>
            <Input
              id="startValue"
              type="number"
              min="1"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="step" className="text-right">
              步长
            </Label>
            <Input
              id="step"
              type="number"
              min="1"
              value={step}
              onChange={(e) => setStep(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            将应用于 {count} 个单元格
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button 
            onClick={handleApply}
            disabled={
              !startValue || 
              !step || 
              parseInt(startValue, 10) <= 0 || 
              parseInt(step, 10) <= 0
            }
          >
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

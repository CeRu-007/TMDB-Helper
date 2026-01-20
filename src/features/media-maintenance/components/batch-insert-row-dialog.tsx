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
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"

export interface BatchInsertRowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (count: number, position: 'before' | 'after') => void
}

export default function BatchInsertRowDialog({
  open,
  onOpenChange,
  onApply
}: BatchInsertRowDialogProps) {
  const [count, setCount] = useState<number>(1)
  const [position, setPosition] = useState<'before' | 'after'>('after')

  const handleApply = () => {
    if (count <= 0) {
      return
    }
    
    onApply(count, position)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // 重置为默认值
      setCount(1)
      setPosition('after')
    }
    // 调用外部的 onOpenChange
    if (onOpenChange) {
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>批量插入行</DialogTitle>
          <DialogDescription>
            设置要插入的行数和插入位置，episode_number 列将自动递增
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="insertCount" className="text-right">
              插入行数
            </Label>
            <Input
              id="insertCount"
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              插入位置
            </Label>
            <RadioGroup
              value={position}
              onValueChange={(value: 'before' | 'after') => setPosition(value)}
              className="col-span-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="before" id="before" />
                <Label htmlFor="before" className="cursor-pointer">
                  在上方插入
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after" id="after" />
                <Label htmlFor="after" className="cursor-pointer">
                  在下方插入
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            将插入 {count} 行新数据
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button 
            onClick={handleApply}
            disabled={count <= 0}
          >
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
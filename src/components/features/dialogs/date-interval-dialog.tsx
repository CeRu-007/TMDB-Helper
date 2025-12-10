"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/dialog"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Checkbox } from "@/components/common/checkbox"
import { formatDate, generateDateSequence, parseDate } from "@/lib/utils/date-utils"

export interface DateIntervalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startDate: string
  count: number
  onApply: (dates: string[]) => void
}

export default function DateIntervalDialog({
  open,
  onOpenChange,
  startDate,
  count,
  onApply
}: DateIntervalDialogProps) {
  // 间隔天数
  const [interval, setInterval] = useState<number>(1)
  // 是否对多行使用相同日期
  const [useEqualDate, setUseEqualDate] = useState<boolean>(false)
  // 预览数据
  const [preview, setPreview] = useState<string[]>([])
  
  // 当对话框打开或参数变化时更新预览
  useEffect(() => {
    if (!open) return
    
    const parsedDate = parseDate(startDate)
    if (!parsedDate) return
    
    const dates = generateDateSequence(parsedDate, count, interval, useEqualDate)
    setPreview(dates)
  }, [open, startDate, count, interval, useEqualDate])
  
  // 处理间隔变化
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 0) {
      setInterval(value)
    }
  }
  
  // 处理应用按钮点击
  const handleApply = () => {
    const parsedDate = parseDate(startDate)
    if (!parsedDate) return
    
    const dates = generateDateSequence(parsedDate, count, interval, useEqualDate)
    onApply(dates)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>设置日期递进</DialogTitle>
          <DialogDescription>
            设置日期递进间隔和选项，将应用于选中的单元格。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="interval" className="text-right">
              间隔天数
            </Label>
            <Input
              id="interval"
              type="number"
              min="0"
              value={interval}
              onChange={handleIntervalChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-4 flex items-center space-x-2">
              <Checkbox
                id="useEqualDate"
                checked={useEqualDate}
                onCheckedChange={(checked) => setUseEqualDate(!!checked)}
              />
              <Label htmlFor="useEqualDate">对多行使用相同日期</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">预览</Label>
            <div className="col-span-3 bg-muted p-2 rounded text-sm">
              {preview.length > 0 ? (
                <div className="max-h-[100px] overflow-y-auto">
                  {preview.map((date, index) => (
                    <div key={index} className="py-1 border-b border-border last:border-0">
                      {index + 1}: {date}
                    </div>
                  ))}
                </div>
              ) : (
                <p>无预览数据</p>
              )}
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
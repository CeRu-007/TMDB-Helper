"use client"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface TimePreset {
  label: string
  hour: number
  minute: number
}

interface TimePickerPresetsProps {
  onSelectPreset: (hour: number, minute: number) => void
  className?: string
}

export function TimePickerPresets({
  onSelectPreset,
  className,
}: TimePickerPresetsProps) {
  // 预设时间列表
  const presets: TimePreset[] = [
    { label: "凌晨", hour: 0, minute: 0 },
    { label: "早上", hour: 6, minute: 0 },
    { label: "中午", hour: 12, minute: 0 },
    { label: "下午", hour: 15, minute: 0 },
    { label: "晚上", hour: 18, minute: 0 },
    { label: "深夜", hour: 22, minute: 0 },
    { label: "当前", hour: new Date().getHours(), minute: new Date().getMinutes() },
  ]

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => onSelectPreset(preset.hour, preset.minute)}
        >
          {preset.label === "当前" && <Clock className="h-3 w-3" />}
          {preset.label === "当前" ? preset.label : `${preset.label} ${preset.hour.toString().padStart(2, '0')}:${preset.minute.toString().padStart(2, '0')}`}
        </Button>
      ))}
    </div>
  )
} 
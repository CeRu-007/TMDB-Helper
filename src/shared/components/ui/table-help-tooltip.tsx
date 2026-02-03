"use client"

import React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { Button } from "@/shared/components/ui/button"
import { HelpCircle } from "lucide-react"

export function TableHelpTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div className="font-semibold">快捷键</div>
            <div className="space-y-1">
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> / <kbd className="px-1 py-0.5 bg-muted rounded text-xs">F2</kbd> 编辑单元格</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Tab</kbd> 移动到下一个单元格</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+C</kbd> 复制</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+V</kbd> 粘贴</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Z</kbd> 撤销</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Del</kbd> 删除内容</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Shift++</kbd> 插入行</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Alt++</kbd> 插入列</div>
            </div>
            <div className="font-semibold">鼠标操作</div>
            <div className="space-y-1">
              <div>单击选择单元格</div>
              <div>双击编辑单元格</div>
              <div>长按拖拽选择区域</div>
              <div>右键显示上下文菜单</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
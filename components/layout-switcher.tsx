"use client"

import React, { useState } from "react"
import { LayoutGrid, Sidebar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayoutPreferencesManager, type LayoutType, LAYOUT_NAMES } from "@/lib/layout-preferences"
import { useToast } from "@/hooks/use-toast"

export interface LayoutSwitcherProps {
  onLayoutChange: (layoutType: LayoutType) => void
  currentLayout: LayoutType
}

export function LayoutSwitcher({ onLayoutChange, currentLayout }: LayoutSwitcherProps) {
  const { toast } = useToast()
  const [isChanging, setIsChanging] = useState(false)

  // 直接切换到另一个布局
  const handleToggleLayout = async () => {
    if (isChanging) return

    const targetLayout: LayoutType = currentLayout === 'original' ? 'sidebar' : 'original'
    setIsChanging(true)

    try {
      // 保存布局偏好
      const success = await LayoutPreferencesManager.savePreferences({
        layoutType: targetLayout
      })

      if (success) {
        onLayoutChange(targetLayout)

        toast({
          title: "布局已切换",
          description: `已切换到${LAYOUT_NAMES[targetLayout]}`,
          duration: 2000
        })
      } else {
        throw new Error("保存布局偏好失败")
      }
    } catch (error) {
      console.error("Layout change failed:", error)
      toast({
        title: "切换失败",
        description: "布局切换失败，请重试",
        variant: "destructive",
        duration: 3000
      })
    } finally {
      setIsChanging(false)
    }
  }

  // 获取目标布局的信息
  const getTargetLayoutInfo = () => {
    const targetLayout = currentLayout === 'original' ? 'sidebar' : 'original'
    const targetName = LAYOUT_NAMES[targetLayout]
    const targetIcon = targetLayout === 'original' ? <LayoutGrid className="h-4 w-4" /> : <Sidebar className="h-4 w-4" />

    return { targetLayout, targetName, targetIcon }
  }

  const { targetName, targetIcon } = getTargetLayoutInfo()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleLayout}
      disabled={isChanging}
      className="flex items-center space-x-2 transition-all duration-200 hover:scale-105"
    >
      {targetIcon}
      <span className="text-sm">
        {targetName}
      </span>
    </Button>
  )
}

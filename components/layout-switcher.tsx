"use client"

import React, { useState, useEffect } from "react"
import { LayoutGrid, Sidebar, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { LayoutPreferencesManager, type LayoutType } from "@/lib/layout-preferences"
import { useToast } from "@/hooks/use-toast"

export interface LayoutSwitcherProps {
  onLayoutChange: (layoutType: LayoutType) => void
  currentLayout: LayoutType
}

export function LayoutSwitcher({ onLayoutChange, currentLayout }: LayoutSwitcherProps) {
  const { toast } = useToast()
  const [isChanging, setIsChanging] = useState(false)

  const handleLayoutChange = async (newLayout: LayoutType) => {
    if (newLayout === currentLayout || isChanging) return

    setIsChanging(true)
    
    try {
      // 保存布局偏好
      const success = LayoutPreferencesManager.savePreferences({ 
        layoutType: newLayout 
      })
      
      if (success) {
        onLayoutChange(newLayout)
        
        toast({
          title: "布局已切换",
          description: `已切换到${newLayout === 'original' ? '原始' : '侧边栏'}布局`,
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

  const getLayoutIcon = (layout: LayoutType) => {
    switch (layout) {
      case 'original':
        return <LayoutGrid className="h-4 w-4" />
      case 'sidebar':
        return <Sidebar className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getLayoutLabel = (layout: LayoutType) => {
    switch (layout) {
      case 'original':
        return '原始布局'
      case 'sidebar':
        return '侧边栏布局'
      default:
        return '未知布局'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isChanging}
          className="flex items-center space-x-2"
        >
          {getLayoutIcon(currentLayout)}
          <span className="hidden sm:inline">
            {currentLayout === 'original' ? '原始' : '侧边栏'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleLayoutChange('original')}
          disabled={currentLayout === 'original' || isChanging}
          className="flex items-center space-x-2"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>原始布局</span>
          {currentLayout === 'original' && (
            <Badge variant="default" className="ml-auto text-xs">当前</Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleLayoutChange('sidebar')}
          disabled={currentLayout === 'sidebar' || isChanging}
          className="flex items-center space-x-2"
        >
          <Sidebar className="h-4 w-4" />
          <span>侧边栏布局</span>
          {currentLayout === 'sidebar' && (
            <Badge variant="default" className="ml-auto text-xs">当前</Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            const success = LayoutPreferencesManager.resetToDefault()
            if (success) {
              onLayoutChange('original')
              toast({
                title: "已重置",
                description: "布局偏好已重置为默认设置",
                duration: 2000
              })
            }
          }}
          className="text-muted-foreground"
        >
          <Monitor className="h-4 w-4 mr-2" />
          重置为默认
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

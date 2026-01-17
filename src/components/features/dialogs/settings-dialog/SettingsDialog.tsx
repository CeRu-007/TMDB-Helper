/**
 * 设置对话框主组件
 * 
 * 使用复合模式组织各个设置面板
 */

"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/common/dialog"
import { ScrollArea } from "@/components/common/scroll-area"
import { SettingsMenu } from "./SettingsMenu"
import { ModelServiceSettingsPanel } from "./ModelServiceSettingsPanel"
import { ToolsSettingsPanel } from "./ToolsSettingsPanel"
import { VideoThumbnailSettingsPanel } from "./VideoThumbnailSettingsPanel"
import { GeneralSettingsPanel } from "./GeneralSettingsPanel"
import { AppearanceSettingsPanel } from "./AppearanceSettingsPanel"
import { SecuritySettingsPanel } from "./SecuritySettingsPanel"
import { HelpSettingsPanel } from "./HelpSettingsPanel"
import type { SettingsDialogProps } from "./types"

export default function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const validSections = useMemo(() => [
    'model-service',
    'tools',
    'video-thumbnail',
    'general',
    'appearance',
    'security',
    'help'
  ], [])

  const validInitialSection = useMemo(() =>
    initialSection &&
    typeof initialSection === 'string' &&
    validSections.includes(initialSection)
    ? initialSection
    : 'model-service',
    [initialSection, validSections]
  )

  const [activeSection, setActiveSection] = useState<string>(validInitialSection)

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const renderActivePanel = () => {
    switch (activeSection) {
      case "model-service":
        return <ModelServiceSettingsPanel />
      case "tools":
        return <ToolsSettingsPanel />
      case "video-thumbnail":
        return <VideoThumbnailSettingsPanel />
      case "general":
        return <GeneralSettingsPanel />
      case "appearance":
        return <AppearanceSettingsPanel />
      case "security":
        return <SecuritySettingsPanel />
      case "help":
        return <HelpSettingsPanel />
      default:
        return <ModelServiceSettingsPanel />
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            设置
          </DialogTitle>
          <DialogDescription>
            配置应用程序的全局设置和API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          {/* 左侧导航菜单 */}
          <SettingsMenu
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* 右侧内容区域 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {renderActivePanel()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
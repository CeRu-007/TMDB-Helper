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
import { useTranslation } from "react-i18next"

export function TableHelpTooltip() {
  const { t } = useTranslation('media')
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
            <div className="font-semibold">{t('csvEditor.help.shortcuts')}</div>
            <div className="space-y-1">
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> / <kbd className="px-1 py-0.5 bg-muted rounded text-xs">F2</kbd> {t('csvEditor.help.editCell')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Tab</kbd> {t('csvEditor.help.moveNext')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+C</kbd> {t('csvEditor.help.copy')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+V</kbd> {t('csvEditor.help.paste')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Z</kbd> {t('csvEditor.help.undo')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Del</kbd> {t('csvEditor.help.delete')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Shift++</kbd> {t('csvEditor.help.insertRow')}</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Alt++</kbd> {t('csvEditor.help.insertColumn')}</div>
            </div>
            <div className="font-semibold">{t('csvEditor.help.mouseOps')}</div>
            <div className="space-y-1">
              <div>{t('csvEditor.help.clickSelect')}</div>
              <div>{t('csvEditor.help.doubleClickEdit')}</div>
              <div>{t('csvEditor.help.dragSelect')}</div>
              <div>{t('csvEditor.help.rightClickMenu')}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

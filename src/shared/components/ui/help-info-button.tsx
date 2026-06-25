"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { HelpCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"

interface HelpInfoButtonProps {
  content: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
}

export function HelpInfoButton({
  content,
  className,
  side = "bottom",
}: HelpInfoButtonProps) {
  const { t } = useTranslation("ui")
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 8
    let top = 0
    let left = 0
    switch (side) {
      case "top":
        top = r.top - gap
        left = r.left + r.width / 2
        break
      case "bottom":
        top = r.bottom + gap
        left = r.left + r.width / 2
        break
      case "left":
        top = r.top + r.height / 2
        left = r.left - gap
        break
      case "right":
        top = r.top + r.height / 2
        left = r.right + gap
        break
    }
    setPos({ top, left })
  }, [side])

  const handleClick = useCallback(() => {
    setOpen((prev) => {
      if (!prev) updatePosition()
      return !prev
    })
  }, [updatePosition])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  const transform: Record<string, string> = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className={cn("h-6 w-6 p-0", className)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleClick}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {open && (
        <div
          ref={panelRef}
          className={cn(
            "fixed z-[10000] w-72 rounded-md border shadow-md",
            "bg-white text-gray-900 border-gray-200",
            "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
          )}
          style={{ top: pos.top, left: pos.left, transform: transform[side] }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium">{t("ui.helpInfo.title")}</p>
          </div>
          <div className="px-4 pb-3 pt-2">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{content}</p>
          </div>
        </div>
      )}
    </>
  )
}

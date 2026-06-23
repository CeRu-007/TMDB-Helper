"use client"

import React, { useCallback } from "react"
import { useUploadStore, type FileEntry } from "@/stores/upload-store"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface ImageThumbnailProps {
  file: FileEntry
  size?: "sm" | "md" | "lg"
  showInfo?: boolean
  onDragStart?: (e: React.DragEvent, file: FileEntry) => void
}

export function ImageThumbnail({ file, size = "md", showInfo = false, onDragStart }: ImageThumbnailProps) {
  const uploadedPaths = useUploadStore((s) => s.uploadedPaths)
  const markAsUploaded = useUploadStore((s) => s.markAsUploaded)

  const isUploaded = uploadedPaths.includes(file.relativePath)

  const widthClass = {
    sm: "w-12",
    md: "w-full",
    lg: "w-40",
  }[size]

  const handleDragStartInternal = useCallback((e: React.DragEvent) => {
    if (isUploaded) return
    e.dataTransfer.setData("text/uri-list", file.thumbnailUrl || "")
    e.dataTransfer.setData("text/plain", file.name)
    e.dataTransfer.effectAllowed = "copy"
    if (file.fileObj) {
      e.dataTransfer.items.add(file.fileObj)
    }
    markAsUploaded(file.relativePath)
    onDragStart?.(e, file)
  }, [file, isUploaded, markAsUploaded, onDragStart])

  return (
    <div
      draggable={!isUploaded}
      onDragStart={handleDragStartInternal}
      className={cn(
        "relative group rounded-lg overflow-hidden border-2 transition-all duration-200 select-none",
        isUploaded
          ? "border-gray-200 dark:border-gray-700 opacity-50 grayscale cursor-default"
          : "border-transparent hover:border-blue-400 dark:hover:border-blue-500 cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-blue-500/10",
      )}
    >
      <div className={cn(widthClass, "flex items-center justify-center bg-gray-100 dark:bg-gray-800")}>
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="w-full h-auto object-contain max-h-48"
            draggable={false}
          />
        ) : (
          <div className="text-gray-400 text-xs py-4">{file.name.split(".").pop()?.toUpperCase()}</div>
        )}
      </div>

      {isUploaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <CheckCircle2 className="w-8 h-8 text-green-500 drop-shadow-lg" />
        </div>
      )}

      {showInfo && (
        <div className="px-1 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 truncate bg-white/80 dark:bg-gray-900/80">
          {file.name}
        </div>
      )}
    </div>
  )
}



"use client"

import React, { useMemo, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useUploadStore } from "@/stores/upload-store"
import { ImageThumbnail } from "./image-thumbnail"
import { cn } from "@/lib/utils"
import { ArrowUpDown, FolderOpen } from "lucide-react"

type SortKey = "name" | "size" | "type"
type SortDir = "asc" | "desc"

export function SinglePageView() {
  const { t } = useTranslation("upload-window")
  const files = useUploadStore((s) => s.files)
  const tree = useUploadStore((s) => s.tree)
  const columnPaths = useUploadStore((s) => s.columnPaths)
  const setColumnPath = useUploadStore((s) => s.setColumnPath)
  const uploadedPaths = useUploadStore((s) => s.uploadedPaths)

  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir("asc")
      return key
    })
  }, [])

  const allImages = useMemo(() => {
    return [...files].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "size": cmp = a.size - b.size; break
        case "type": cmp = a.type.localeCompare(b.type); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [files, sortKey, sortDir])

  const currentDir = columnPaths[columnPaths.length - 1]

  const handleDirClick = useCallback((path: string) => {
    setColumnPath(0, path)
  }, [setColumnPath])

  if (files.length === 0) return null

  const SortHeader = ({ label, sortKey: sk }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sk)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      {label}
      <ArrowUpDown className={cn("w-3 h-3", sortKey === sk ? "text-blue-500" : "")} />
    </button>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {tree.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          {tree.map((dir) => (
            <button
              key={dir.path}
              onClick={() => handleDirClick(dir.path)}
              className={cn(
                "text-xs px-2 py-0.5 rounded transition-colors whitespace-nowrap",
                currentDir === dir.path
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
            >
              {dir.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm z-10">
          <div className="col-span-1" />
          <div className="col-span-4"><SortHeader label={t("name")} sortKey="name" /></div>
          <div className="col-span-2"><SortHeader label={t("fileSize")} sortKey="size" /></div>
          <div className="col-span-2"><SortHeader label={t("type")} sortKey="type" /></div>
          <div className="col-span-2">{t("status")}</div>
        </div>

        {allImages.map((f) => (
          <div
            key={f.id}
            className={cn(
              "grid grid-cols-12 gap-2 items-center px-4 py-2 border-b border-gray-50 dark:border-gray-900 transition-colors",
              uploadedPaths.includes(f.relativePath)
                ? "opacity-50"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="col-span-1">
              <ImageThumbnail file={f} size="sm" />
            </div>
            <div className="col-span-4 text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</div>
            <div className="col-span-2 text-xs text-gray-400">{formatSize(f.size)}</div>
            <div className="col-span-2 text-xs text-gray-400">{f.type.split("/").pop()?.toUpperCase()}</div>
            <div className="col-span-2">
              {uploadedPaths.includes(f.relativePath) && (
                <span className="text-xs text-green-500 font-medium">{t("uploaded")}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

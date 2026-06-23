"use client"

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useUploadStore, type FileEntry } from "@/stores/upload-store"
import { DirectoryTreeView } from "./directory-tree-view"
import { SinglePageView } from "./single-page-view"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Pin,
  PinOff,
  Columns3,
  List,
  X,
  FolderOpen,
  ImageIcon,
  Loader2,
  ChevronRight,
  Home,
  ExternalLink,
} from "lucide-react"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]

interface UploadWindowProps {
  standalone?: boolean
}

export function UploadWindow({ standalone }: UploadWindowProps) {
  const { t } = useTranslation("upload-window")
  const isOpen = useUploadStore((s) => s.isOpen)
  const isPinned = useUploadStore((s) => s.isPinned)
  const layout = useUploadStore((s) => s.layout)
  const position = useUploadStore((s) => s.position)
  const size = useUploadStore((s) => s.size)
  const lastDirectoryName = useUploadStore((s) => s.lastDirectoryName)
  const files = useUploadStore((s) => s.files)
  const columnPaths = useUploadStore((s) => s.columnPaths)
  const goToLevel = useUploadStore((s) => s.goToLevel)
  const resetColumns = useUploadStore((s) => s.resetColumns)

  const breadcrumbs = useMemo(() => {
    const items: { label: string; level: number }[] = [{ label: lastDirectoryName || "root", level: -1 }]
    for (let i = 0; i < columnPaths.length; i++) {
      const p = columnPaths[i]
      if (p === null || p === undefined) continue
      const segments = p.split("/")
      items.push({ label: segments[segments.length - 1]!, level: i })
    }
    return items
  }, [columnPaths, lastDirectoryName])

  const togglePin = useUploadStore((s) => s.togglePin)
  const setLayout = useUploadStore((s) => s.setLayout)
  const setPosition = useUploadStore((s) => s.setPosition)
  const setOpen = useUploadStore((s) => s.setOpen)
  const loadFiles = useUploadStore((s) => s.loadFiles)
  const clearFiles = useUploadStore((s) => s.clearFiles)

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (standalone) return
    if (e.target !== dragHandleRef.current && !dragHandleRef.current?.contains(e.target as Node)) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position, standalone])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      })
    }
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, setPosition])

  const handleOpenDirectory = useCallback(async () => {
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.click()
    }
  }, [])

  const handleFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setIsLoading(true)
    try {
      const entries: FileEntry[] = []
      const dirNames = new Set<string>()

      let fileIdx = 0
      for (const file of fileList) {
        fileIdx++
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
        if (!IMAGE_EXTENSIONS.includes(ext)) continue

        const relativePath = (file as any).webkitRelativePath || file.name
        const parts = relativePath.replace(/\\/g, "/").split("/")
        const topDir = parts[0]
        if (parts.length > 1 && topDir) dirNames.add(topDir)

        const id = `file_${Date.now()}_${fileIdx}`
        const thumbnailUrl = URL.createObjectURL(file)

        entries.push({
          id,
          name: file.name,
          relativePath,
          size: file.size,
          type: file.type,
          isDirectory: false,
          thumbnailUrl,
          fileObj: file,
        })
      }

      const firstDir = [...dirNames][0]
      const dirName = firstDir ?? "图片"
      loadFiles(entries, dirName)
    } finally {
      setIsLoading(false)
    }
  }, [loadFiles])

  useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.thumbnailUrl) URL.revokeObjectURL(f.thumbnailUrl)
      }
    }
  }, [files])

  const handleClose = useCallback(() => {
    if (standalone) {
      window.close()
    } else {
      setOpen(false)
    }
  }, [standalone, setOpen])

  const handlePopOut = useCallback(() => {
    const url = new URL(window.location.origin + '/upload')
    window.open(url.toString(), 'tmdb-upload-panel', 'width=900,height=640,menubar=no,toolbar=no,location=no,status=no')
  }, [])

  if (!standalone && !isOpen) return null

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div
        ref={panelRef}
        className={cn(
          standalone
            ? "fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col overflow-hidden"
            : "fixed z-[9999] bg-white dark:bg-gray-950 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden transition-shadow",
          isPinned && !standalone ? "shadow-blue-500/10 border-blue-200 dark:border-blue-800" : "",
          isDragging && !standalone ? "shadow-2xl scale-[1.01]" : "",
        )}
        style={standalone ? undefined : {
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
        }}
      >
        <div
          ref={dragHandleRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("title")}</span>
            {lastDirectoryName && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1 truncate max-w-[150px]">
                — {lastDirectoryName}
              </span>
            )}
            {files.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                ({files.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={togglePin}
              title={isPinned ? t("unpin") : t("pin")}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-blue-500" /> : <Pin className="w-3.5 h-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => setLayout(layout === "tree" ? "list" : "tree")}
              title={t("switchLayout")}
            >
              {layout === "tree" ? <List className="w-3.5 h-3.5" /> : <Columns3 className="w-3.5 h-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              onClick={handleClose}
              title={t("close")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDirectory}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5" />
            )}
            {lastDirectoryName ? t("reopenDirectory") : t("openDirectory")}
          </Button>

          {lastDirectoryName && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1">
              {t("lastDirectory")}: {lastDirectoryName}
            </span>
          )}

          {!standalone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handlePopOut}
              title={t("popOut")}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={clearFiles}
            disabled={files.length === 0}
          >
            {t("close")}
          </Button>
        </div>

        {files.length > 0 && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 text-xs overflow-x-auto">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.level}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                <button
                  onClick={() => crumb.level === -1 ? resetColumns() : goToLevel(crumb.level)}
                  className={cn(
                    "px-1.5 py-0.5 rounded whitespace-nowrap transition-colors",
                    idx === breadcrumbs.length - 1
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                  )}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-gray-50/30 dark:bg-gray-900/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-400">{t("loading")}</span>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ImageIcon className="w-12 h-12 opacity-30" />
              <p className="text-sm">{t("selectDirectoryHint")}</p>
              <Button variant="outline" size="sm" onClick={handleOpenDirectory} className="gap-1.5">
                <FolderOpen className="w-4 h-4" />
                {t("openDirectory")}
              </Button>
            </div>
          ) : layout === "tree" ? (
            <DirectoryTreeView />
          ) : (
            <SinglePageView />
          )}
        </div>
      </div>
    </>
  )
}

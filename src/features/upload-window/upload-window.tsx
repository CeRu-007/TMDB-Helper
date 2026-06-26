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
  ExternalLink,
} from "lucide-react"
import { HelpInfoButton } from "@/shared/components/ui/help-info-button"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]
let fileIdCounter = 0

function readFileEntry(fileEntry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject)
  })
}

function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = []
  return new Promise((resolve, reject) => {
    function readBatch() {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries)
        } else {
          entries.push(...batch)
          readBatch()
        }
      }, reject)
    }
    readBatch()
  })
}

async function traverseDirectory(entry: FileSystemDirectoryEntry, path: string): Promise<{ name: string; relativePath: string; file: File }[]> {
  const results: { name: string; relativePath: string; file: File }[] = []
  const reader = entry.createReader()
  const entries = await readAllDirectoryEntries(reader)
  for (const child of entries) {
    if (child.isDirectory) {
      const sub = await traverseDirectory(child as FileSystemDirectoryEntry, path ? `${path}/${child.name}` : child.name)
      results.push(...sub)
    } else if (child.isFile) {
      const fileEntry = child as FileSystemFileEntry
      const file = await readFileEntry(fileEntry)
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
      if (IMAGE_EXTENSIONS.includes(ext)) {
        results.push({ name: file.name, relativePath: path ? `${path}/${file.name}` : file.name, file })
      }
    }
  }
  return results
}

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
  const lastDirectoryPath = useUploadStore((s) => s.lastDirectoryPath)
  const files = useUploadStore((s) => s.files)
  const columnPaths = useUploadStore((s) => s.columnPaths)
  const setColumnPath = useUploadStore((s) => s.setColumnPath)
  const resetColumns = useUploadStore((s) => s.resetColumns)

  const breadcrumbs = useMemo(() => {
    const items: { label: string; level: number }[] = [{ label: lastDirectoryName || "root", level: -1 }]
    const currentPath = columnPaths[columnPaths.length - 1]
    if (currentPath) {
      const segments = currentPath.split("/")
      for (let i = 0; i < segments.length; i++) {
        items.push({ label: segments[i]!, level: i })
      }
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
  const pipWindowRef = useRef<Window | null>(null)
  const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI

  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragCounter = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (standalone) return
    if (e.target !== dragHandleRef.current && !dragHandleRef.current?.contains(e.target as Node)) return
    if ((e.target as HTMLElement).closest?.("button, [role='button'], input, select, textarea, a")) return
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
    if (isElectron) {
      setIsLoading(true)
      try {
        const electronAPI = (window as any).electronAPI
        const result = await electronAPI?.openImageDirectory()
        if (result?.entries?.length > 0) {
          loadFiles(result.entries, result.dirName, result.dirPath)
        } else {
          clearFiles()
        }
      } finally {
        setIsLoading(false)
      }
      return
    }
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.click()
    }
  }, [loadFiles, clearFiles])

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

        fileIdCounter++
        const id = `file_${Date.now()}_${fileIdCounter}`
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
      const dirName = firstDir ?? t("defaultFolderName")
      loadFiles(entries, dirName)
    } finally {
      setIsLoading(false)
    }
  }, [loadFiles])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounter.current = 0

    if (isLoading) return

    const items = e.dataTransfer.items
    if (!items || items.length === 0) {
      if (e.dataTransfer.files?.length) {
        const plainFiles = Array.from(e.dataTransfer.files)
        const filtered = plainFiles.filter((f) => {
          const ext = "." + (f.name.split(".").pop()?.toLowerCase() ?? "")
          return IMAGE_EXTENSIONS.includes(ext)
        })
        if (filtered.length === 0) return
        setIsLoading(true)
        try {
          const entries: FileEntry[] = []
          for (const file of filtered) {
            fileIdCounter++
            entries.push({
              id: `file_${Date.now()}_${fileIdCounter}`,
              name: file.name,
              relativePath: file.name,
              size: file.size,
              type: file.type,
              isDirectory: false,
              thumbnailUrl: URL.createObjectURL(file),
              fileObj: file,
            })
          }
          loadFiles(entries, t("defaultFolderName"))
        } finally {
          setIsLoading(false)
        }
      }
      return
    }

    setIsLoading(true)
    try {
      const allResults: { name: string; relativePath: string; file: File }[] = []
      const topDirNames = new Set<string>()

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item) continue
        const entry = item.webkitGetAsEntry()
        if (!entry) {
          const file = item.getAsFile()
          if (file) {
            const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
            if (IMAGE_EXTENSIONS.includes(ext)) {
              allResults.push({ name: file.name, relativePath: file.name, file })
            }
          }
          continue
        }
        if (entry.isDirectory) {
          const results = await traverseDirectory(entry as FileSystemDirectoryEntry, entry.name)
          allResults.push(...results)
          if (results.length > 0) topDirNames.add(entry.name)
        } else if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry
          const file = await readFileEntry(fileEntry)
          const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "")
          if (IMAGE_EXTENSIONS.includes(ext)) {
            allResults.push({ name: file.name, relativePath: file.name, file })
          }
        }
      }

      if (allResults.length === 0) return

      const entries: FileEntry[] = []
      for (const r of allResults) {
        fileIdCounter++
        entries.push({
          id: `file_${Date.now()}_${fileIdCounter}`,
          name: r.name,
          relativePath: r.relativePath,
          size: r.file.size,
          type: r.file.type,
          isDirectory: false,
          thumbnailUrl: URL.createObjectURL(r.file),
          fileObj: r.file,
        })
      }

      const dirName = [...topDirNames][0] ?? t("defaultFolderName")
      loadFiles(entries, dirName)
    } finally {
      setIsLoading(false)
    }
  }, [loadFiles, isLoading])

  useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.thumbnailUrl) URL.revokeObjectURL(f.thumbnailUrl)
      }
    }
  }, [files])

  const restoredRef = useRef(false)

  // 弹窗传输数据恢复 (opener/PiP — 浏览器或 Electron 均可)
  useEffect(() => {
    const data = (window as any).opener?.__uploadTransferData || (window as any).parent?.__uploadTransferData
    if (!data?.files?.length) return
    restoredRef.current = true
    const entries = data.files.map((f: any) => ({
      id: f.id, name: f.name, relativePath: f.relativePath,
      size: f.size, type: f.type, isDirectory: f.isDirectory ?? false,
      thumbnailUrl: f.fileObj ? URL.createObjectURL(f.fileObj) : f.thumbnailUrl,
      fileObj: f.fileObj,
    }))
    if (entries.length > 0) {
      loadFiles(entries, data.dirName, useUploadStore.getState().lastDirectoryPath || undefined)
    }
    try { delete (window as any).opener?.__uploadTransferData } catch (_) {}
    try { delete (window as any).parent?.__uploadTransferData } catch (_) {}
  }, [loadFiles])

  // Electron 挂载时从磁盘恢复（仅当未被传输数据覆盖时执行一次）
  useEffect(() => {
    if (!isElectron || !lastDirectoryPath || restoredRef.current) return
    restoredRef.current = true

    setIsLoading(true)
    const restore = async () => {
      try {
        const electronAPI = (window as any).electronAPI
        const result = await electronAPI?.openImageDirectory(lastDirectoryPath)
        if (result?.entries?.length > 0) {
          loadFiles(result.entries, result.dirName, result.dirPath)
        }
      } catch (_) { /* restore failed */ } finally {
        setIsLoading(false)
      }
    }

    restore()
  }, [lastDirectoryPath, loadFiles])

  useEffect(() => {
    if (!standalone || !isPinned) return
    if ((window as any).electronAPI?.setAlwaysOnTop) {
      (window as any).electronAPI.setAlwaysOnTop(true)
      return () => { (window as any).electronAPI?.setAlwaysOnTop(false) }
    }
    const handleBlur = () => {
      setTimeout(() => window.focus(), 50)
    }
    window.addEventListener("blur", handleBlur)
    return () => window.removeEventListener("blur", handleBlur)
  }, [standalone, isPinned])

  const handleClose = useCallback(() => {
    if (standalone) {
      if (window.parent !== window) {
        window.parent.postMessage("pip-close", "*")
      } else {
        window.close()
      }
    } else {
      setOpen(false)
    }
  }, [standalone, setOpen])

  const handlePopOut = useCallback(async () => {
    const state = useUploadStore.getState()

    const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI

    if (isElectron) {
      // Electron: 传递 base64 thumbnailUrl（可序列化）
      const transferFiles = state.files.map((f) => ({
        id: f.id, name: f.name, relativePath: f.relativePath,
        size: f.size, type: f.type, isDirectory: f.isDirectory,
        thumbnailUrl: f.thumbnailUrl,
      }))
      ;(window as any).__uploadTransferData = { files: transferFiles, dirName: state.lastDirectoryName }
    } else {
      // 浏览器: 传递 File 对象（不可序列化，用全局变量引用）
      const transferFiles = state.files.filter((f) => f.fileObj).map((f) => ({
        id: f.id, name: f.name, relativePath: f.relativePath,
        size: f.size, type: f.type, fileObj: f.fileObj,
      }))
      ;(window as any).__uploadTransferData = { files: transferFiles, dirName: state.lastDirectoryName }
    }
    setTimeout(() => { delete (window as any).__uploadTransferData }, 30000)

    if (!isElectron && "documentPictureInPicture" in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 900,
          height: 640,
        })

        const state2 = useUploadStore.getState()
        const pipTransferFiles = state2.files.filter((f) => f.fileObj).map((f) => ({
          id: f.id, name: f.name, relativePath: f.relativePath,
          size: f.size, type: f.type, fileObj: f.fileObj,
        }))
        ;(pipWindow as any).__uploadTransferData = { files: pipTransferFiles, dirName: state2.lastDirectoryName }
        pipWindow.addEventListener("pagehide", () => {
          delete (pipWindow as any).__uploadTransferData
        })

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join("\n")

        const theme = document.documentElement.classList.contains("dark") ? "dark" : "light"

        pipWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TMDB Upload</title>
  ${styles}
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { display: block; width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${window.location.origin}/upload?theme=${theme}"></iframe>
</body>
</html>`)
        pipWindow.document.close()

        pipWindowRef.current = pipWindow

        const onMessage = (e: MessageEvent) => {
          if (e.data === "pip-close") {
            pipWindow.close()
            pipWindowRef.current = null
          }
        }
        window.addEventListener("message", onMessage)

        pipWindow.addEventListener("pagehide", () => {
          pipWindowRef.current = null
          window.removeEventListener("message", onMessage)
        })

        if (!standalone) setOpen(false)
        delete (window as any).__uploadTransferData
        return
      } catch (_) {
        // PiP not supported or rejected, fall through
      }
    }

    const url = new URL(window.location.origin + "/upload")
    window.open(url.toString(), "tmdb-upload-panel", "width=900,height=640,menubar=no,toolbar=no,location=no,status=no")
    if (!standalone) setOpen(false)
  }, [standalone, setOpen])

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
          isPinned && standalone ? "ring-2 ring-blue-500/40" : "",
          isDragging && !standalone ? "shadow-2xl scale-[1.01]" : "",
          isDragOver ? "ring-2 ring-blue-500 border-blue-500" : "",
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
            standalone && isElectron && "electron-drag-region",
          )}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("title")}</span>
            <HelpInfoButton
              content={t("helpDescription")}
            />
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
              className={cn("w-7 h-7", standalone && isElectron && "electron-no-drag")}
              onClick={togglePin}
              title={isPinned ? t("unpin") : t("pin")}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-blue-500" /> : <Pin className="w-3.5 h-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn("w-7 h-7", standalone && isElectron && "electron-no-drag")}
              onClick={() => setLayout(layout === "tree" ? "list" : "tree")}
              title={t("switchLayout")}
            >
              {layout === "tree" ? <List className="w-3.5 h-3.5" /> : <Columns3 className="w-3.5 h-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn("w-7 h-7 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500", standalone && isElectron && "electron-no-drag")}
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
                  onClick={() => {
                    if (crumb.level === -1) {
                      resetColumns()
                      return
                    }
                    const currentPath = columnPaths[columnPaths.length - 1]
                    const segments = currentPath?.split("/") ?? []
                    const targetPath = segments.slice(0, crumb.level + 1).join("/")
                    if (targetPath && targetPath !== currentPath) {
                      setColumnPath(0, targetPath)
                    }
                  }}
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

        <div className="flex-1 overflow-hidden bg-gray-50/30 dark:bg-gray-900/30 relative">
          {isDragOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-sm">
              <ImageIcon className="w-12 h-12 text-blue-400" />
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{t("dragDropFolderHint")}</p>
            </div>
          )}
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

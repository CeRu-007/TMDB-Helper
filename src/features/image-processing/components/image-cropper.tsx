"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { VisualCropEditor, type CropArea } from "./visual-crop-editor"
import { Upload, Download, FileImage, Loader2, Lock, Unlock } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { logger } from "@/lib/utils/logger"

interface ImageInfo {
  url: string
  name: string
  width: number
  height: number
  size: number
}

const ASPECT_RATIOS = [
  { key: "2:3" as const, value: 2 / 3, label: "2:3 标准海报" },
  { key: "3:4" as const, value: 3 / 4, label: "3:4 竖版海报" },
  { key: "16:9" as const, value: 16 / 9, label: "16:9 背景幕布" }
]

type RatioKey = "2:3" | "3:4" | "16:9"

const TMDB_PRESETS: Record<RatioKey, { label: string; w: number; h: number }[]> = {
  "2:3": [
    { label: "500×750", w: 500, h: 750 },
    { label: "1000×1500", w: 1000, h: 1500 },
    { label: "1500×2250", w: 1500, h: 2250 },
    { label: "2000×3000", w: 2000, h: 3000 }
  ],
  "3:4": [
    { label: "500×667", w: 500, h: 667 },
    { label: "1000×1334", w: 1000, h: 1334 },
    { label: "1500×2000", w: 1500, h: 2000 },
    { label: "2000×2667", w: 2000, h: 2667 }
  ],
  "16:9": [
    { label: "1280×720", w: 1280, h: 720 },
    { label: "1920×1080", w: 1920, h: 1080 },
    { label: "2560×1440", w: 2560, h: 1440 },
    { label: "3840×2160", w: 3840, h: 2160 }
  ]
}

function getDefaultCrop(w: number, h: number, ratio: number): CropArea {
  if (w / h > ratio) {
    const cropW = h * ratio
    return { x: Math.round((w - cropW) / 2), y: 0, width: Math.round(cropW), height: h }
  }
  const cropH = w / ratio
  return { x: 0, y: Math.round((h - cropH) / 2), width: w, height: Math.round(cropH) }
}

function triggerDownload(dataUrl: string, fileName: string, suffix: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "")
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = `${baseName}_${suffix}.jpg`
  document.body.appendChild(link)
  link.click()
  setTimeout(() => document.body.removeChild(link), 50)
}

export function ImageCropper() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [aspectRatio, setAspectRatio] = useState<"2:3" | "3:4" | "16:9">("2:3")
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [quality, setQuality] = useState(90)
  const [outW, setOutW] = useState(0)
  const [outH, setOutH] = useState(0)
  const [aspectLocked, setAspectLocked] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  const image = images[selectedIndex] ?? null
  const currentRatio = ASPECT_RATIOS.find((r) => r.key === aspectRatio)!

  const handleUpload = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
      if (imageFiles.length === 0) {
        toast({ title: "请选择图片文件", variant: "destructive" })
        return
      }

      const newImages: ImageInfo[] = []
      let loaded = 0

      imageFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          const img = new Image()
          img.onload = () => {
            newImages.push({ url: dataUrl, name: file.name, width: img.width, height: img.height, size: file.size })
            loaded++
            if (loaded === imageFiles.length) {
              const allImages = [...images, ...newImages]
              setImages(allImages)
              setSelectedIndex(images.length)
              const firstNew = newImages[0]
              const crop = getDefaultCrop(firstNew.width, firstNew.height, 2 / 3)
              setCropArea(crop)
              setOutW(crop.width)
              setOutH(crop.height)
              setAspectRatio("2:3")
            }
          }
          img.src = dataUrl
        }
        reader.readAsDataURL(file)
      })
    },
    [images, toast]
  )

  const handleSelectImage = useCallback(
    (index: number) => {
      const img = images[index]
      if (!img) return
      setSelectedIndex(index)
      const crop = getDefaultCrop(img.width, img.height, currentRatio.value)
      setCropArea(crop)
      setOutW(crop.width)
      setOutH(crop.height)
    },
    [images, currentRatio]
  )

  const handleAspectRatioChange = useCallback(
    (key: "2:3" | "3:4" | "16:9") => {
      setAspectRatio(key)
      if (image) {
        const ratio = ASPECT_RATIOS.find((r) => r.key === key)!.value
        const crop = getDefaultCrop(image.width, image.height, ratio)
        setCropArea(crop)
        setOutW(crop.width)
        setOutH(crop.height)
      }
    },
    [image]
  )

  const handleCropChange = useCallback((crop: CropArea) => {
    setCropArea(crop)
  }, [])

  const handleResetCrop = useCallback(() => {
    if (image) {
      setCropArea(getDefaultCrop(image.width, image.height, currentRatio.value))
    }
  }, [image, currentRatio])

  const processOneImage = useCallback(
    async (img: ImageInfo, crop: CropArea): Promise<string> => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas context not available")

      const w = outW > 0 ? outW : crop.width
      const h = outH > 0 ? outH : Math.round(w / (crop.width / crop.height))
      canvas.width = w
      canvas.height = h

      const imageEl = new Image()
      imageEl.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        imageEl.onload = () => resolve()
        imageEl.onerror = reject
        imageEl.src = img.url
      })

      ctx.drawImage(imageEl, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h)
      return canvas.toDataURL("image/jpeg", quality / 100)
    },
    [outW, outH, quality]
  )

  const handleDownload = useCallback(async () => {
    if (!image || !cropArea) return
    setIsProcessing(true)
    try {
      const resultUrl = await processOneImage(image, cropArea)
      triggerDownload(resultUrl, image.name, aspectRatio.replace(":", "x"))
      toast({ title: "裁切完成" })
    } catch (error) {
      logger.error("Crop failed:", error)
      toast({ title: "裁切失败", description: "请重试", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }, [image, cropArea, processOneImage, aspectRatio, toast])

  const handleDownloadAll = useCallback(async () => {
    if (images.length === 0 || !cropArea) return
    setIsBatchProcessing(true)
    let success = 0
    for (let i = 0; i < images.length; i++) {
      try {
        const img = images[i]
        const crop = getDefaultCrop(img.width, img.height, currentRatio.value)
        const resultUrl = await processOneImage(img, crop)
        triggerDownload(resultUrl, img.name, aspectRatio.replace(":", "x"))
        success++
      } catch (e) {
        logger.error(`Batch crop failed for ${images[i]?.name}:`, e)
      }
    }
    toast({ title: `裁切完成 (${success}/${images.length})` })
    setIsBatchProcessing(false)
  }, [images, cropArea, aspectRatio, currentRatio, processOneImage, toast])

  const handleToggleLock = useCallback(() => {
    setAspectLocked((prev) => {
      if (!prev && cropArea) {
        setOutW(cropArea.width)
        setOutH(cropArea.height)
      }
      return !prev
    })
  }, [cropArea])

  const handleOutWChange = useCallback(
    (value: number) => {
      const w = Math.max(1, value)
      setOutW(w)
      if (aspectLocked && cropArea) {
        setOutH(Math.round(w / (cropArea.width / cropArea.height)))
      }
    },
    [aspectLocked, cropArea]
  )

  const handleOutHChange = useCallback(
    (value: number) => {
      const h = Math.max(1, value)
      setOutH(h)
      if (aspectLocked && cropArea) {
        setOutW(Math.round(h * (cropArea.width / cropArea.height)))
      }
    },
    [aspectLocked, cropArea]
  )

  const handlePresetClick = useCallback((preset: { w: number; h: number }) => {
    setOutW(preset.w)
    setOutH(preset.h)
  }, [])

  return (
    <div className="h-full w-full bg-gray-50">
      {!image ? (
        <div className="h-full flex items-center justify-center p-8">
          <div
            className="w-full max-w-lg border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-white"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files) }}
          >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = "" }
                }}
              />
              <FileImage className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-medium mb-1">拖拽图片到此处或点击上传</h3>
              <p className="text-sm text-muted-foreground mb-6">支持 JPG、PNG、WebP 格式，可批量上传</p>
            <Button variant="default" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              选择文件
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full flex min-h-0">
          {/* Left Sidebar */}
          <aside className="w-64 shrink-0 bg-white border-r flex flex-col overflow-y-auto">
            <div className="p-4 space-y-5">
              {/* File info + thumbnails */}
              <div>
                <p className="text-sm font-medium truncate text-gray-700" title={image.name}>{image.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{image.width} × {image.height}</p>
                {images.length > 1 && (
                  <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectImage(i)}
                        className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                          i === selectedIndex ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Aspect Ratio */}
              <div>
                <h4 className="text-xs text-gray-500 mb-2 font-medium">裁切比例</h4>
                <div className="space-y-1">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => handleAspectRatioChange(r.key)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                        aspectRatio === r.key
                          ? "bg-blue-500 text-white font-medium"
                          : "text-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Size */}
              <div>
                <h4 className="text-xs text-gray-500 mb-2 font-medium">输出尺寸</h4>
                <div className="flex items-center gap-1 min-w-0">
                  <input
                    type="number"
                    min={1}
                    value={outW}
                    onChange={(e) => handleOutWChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-0 flex-1 h-8 px-1.5 text-sm bg-white border border-gray-200 rounded-md text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-gray-400 shrink-0">×</span>
                  <input
                    type="number"
                    min={1}
                    value={outH}
                    onChange={(e) => handleOutHChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-0 flex-1 h-8 px-1.5 text-sm bg-white border border-gray-200 rounded-md text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={handleToggleLock}
                    className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-md transition-colors ${
                      aspectLocked
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                    }`}
                  >
                    {aspectLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* TMDB Presets */}
              <div>
                <h4 className="text-xs text-gray-500 mb-2 font-medium">TMDB 推荐尺寸</h4>
                <div className="space-y-1">
                  {TMDB_PRESETS[aspectRatio].map((p) => {
                    const isActive = outW === p.w && outH === p.h
                    return (
                      <button
                        key={p.label}
                        onClick={() => handlePresetClick(p)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-blue-500 text-white font-medium"
                            : "bg-white text-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-gray-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Quality + Download */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">输出质量</span>
                  <span className="text-sm font-medium text-gray-700">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <Button
                  className="w-full h-9"
                  size="default"
                  onClick={handleDownload}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? "处理中..." : "下载裁切结果"}
                </Button>
                {images.length > 1 && (
                  <Button
                    className="w-full h-9"
                    variant="outline"
                    size="default"
                    onClick={handleDownloadAll}
                    disabled={isBatchProcessing}
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isBatchProcessing ? "处理中..." : `下载全部 (${images.length}张)`}
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Right: Image Preview */}
          <div className="flex-1 min-h-0 p-4">
            <div className="bg-white rounded-xl shadow-sm h-full overflow-hidden">
              <VisualCropEditor
                key={`${image.url}-${aspectRatio}`}
                imageUrl={image.url}
                imageName={image.name}
                imageWidth={image.width}
                imageHeight={image.height}
                aspectRatio={currentRatio.value}
                onCropChange={handleCropChange}
                onReset={handleResetCrop}
                {...(cropArea ? { initialCrop: cropArea } : {})}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

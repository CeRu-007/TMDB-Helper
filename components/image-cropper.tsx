"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { VisualCropEditor } from "./visual-crop-editor"
import {
  Upload,
  Download,
  Image as ImageIcon,
  Scissors,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Settings,
  Info,
  Trash2,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown
} from "lucide-react"

// 图片信息接口
interface ImageInfo {
  id: string
  file: File
  name: string
  size: number
  width: number
  height: number
  aspectRatio: number
  url: string
  isProcessed: boolean
  processedUrl?: string
  cropSettings?: CropSettings
}

// 裁切设置接口
interface CropSettings {
  x: number
  y: number
  width: number
  height: number
  outputWidth: number
  outputHeight: number
  quality: number
  format: 'jpg' | 'png' | 'webp'
}

// 预设分辨率
const PRESET_RESOLUTIONS = [
  { name: "720p", width: 1280, height: 720 },
  { name: "1080p", width: 1920, height: 1080 },
  { name: "1440p", width: 2560, height: 1440 },
  { name: "4K", width: 3840, height: 2160 },
  { name: "自定义", width: 0, height: 0 }
]

// 输出格式选项
const OUTPUT_FORMATS = [
  { value: 'jpg', label: 'JPG', description: '适合照片，文件较小' },
  { value: 'png', label: 'PNG', description: '支持透明，质量更高' },
  { value: 'webp', label: 'WebP', description: '现代格式，压缩率高' }
] as const

export function ImageCropper() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  
  // 裁切相关状态
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    outputWidth: 1280,
    outputHeight: 720,
    quality: 90,
    format: 'jpg'
  })
  
  // 全局设置
  const [globalSettings, setGlobalSettings] = useState({
    autoProcess: true,
    autoProcessNon16x9: false, // 新增：自动处理非16:9图片
    defaultQuality: 90,
    defaultFormat: 'jpg' as 'jpg' | 'png' | 'webp',
    batchNaming: 'original',
    outputResolution: '1080p'
  })

  // 加载保存的设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('imageCropperSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setGlobalSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }, [])

  // 保存设置到localStorage
  const saveSettings = useCallback((settings: typeof globalSettings) => {
    try {
      localStorage.setItem('imageCropperSettings', JSON.stringify(settings))
      toast({
        title: "设置已保存",
        description: "您的偏好设置已成功保存",
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      toast({
        title: "保存失败",
        description: "设置保存失败，请重试",
        variant: "destructive",
      })
    }
  }, [toast])

  // 重置设置
  const resetSettings = useCallback(() => {
    const defaultSettings = {
      autoProcess: true,
      autoProcessNon16x9: false,
      defaultQuality: 90,
      defaultFormat: 'jpg' as const,
      batchNaming: 'original',
      outputResolution: '1080p'
    }
    setGlobalSettings(defaultSettings)
    saveSettings(defaultSettings)
  }, [saveSettings])

  // 更新设置的辅助函数
  const updateGlobalSettings = useCallback((updates: Partial<typeof globalSettings>) => {
    console.log('更新设置:', updates) // 调试信息
    setGlobalSettings(prev => {
      const newSettings = { ...prev, ...updates }
      console.log('新设置:', newSettings) // 调试信息
      // 立即保存到localStorage
      try {
        localStorage.setItem('imageCropperSettings', JSON.stringify(newSettings))
        console.log('设置已保存到localStorage') // 调试信息
      } catch (error) {
        console.error('自动保存设置失败:', error)
      }
      return newSettings
    })
  }, [])

  // 检查图片是否为16:9比例
  const isAspectRatio16x9 = (width: number, height: number): boolean => {
    const ratio = width / height
    return Math.abs(ratio - (16/9)) < 0.01 // 允许小误差
  }

  // 计算自动裁切设置
  const calculateAutoCrop = (image: ImageInfo): CropSettings => {
    const { width, height } = image
    const targetRatio = 16 / 9
    
    if (isAspectRatio16x9(width, height)) {
      // 已经是16:9，根据分辨率调整
      let outputWidth = width
      let outputHeight = height
      
      if (width < 1280 || height < 720) {
        // 低于720p，调整到720p
        outputWidth = 1280
        outputHeight = 720
      } else if (width > 3840 || height > 2160) {
        // 高于4K，调整到4K
        outputWidth = 3840
        outputHeight = 2160
      }
      
      return {
        x: 0,
        y: 0,
        width,
        height,
        outputWidth,
        outputHeight,
        quality: globalSettings.defaultQuality,
        format: globalSettings.defaultFormat
      }
    } else {
      // 非16:9，需要手动裁切
      const currentRatio = width / height
      let cropWidth = width
      let cropHeight = height
      let x = 0
      let y = 0
      
      if (currentRatio > targetRatio) {
        // 图片太宽，裁切宽度
        cropWidth = height * targetRatio
        x = (width - cropWidth) / 2
      } else {
        // 图片太高，裁切高度
        cropHeight = width / targetRatio
        y = (height - cropHeight) / 2
      }
      
      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
        outputWidth: Math.round(cropWidth),
        outputHeight: Math.round(cropHeight),
        quality: globalSettings.defaultQuality,
        format: globalSettings.defaultFormat
      }
    }
  }

  // 处理文件上传
  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast({
        title: "没有图片文件",
        description: "请上传图片文件 (JPG, PNG, WebP 等)",
        variant: "destructive",
      })
      return
    }
    
    // 处理每个图片文件
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const imageInfo: ImageInfo = {
            id: `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            file,
            name: file.name,
            size: file.size,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            url: e.target?.result as string,
            isProcessed: false
          }
          
          // 自动处理逻辑
          if (globalSettings.autoProcess && isAspectRatio16x9(img.width, img.height)) {
            // 16:9图片自动处理
            const autoCropSettings = calculateAutoCrop(imageInfo)
            imageInfo.cropSettings = autoCropSettings
            processImage(imageInfo, autoCropSettings)
          } else if (globalSettings.autoProcessNon16x9 && !isAspectRatio16x9(img.width, img.height)) {
            // 非16:9图片自动处理（居中裁切）
            const autoCropSettings = calculateAutoCrop(imageInfo)
            imageInfo.cropSettings = autoCropSettings
            processImage(imageInfo, autoCropSettings)
          }
          
          setImages(prev => [...prev, imageInfo])
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
    
    toast({
      title: "图片上传成功",
      description: `已上传 ${imageFiles.length} 张图片`,
    })
  }, [globalSettings.autoProcess, globalSettings.autoProcessNon16x9, globalSettings.defaultQuality, globalSettings.defaultFormat])

  // 处理拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // 处理图片裁切
  const processImage = async (image: ImageInfo, settings: CropSettings) => {
    setIsProcessing(true)
    setProcessingProgress(0)
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文')
      }
      
      // 设置输出尺寸
      canvas.width = settings.outputWidth
      canvas.height = settings.outputHeight
      
      // 加载原始图片
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = image.url
      })
      
      setProcessingProgress(50)
      
      // 绘制裁切后的图片
      ctx.drawImage(
        img,
        settings.x, settings.y, settings.width, settings.height,
        0, 0, settings.outputWidth, settings.outputHeight
      )
      
      setProcessingProgress(80)
      
      // 转换为指定格式
      const mimeType = `image/${settings.format === 'jpg' ? 'jpeg' : settings.format}`
      const quality = settings.format === 'jpg' ? settings.quality / 100 : undefined
      const processedUrl = canvas.toDataURL(mimeType, quality)
      
      setProcessingProgress(100)
      
      // 更新图片信息
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, isProcessed: true, processedUrl, cropSettings: settings }
          : img
      ))
      
      toast({
        title: "处理完成",
        description: `图片 ${image.name} 已成功处理`,
      })
      
    } catch (error) {
      console.error('图片处理失败:', error)
      toast({
        title: "处理失败",
        description: "图片处理过程中出现错误",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  // 下载处理后的图片
  const downloadImage = (image: ImageInfo) => {
    if (!image.processedUrl) return
    
    const link = document.createElement('a')
    const extension = image.cropSettings?.format || 'jpg'
    const filename = `${image.name.replace(/\.[^/.]+$/, "")}_cropped.${extension}`
    
    link.href = image.processedUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "下载完成",
      description: `图片 ${filename} 已下载`,
    })
  }

  // 复制图片到剪贴板
  const copyImageToClipboard = async (imageUrl: string, imageName: string): Promise<boolean> => {
    try {
      // 检查剪贴板API支持
      if (!navigator.clipboard || !navigator.clipboard.write) {
        console.warn('剪贴板API不支持')
        return false
      }

      // 将dataURL转换为blob
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // 创建ClipboardItem
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      })

      // 写入剪贴板
      await navigator.clipboard.write([clipboardItem])
      return true
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      return false
    }
  }

  // 批量下载（改进版：逐个下载 + 剪贴板集成）
  const downloadAll = async () => {
    const processedImages = images.filter(img => img.isProcessed && img.processedUrl)

    if (processedImages.length === 0) {
      toast({
        title: "没有可下载的图片",
        description: "请先处理图片",
        variant: "destructive",
      })
      return
    }

    // 设置下载状态
    setIsProcessing(true)
    setProcessingProgress(0)

    let successCount = 0
    let clipboardSuccessCount = 0
    const totalImages = processedImages.length

    try {
      for (let i = 0; i < processedImages.length; i++) {
        const image = processedImages[i]
        const currentIndex = i + 1

        // 更新进度
        const progress = Math.round((i / totalImages) * 100)
        setProcessingProgress(progress)

        try {
          if (image.processedUrl) {
            // 下载图片
            const link = document.createElement('a')
            const extension = image.cropSettings?.format || 'jpg'
            const filename = `${image.name.replace(/\.[^/.]+$/, "")}_cropped.${extension}`

            link.href = image.processedUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // 尝试复制到剪贴板
            const clipboardSuccess = await copyImageToClipboard(image.processedUrl, image.name)
            if (clipboardSuccess) {
              clipboardSuccessCount++
            }

            successCount++

            // 显示单张图片处理完成提示
            toast({
              title: `图片 ${currentIndex}/${totalImages} 下载完成`,
              description: clipboardSuccess
                ? `${filename} 已下载并复制到剪贴板`
                : `${filename} 已下载${navigator.clipboard ? '（剪贴板复制失败）' : ''}`,
            })

            // 添加短暂延迟，避免下载过快
            if (i < processedImages.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        } catch (error) {
          console.error(`下载图片 ${image.name} 失败:`, error)
          toast({
            title: `图片 ${currentIndex}/${totalImages} 下载失败`,
            description: `${image.name} 下载过程中出现错误`,
            variant: "destructive",
          })
        }
      }

      // 完成进度
      setProcessingProgress(100)

      // 显示总结信息
      const clipboardInfo = clipboardSuccessCount > 0
        ? `其中 ${clipboardSuccessCount} 张已复制到剪贴板，您可以直接粘贴使用。`
        : navigator.clipboard
          ? '剪贴板复制功能遇到问题，但文件下载正常。'
          : '您的浏览器不支持剪贴板功能，但文件下载正常。'

      toast({
        title: "批量下载完成",
        description: `成功下载 ${successCount}/${totalImages} 张图片。${clipboardInfo}`,
        duration: 6000, // 延长显示时间
      })

    } catch (error) {
      console.error('批量下载过程中出现错误:', error)
      toast({
        title: "批量下载出现错误",
        description: "部分图片可能下载失败，请检查并重试",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  // 清除所有图片
  const clearAll = () => {
    setImages([])
    setSelectedImage(null)
    toast({
      title: "已清除",
      description: "所有图片已清除",
    })
  }

  // 删除单张图片
  const deleteImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
    if (selectedImage?.id === imageId) {
      setSelectedImage(null)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 渲染图片卡片
  const renderImageCard = (image: ImageInfo) => (
    <Card key={image.id} className="relative group">
      <CardContent className="p-4">
        <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
          <img
            src={image.processedUrl || image.url}
            alt={image.name}
            className="w-full h-full object-cover"
          />

          {/* 状态指示器 */}
          <div className="absolute top-2 right-2">
            {image.isProcessed ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                已处理
              </Badge>
            ) : isAspectRatio16x9(image.width, image.height) ? (
              <Badge variant="secondary">
                <Info className="h-3 w-3 mr-1" />
                16:9
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                需裁切
              </Badge>
            )}
          </div>

          {/* 悬停操作按钮 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {!image.isProcessed && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedImage(image)
                  setCropSettings(calculateAutoCrop(image))
                  setShowCropDialog(true)
                }}
              >
                <Scissors className="h-4 w-4 mr-1" />
                裁切
              </Button>
            )}

            {image.isProcessed && (
              <Button
                size="sm"
                onClick={() => downloadImage(image)}
              >
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteImage(image.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 图片信息 */}
        <div className="space-y-1">
          <p className="text-sm font-medium truncate" title={image.name}>
            {image.name}
          </p>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{image.width} × {image.height}</span>
            <span>{formatFileSize(image.size)}</span>
          </div>
          {image.cropSettings && (
            <div className="text-xs text-muted-foreground">
              输出: {image.cropSettings.outputWidth} × {image.cropSettings.outputHeight}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <ImageIcon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">没有图片</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        上传图片文件进行16:9比例裁切，支持 JPG、PNG、WebP 等常见图片格式
      </p>
      <div className="flex flex-row gap-2">
        <Button
          className="flex items-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          上传图片
        </Button>
        <Button
          variant="outline"
          className="flex items-center"
          onClick={() => setShowHelpDialog(true)}
        >
          <Info className="mr-2 h-4 w-4" />
          使用说明
        </Button>
      </div>
    </div>
  )

  // 主渲染
  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />

          {/* 头部工具栏 */}
          <div className="flex flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Scissors className="h-6 w-6" />
                分集图片裁切
              </h2>
              <p className="text-muted-foreground mt-1">
                将图片裁切为16:9比例，适用于分集封面图片处理
              </p>
            </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            设置
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelpDialog(true)}
          >
            <Info className="h-4 w-4 mr-1" />
            帮助
          </Button>

          {images.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清除全部
              </Button>

              <Button
                size="sm"
                onClick={downloadAll}
                disabled={!images.some(img => img.isProcessed) || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    下载中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    下载全部
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 上传区域 */}
      {images.length === 0 && (
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">拖拽图片到此处或点击上传</p>
          <p className="text-sm text-muted-foreground">
            支持 JPG、PNG、WebP 格式，可同时上传多张图片
          </p>
        </div>
      )}

      {/* 处理进度 */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">正在处理图片...</p>
                <Progress value={processingProgress} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground">
                {processingProgress}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图片网格 */}
      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {images.map(renderImageCard)}
        </div>
      ) : (
        renderEmptyState()
      )}

      {/* 裁切对话框 */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              图片裁切
            </DialogTitle>
            <DialogDescription>
              调整裁切区域以获得16:9比例的图片
            </DialogDescription>
          </DialogHeader>

          {selectedImage && (
            <div className="space-y-6 py-4">
              {/* 可视化裁切编辑器 */}
              <VisualCropEditor
                imageUrl={selectedImage.url}
                imageName={selectedImage.name}
                imageWidth={selectedImage.width}
                imageHeight={selectedImage.height}
                initialCrop={{
                  x: cropSettings.x,
                  y: cropSettings.y,
                  width: cropSettings.width,
                  height: cropSettings.height
                }}
                onCropChange={(crop) => {
                  setCropSettings(prev => ({
                    ...prev,
                    x: crop.x,
                    y: crop.y,
                    width: crop.width,
                    height: crop.height,
                    outputWidth: crop.width,
                    outputHeight: crop.height
                  }))
                }}
                onReset={() => {
                  if (selectedImage) {
                    setCropSettings(calculateAutoCrop(selectedImage))
                  }
                }}
              />

                {/* 输出设置 */}
                <div className="space-y-4">
                    <h4 className="font-medium">输出设置</h4>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>输出格式</Label>
                        <Select
                          value={cropSettings.format}
                          onValueChange={(value: 'jpg' | 'png' | 'webp') => {
                            setCropSettings(prev => ({ ...prev, format: value }))
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择输出格式" />
                          </SelectTrigger>
                          <SelectContent>
                            {OUTPUT_FORMATS.map(format => (
                              <SelectItem key={format.value} value={format.value}>
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>图片质量: {cropSettings.quality}%</Label>
                        <Slider
                          value={[cropSettings.quality]}
                          onValueChange={(value) => {
                            if (value && value.length > 0) {
                              setCropSettings(prev => ({ ...prev, quality: value[0] }))
                            }
                          }}
                          max={100}
                          min={1}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>预设分辨率</Label>
                        <Select
                          value="custom"
                          onValueChange={(value) => {
                            const preset = PRESET_RESOLUTIONS.find(p => p.name === value)
                            if (preset && preset.width > 0) {
                              setCropSettings(prev => ({
                                ...prev,
                                outputWidth: preset.width,
                                outputHeight: preset.height
                              }))
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择预设分辨率" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESET_RESOLUTIONS.filter(p => p.width > 0).map(preset => (
                              <SelectItem key={preset.name} value={preset.name}>
                                {preset.name} ({preset.width}×{preset.height})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedImage) {
                  setCropSettings(calculateAutoCrop(selectedImage))
                }
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCropDialog(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  if (selectedImage) {
                    processImage(selectedImage, cropSettings)
                    setShowCropDialog(false)
                  }
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4 mr-2" />
                    开始裁切
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 设置对话框 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              分集图片裁切设置
            </DialogTitle>
            <DialogDescription>
              配置默认处理参数和用户偏好设置
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 基本设置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本设置</h3>

              {/* 自动处理开关 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>自动处理16:9图片</Label>
                  <p className="text-sm text-muted-foreground">
                    上传16:9比例图片时自动进行尺寸调整
                  </p>
                </div>
                <Button
                  variant={globalSettings.autoProcess ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    updateGlobalSettings({ autoProcess: !globalSettings.autoProcess })
                  }}
                >
                  {globalSettings.autoProcess ? "已启用" : "已禁用"}
                </Button>
              </div>

              {/* 自动处理非16:9图片开关 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>自动处理非16:9图片</Label>
                  <p className="text-sm text-muted-foreground">
                    上传非16:9比例图片时自动执行居中裁切
                  </p>
                </div>
                <Button
                  variant={globalSettings.autoProcessNon16x9 ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    updateGlobalSettings({ autoProcessNon16x9: !globalSettings.autoProcessNon16x9 })
                  }}
                >
                  {globalSettings.autoProcessNon16x9 ? "已启用" : "已禁用"}
                </Button>
              </div>

              {/* 默认质量 */}
              <div className="space-y-2">
                <Label>默认图片质量: {globalSettings.defaultQuality}%</Label>
                <Slider
                  value={[globalSettings.defaultQuality]}
                  onValueChange={(value) => {
                    if (value && value.length > 0) {
                      updateGlobalSettings({ defaultQuality: value[0] })
                    }
                  }}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1% (最小)</span>
                  <span>100% (最高)</span>
                </div>
              </div>

              {/* 默认格式 */}
              <div className="space-y-2">
                <Label>默认输出格式</Label>
                <Select
                  value={globalSettings.defaultFormat}
                  onValueChange={(value: 'jpg' | 'png' | 'webp') => {
                    updateGlobalSettings({ defaultFormat: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择输出格式" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map(format => (
                      <SelectItem key={format.value} value={format.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{format.label}</span>
                          <span className="text-xs text-muted-foreground">{format.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 默认输出分辨率 */}
              <div className="space-y-2">
                <Label>默认输出分辨率</Label>
                <Select
                  value={globalSettings.outputResolution}
                  onValueChange={(value) => {
                    updateGlobalSettings({ outputResolution: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择默认分辨率" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RESOLUTIONS.map(preset => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.name} {preset.width > 0 && `(${preset.width}×${preset.height})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 文件命名设置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">文件命名</h3>

              <div className="space-y-2">
                <Label>批量命名规则</Label>
                <Select
                  value={globalSettings.batchNaming}
                  onValueChange={(value) => {
                    updateGlobalSettings({ batchNaming: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择命名规则" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">保持原文件名 + _cropped</SelectItem>
                    <SelectItem value="numbered">按序号命名 (image_01, image_02...)</SelectItem>
                    <SelectItem value="timestamp">按时间戳命名</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 性能设置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">性能优化</h3>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">处理质量</h4>
                    <p className="text-sm text-muted-foreground">
                      高质量处理可能需要更多时间
                    </p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">内存使用</h4>
                    <p className="text-sm text-muted-foreground">
                      大图片处理会占用更多内存
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                resetSettings()
              }}
            >
              重置默认
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                saveSettings(globalSettings)
                setShowSettingsDialog(false)
              }}
            >
              保存设置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 帮助对话框 */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              分集图片裁切使用说明
            </DialogTitle>
            <DialogDescription>
              了解如何使用分集图片裁切功能处理您的图片
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 功能概述 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">功能概述</h3>
              <p className="text-sm text-muted-foreground">
                分集图片裁切功能专门用于将各种比例的图片转换为标准的16:9比例，
                特别适用于影视内容的分集封面图片处理。支持自动和手动两种处理模式。
              </p>
            </div>

            {/* 使用步骤 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">使用步骤</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>上传图片</strong>：点击上传按钮或直接拖拽图片到页面
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>支持JPG、PNG、WebP等常见格式</li>
                    <li>可同时上传多张图片进行批量处理</li>
                  </ul>
                </li>
                <li>
                  <strong>自动检测</strong>：系统自动检测图片比例并显示状态标签
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>绿色标签：已处理完成</li>
                    <li>蓝色标签：16:9比例（可选择是否调整分辨率）</li>
                    <li>灰色标签：需要手动裁切</li>
                  </ul>
                </li>
                <li>
                  <strong>处理图片</strong>：根据图片类型选择处理方式
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>16:9图片：自动调整分辨率（可在设置中关闭）</li>
                    <li>非16:9图片：点击"裁切"按钮进行手动调整</li>
                  </ul>
                </li>
                <li>
                  <strong>下载结果</strong>：处理完成后下载图片
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>单张图片：点击"下载"按钮</li>
                    <li>批量下载：点击"下载全部"逐个下载所有处理后的图片</li>
                    <li>剪贴板功能：下载的同时自动复制图片到剪贴板，可直接粘贴使用</li>
                    <li>进度显示：批量下载时显示当前进度和处理状态</li>
                  </ul>
                </li>
              </ol>
            </div>

            {/* 处理规则 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">自动处理规则</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-600">低分辨率图片</h4>
                    <p className="text-sm text-muted-foreground">
                      分辨率低于1280×720的16:9图片会被放大到720p
                    </p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">标准分辨率图片</h4>
                    <p className="text-sm text-muted-foreground">
                      720p到4K之间的16:9图片保持原始分辨率
                    </p>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-600">超高分辨率图片</h4>
                    <p className="text-sm text-muted-foreground">
                      分辨率高于3840×2160的16:9图片会被缩小到4K
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* 支持格式 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">支持的格式</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OUTPUT_FORMATS.map(format => (
                  <Card key={format.value} className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">{format.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 常见问题 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">常见问题</h3>
              <div className="space-y-3">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                    为什么我的图片没有自动处理？
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-2 text-sm text-muted-foreground">
                    只有16:9比例的图片才会自动处理。非16:9比例的图片需要手动裁切。
                    您可以在设置中关闭自动处理功能。
                  </div>
                </details>

                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                    如何调整输出质量？
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-2 text-sm text-muted-foreground">
                    在设置中可以调整默认质量。对于JPG格式，质量越高文件越大但画质越好。
                    PNG和WebP格式的质量设置可能有所不同。
                  </div>
                </details>

                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                    批量下载的文件如何命名？
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-2 text-sm text-muted-foreground">
                    默认在原文件名后添加"_cropped"后缀。您可以在设置中选择其他命名规则，
                    如按序号或时间戳命名。
                  </div>
                </details>

                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                    剪贴板功能如何使用？
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-2 text-sm text-muted-foreground">
                    批量下载时，每张图片会自动复制到系统剪贴板。您可以直接在其他应用中粘贴使用。
                    如果浏览器不支持剪贴板API，文件仍会正常下载。某些浏览器可能需要用户授权才能使用剪贴板功能。
                  </div>
                </details>

                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between py-2 font-medium">
                    处理大图片时浏览器卡顿怎么办？
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-2 text-sm text-muted-foreground">
                    处理超大图片可能会占用较多内存。建议一次处理少量图片，
                    或者先将图片缩小到合适尺寸再进行裁切。
                  </div>
                </details>
              </div>
            </div>

            {/* 注意事项 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">注意事项</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>本工具完全在浏览器中运行，不会上传您的图片到任何服务器</li>
                  <li>处理大型图片文件可能需要较长时间，请耐心等待</li>
                  <li>建议在处理前备份原始图片文件</li>
                  <li>手动裁切时请确保选择的区域包含重要内容</li>
                  <li>批量处理时建议关闭其他占用内存的应用程序</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowHelpDialog(false)}>
              我知道了
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  )
}

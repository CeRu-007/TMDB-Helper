"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Switch } from "@/shared/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Badge } from "@/shared/components/ui/badge"
import { Progress } from "@/shared/components/ui/progress"
import { useToast } from "@/shared/lib/hooks/use-toast"
import { VisualCropEditor } from "./visual-crop-editor"
import {
  Upload,
  Download,
  Scissors,
  RotateCcw,
  Settings,
  Info,
  FileImage,
  Loader2,
  RefreshCw
} from "lucide-react"
import { logger } from '@/lib/utils/logger'

// 图片信息接口
interface ImageInfo {
  id: string
  file: File
  name: string
  size: number
  width: number
  height: number
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

// 全局设置接口
interface CropperSettings {
  autoProcess: boolean
  autoProcessNon16x9: boolean
  defaultQuality: number
  defaultFormat: 'jpg' | 'png' | 'webp'
  batchNaming: string
  posterMinResolution: string
  posterMaxResolution: string
  backdropMinResolution: string
  backdropMaxResolution: string
}

export function ImageCropper() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ImageInfo[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  
  // 裁切模式
  const [cropMode, setCropMode] = useState<'poster' | 'backdrop'>('poster')
  // 海报模式比例选择
  const [posterRatio, setPosterRatio] = useState<'2:3' | '3:4'>('2:3')

  // 当裁切模式或海报比例改变时，重新计算裁切区域
  useEffect(() => {
    if (selectedImage && !isProcessing) {
      let newCrop
      if (cropMode === 'poster') {
        // 根据选择的海报比例计算裁切区域
        const targetRatio = posterRatio === '2:3' ? 2/3 : 3/4
        newCrop = {
          x: Math.round((selectedImage.width - (selectedImage.height * targetRatio)) / 2),
          y: 0,
          width: Math.round(selectedImage.height * targetRatio),
          height: selectedImage.height
        }
      } else {
        // 背景幕布模式：16:9比例
        newCrop = {
          x: Math.round((selectedImage.width - (selectedImage.height * 16/9)) / 2),
          y: 0,
          width: Math.round(selectedImage.height * 16/9),
          height: selectedImage.height
        }
      }
      setCropArea(newCrop)
      // 只在没有处理结果时才清空
      if (!croppedPreview) {
        setCroppedPreview('') // 清除之前的处理结果
      }
    }
  }, [cropMode, posterRatio, selectedImage, isProcessing])
  
  // 全局设置
  const [globalSettings, setGlobalSettings] = useState<CropperSettings>({
    autoProcess: true,
    autoProcessNon16x9: false,
    defaultQuality: 90,
    defaultFormat: 'jpg' as 'jpg' | 'png' | 'webp',
    batchNaming: 'original',
    outputResolution: '1080p',
    posterMinResolution: '500x750',
    posterMaxResolution: '2000x3000',
    backdropMinResolution: '1280x720',
    backdropMaxResolution: '3840x2160'
  })
  
  // 非标准比例图片裁切策略
  const [cropStrategy, setCropStrategy] = useState<'center' | 'top-left' | 'bottom-right'>('center')
  
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
  
  // 预览状态
  const [originalPreview, setOriginalPreview] = useState<string>('')
  const [croppedPreview, setCroppedPreview] = useState<string>('')
  
  // 海报比例对比状态：存储两种比例的裁切结果
  const [posterRatioResults, setPosterRatioResults] = useState<{
    '2:3': {
      processedUrl?: string
      cropSettings?: CropSettings
      isProcessing: boolean
    }
    '3:4': {
      processedUrl?: string
      cropSettings?: CropSettings
      isProcessing: boolean
    }
  }>({
    '2:3': { isProcessing: false },
    '3:4': { isProcessing: false }
  })
  
  // 当前选中的海报比例（用于下载和显示）
  const [selectedPosterRatio, setSelectedPosterRatio] = useState<'2:3' | '3:4'>('2:3')
  
  // 裁切区域状态（用于可视化编辑器）
  const [cropArea, setCropArea] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // 加载保存的设置
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const savedSettings = localStorage.getItem('posterBackdropCropperSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setGlobalSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      logger.error('Failed to load settings:', error)
    }
  }, [])

  // 检查图片是否为16:9比例
  const isAspectRatio16x9 = (width: number, height: number): boolean => {
    const ratio = width / height
    return Math.abs(ratio - (16/9)) < 0.01
  }

  // 检查图片是否为3:4比例（海报）
  const isAspectRatio3x4 = (width: number, height: number): boolean => {
    const ratio = width / height
    return Math.abs(ratio - (3/4)) < 0.01
  }

  // 检查图片是否为当前选择的海报比例
  const isAspectRatioPoster = (width: number, height: number, forcedRatio?: '2:3' | '3:4'): boolean => {
    const ratioToUse = forcedRatio || posterRatio;
    if (ratioToUse === '2:3') {
      return Math.abs((width / height) - (2/3)) < 0.01
    } else {
      return Math.abs((width / height) - (3/4)) < 0.01
    }
  }

  // 计算自动裁切设置
  const calculateAutoCrop = (image: ImageInfo, forcedRatio?: '2:3' | '3:4'): CropSettings => {
    const { width, height } = image
    const ratioToUse = forcedRatio || posterRatio;
    
    if (cropMode === 'poster') {
      // 海报模式：根据选择的比例计算
      const targetRatio = ratioToUse === '2:3' ? 2 / 3 : 3 / 4
      
      // 根据当前选择的海报比例设置不同的分辨率范围
      let minWidth, minHeight, maxWidth, maxHeight;
      if (ratioToUse === '2:3') {
        // 2:3比例：500×750到2000×3000
        minWidth = 500;
        minHeight = 750;
        maxWidth = 2000;
        maxHeight = 3000;
      } else {
        // 3:4比例：500×666到2000×2666
        minWidth = 500;
        minHeight = 666;
        maxWidth = 2000;
        maxHeight = 2666;
      }
      
      if (isAspectRatioPoster(width, height, ratioToUse)) {
        // 已经是当前选择的海报比例，调整分辨率
        let outputWidth = width
        let outputHeight = height
        
        if (width > maxWidth || height > maxHeight) {
          // 高于最大分辨率，等比缩小
          if (cropMode === 'poster') {
            // 海报模式：严格按照目标比例设置最大分辨率
            if (ratioToUse === '2:3') {
              // 2:3比例：使用精确的2:3比例计算最大分辨率
              outputWidth = maxWidth
              outputHeight = Math.round(maxWidth * 3/2)
            } else {
              // 3:4比例：使用精确的3:4比例计算最大分辨率
              outputWidth = maxWidth
              outputHeight = Math.round(maxWidth * 4/3)
            }
          } else {
            // 背景模式：使用原来的逻辑
            const scale = Math.min(maxWidth / width, maxHeight / height)
            outputWidth = width * scale
            outputHeight = height * scale
          }
        } else if (width < minWidth || height < minHeight) {
          // 低于最小分辨率，等比放大
          if (cropMode === 'poster') {
            // 海报模式：严格按照目标比例设置最小分辨率
            if (ratioToUse === '2:3') {
              // 2:3比例：使用精确的2:3比例计算最小分辨率
              outputWidth = minWidth
              outputHeight = Math.round(minWidth * 3/2)
            } else {
              // 3:4比例：使用精确的3:4比例计算最小分辨率
              outputWidth = minWidth
              outputHeight = Math.round(minWidth * 4/3)
            }
          } else {
            // 背景模式：使用原来的逻辑
            const scale = Math.max(minWidth / width, minHeight / height)
            outputWidth = width * scale
            outputHeight = height * scale
          }
        }
        
        return {
          x: 0,
          y: 0,
          width,
          height,
          outputWidth: Math.round(outputWidth),
          outputHeight: Math.round(outputHeight),
          quality: globalSettings.defaultQuality,
          format: 'jpg' // TMDB只支持JPG
        }
      } else {
          // 非当前选择的海报比例，根据选择的策略裁切
          const currentRatio = width / height
          let cropWidth = width
          let cropHeight = height
          let x = 0
          let y = 0
          
          if (currentRatio > targetRatio) {
            // 图片太宽，裁切宽度
            cropWidth = height * targetRatio
            switch (cropStrategy) {
              case 'center':
                x = (width - cropWidth) / 2
                break
              case 'top-left':
                x = 0
                break
              case 'bottom-right':
                x = width - cropWidth
                break
            }
          } else {
            // 图片太高，裁切高度
            cropHeight = width / targetRatio
            switch (cropStrategy) {
              case 'center':
                y = (height - cropHeight) / 2
                break
              case 'top-left':
                y = 0
                break
              case 'bottom-right':
                y = height - cropHeight
                break
            }
          }
        
        // 应用分辨率限制
        let outputWidth = cropWidth
        let outputHeight = cropHeight
        
        if (outputWidth > maxWidth || outputHeight > maxHeight) {
          // 高于最大分辨率，等比缩小
          if (cropMode === 'poster') {
            // 海报模式：严格按照目标比例设置最大分辨率
            if (ratioToUse === '2:3') {
              // 2:3比例：使用精确的2:3比例计算最大分辨率
              outputWidth = maxWidth
              outputHeight = Math.round(maxWidth * 3/2)
            } else {
              // 3:4比例：使用精确的3:4比例计算最大分辨率
              outputWidth = maxWidth
              outputHeight = Math.round(maxWidth * 4/3)
            }
          } else {
            // 背景模式：使用原来的逻辑
            const scale = Math.min(maxWidth / outputWidth, maxHeight / outputHeight)
            outputWidth = outputWidth * scale
            outputHeight = outputHeight * scale
          }
        } else if (outputWidth < minWidth || outputHeight < minHeight) {
          // 低于最小分辨率，等比放大
          if (cropMode === 'poster') {
            // 海报模式：严格按照目标比例设置最小分辨率
            if (ratioToUse === '2:3') {
              // 2:3比例：使用精确的2:3比例计算最小分辨率
              outputWidth = minWidth
              outputHeight = Math.round(minWidth * 3/2)
            } else {
              // 3:4比例：使用精确的3:4比例计算最小分辨率
              outputWidth = minWidth
              outputHeight = Math.round(minWidth * 4/3)
            }
          } else {
            // 背景模式：使用原来的逻辑
            const scale = Math.max(minWidth / outputWidth, minHeight / outputHeight)
            outputWidth = outputWidth * scale
            outputHeight = outputHeight * scale
          }
        }
        
        return {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(cropWidth),
          height: Math.round(cropHeight),
          outputWidth: Math.round(outputWidth),
          outputHeight: Math.round(outputHeight),
          quality: globalSettings.defaultQuality,
          format: 'jpg' // TMDB只支持JPG
        }
      }
    } else {
      // 背景模式：16:9比例
      const targetRatio = 16 / 9
      
      // 解析分辨率设置
      const [minWidth, minHeight] = globalSettings.backdropMinResolution.split('x').map(Number)
      const [maxWidth, maxHeight] = globalSettings.backdropMaxResolution.split('x').map(Number)
      
      if (isAspectRatio16x9(width, height)) {
        // 已经是16:9，根据分辨率调整
        let outputWidth = width
        let outputHeight = height
        
        if (width < minWidth || height < minHeight) {
          // 低于最小分辨率，调整到最小分辨率
          outputWidth = minWidth
          outputHeight = minHeight
        } else if (width > maxWidth || height > maxHeight) {
          // 高于最大分辨率，调整到最大分辨率
          outputWidth = maxWidth
          outputHeight = maxHeight
        }
        
        return {
          x: 0,
          y: 0,
          width,
          height,
          outputWidth,
          outputHeight,
          quality: globalSettings.defaultQuality,
          format: 'jpg' // TMDB只支持JPG
        }
      } else {
          // 非16:9，根据选择的策略裁切
          const currentRatio = width / height
          let cropWidth = width
          let cropHeight = height
          let x = 0
          let y = 0
          
          if (currentRatio > targetRatio) {
            // 图片太宽，裁切宽度
            cropWidth = height * targetRatio
            switch (cropStrategy) {
              case 'center':
                x = (width - cropWidth) / 2
                break
              case 'top-left':
                x = 0
                break
              case 'bottom-right':
                x = width - cropWidth
                break
            }
          } else {
            // 图片太高，裁切高度
            cropHeight = width / targetRatio
            switch (cropStrategy) {
              case 'center':
                y = (height - cropHeight) / 2
                break
              case 'top-left':
                y = 0
                break
              case 'bottom-right':
                y = height - cropHeight
                break
            }
          }
        
        // 应用分辨率限制
        let outputWidth = cropWidth
        let outputHeight = cropHeight
        
        if (outputWidth > maxWidth || outputHeight > maxHeight) {
          // 高于最大分辨率，等比缩小
          outputWidth = maxWidth
          outputHeight = maxHeight
        } else if (outputWidth < minWidth || outputHeight < minHeight) {
          // 低于最小分辨率，调整到最小分辨率
          outputWidth = minWidth
          outputHeight = minHeight
        }
        
        return {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(cropWidth),
          height: Math.round(cropHeight),
          outputWidth: outputWidth,
          outputHeight: outputHeight,
          quality: globalSettings.defaultQuality,
          format: 'jpg' // TMDB只支持JPG
        }
      }
    }
  }

  // 处理文件上传
  const handleFileUpload = (files: FileList | File[]) => {
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
            url: e.target?.result as string,
            isProcessed: false
          }
          
          // 单图片模式，替换当前图片
          setImages([imageInfo])
          setSelectedImage(imageInfo)
          setOriginalPreview(e.target?.result as string)
          // 不要立即清空 croppedPreview，让自动处理逻辑来处理
          
          // 设置初始裁切区域
          let initialCrop
          if (cropMode === 'poster') {
            // 根据选择的海报比例和裁切策略计算初始裁切区域
            const targetRatio = posterRatio === '2:3' ? 2/3 : 3/4
            const currentRatio = img.width / img.height
            let cropWidth = img.width
            let cropHeight = img.height
            let x = 0
            let y = 0
            
            if (currentRatio > targetRatio) {
              // 图片太宽，裁切宽度
              cropWidth = img.height * targetRatio
              switch (cropStrategy) {
                case 'center':
                  x = Math.round((img.width - cropWidth) / 2)
                  break
                case 'top-left':
                  x = 0
                  break
                case 'bottom-right':
                  x = Math.round(img.width - cropWidth)
                  break
              }
            } else if (currentRatio < targetRatio) {
              // 图片太高，裁切高度
              cropHeight = img.width / targetRatio
              switch (cropStrategy) {
                case 'center':
                  y = Math.round((img.height - cropHeight) / 2)
                  break
                case 'top-left':
                  y = 0
                  break
                case 'bottom-right':
                  y = Math.round(img.height - cropHeight)
                  break
              }
            }
            
            initialCrop = {
              x,
              y,
              width: Math.round(cropWidth),
              height: Math.round(cropHeight)
            }
          } else {
            // 背景幕布模式：16:9比例
            const targetRatio = 16/9
            const currentRatio = img.width / img.height
            let cropWidth = img.width
            let cropHeight = img.height
            let x = 0
            let y = 0
            
            if (currentRatio > targetRatio) {
              // 图片太宽，裁切宽度
              cropWidth = img.height * targetRatio
              switch (cropStrategy) {
                case 'center':
                  x = Math.round((img.width - cropWidth) / 2)
                  break
                case 'top-left':
                  x = 0
                  break
                case 'bottom-right':
                  x = Math.round(img.width - cropWidth)
                  break
              }
            } else if (currentRatio < targetRatio) {
              // 图片太高，裁切高度
              cropHeight = img.width / targetRatio
              switch (cropStrategy) {
                case 'center':
                  y = Math.round((img.height - cropHeight) / 2)
                  break
                case 'top-left':
                  y = 0
                  break
                case 'bottom-right':
                  y = Math.round(img.height - cropHeight)
                  break
              }
            }
            
            initialCrop = {
              x,
              y,
              width: Math.round(cropWidth),
              height: Math.round(cropHeight)
            }
          }
          setCropArea(initialCrop)
          
          // 自动处理逻辑：只要勾选了自动处理，就自动处理所有图片
          if (globalSettings.autoProcess) {
            // 如果是海报模式，处理两种比例
            if (cropMode === 'poster') {
              // 处理2:3比例，直接传入目标比例
              const autoCropSettings2x3 = calculateAutoCrop(imageInfo, '2:3');
              
              // 处理3:4比例，直接传入目标比例
              const autoCropSettings3x4 = calculateAutoCrop(imageInfo, '3:4');
              
              // 更新 imageInfo 和 selectedImage
              imageInfo.cropSettings = autoCropSettings2x3;
              setSelectedImage({ ...imageInfo, cropSettings: autoCropSettings2x3 });
              
              setCropArea({
                x: autoCropSettings2x3.x,
                y: autoCropSettings2x3.y,
                width: autoCropSettings2x3.width,
                height: autoCropSettings2x3.height
              });
              
              // 同时处理两种比例
              processImageForRatio(imageInfo, '2:3', autoCropSettings2x3);
              processImageForRatio(imageInfo, '3:4', autoCropSettings3x4);
            } else {
              // 背景模式，只处理16:9比例
              const autoCropSettings = calculateAutoCrop(imageInfo);
              
              // 更新 imageInfo 和 selectedImage
              imageInfo.cropSettings = autoCropSettings;
              setSelectedImage({ ...imageInfo, cropSettings: autoCropSettings });
              
              setCropArea({
                x: autoCropSettings.x,
                y: autoCropSettings.y,
                width: autoCropSettings.width,
                height: autoCropSettings.height
              });
              processImage(imageInfo, autoCropSettings);
            }
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
    
    toast({
      title: "图片上传成功",
      description: `已上传 ${imageFiles.length} 张图片`,
    })
  }

  // 处理特定比例的图片裁切（用于海报比例对比）
  const processImageForRatio = async (image: ImageInfo, ratio: '2:3' | '3:4', settings?: CropSettings) => {
    // 设置该比例为处理中状态
    setPosterRatioResults(prev => ({
      ...prev,
      [ratio]: { ...prev[ratio], isProcessing: true }
    }))
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文')
      }
      
      // 使用提供的设置或自动计算的设置，直接传入目标比例
      const cropSettings = settings || calculateAutoCrop(image, ratio);
      
      // 设置输出尺寸
      canvas.width = cropSettings.outputWidth
      canvas.height = cropSettings.outputHeight
      
      // 加载原始图片
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = image.url
      })
      
      // 绘制裁切后的图片
      ctx.drawImage(
        img,
        cropSettings.x, cropSettings.y, cropSettings.width, cropSettings.height,
        0, 0, cropSettings.outputWidth, cropSettings.outputHeight
      )
      
      // 转换为指定格式
      const mimeType = `image/${cropSettings.format === 'jpg' ? 'jpeg' : cropSettings.format}`
      const quality = cropSettings.format === 'jpg' ? cropSettings.quality / 100 : undefined
      const processedUrl = canvas.toDataURL(mimeType, quality)
      
      // 更新预览（如果是当前选中的比例）
      if (ratio === selectedPosterRatio) {
        setCroppedPreview(processedUrl);
      }
      
      // 更新该比例的处理结果
      setPosterRatioResults(prev => ({
        ...prev,
        [ratio]: {
          processedUrl,
          cropSettings,
          isProcessing: false
        }
      }))
      
      // 更新图片信息
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { 
              ...img, 
              isProcessed: true, 
              processedUrl: img.processedUrl || processedUrl, // 保持原有处理结果
              cropSettings: img.cropSettings || cropSettings // 保持原有裁切设置
            }
          : img
      ))
      
    } catch (error) {
      logger.error(`Failed to process image for ratio ${ratio}:`, error)
      
      // 更新该比例的处理结果为失败状态
      setPosterRatioResults(prev => ({
        ...prev,
        [ratio]: {
          ...prev[ratio],
          isProcessing: false
        }
      }))
      
      toast({
        title: "处理失败",
        description: error?.message || `图片 ${image.name} 处理过程中出现错误`,
        variant: "destructive",
      })
    }
  }
  
  // 处理图片裁切（兼容原有逻辑）
  const processImage = async (image: ImageInfo, settings?: CropSettings) => {
    setIsProcessing(true)
    setProcessingProgress(0)
    // 不要立即清空 croppedPreview，避免界面闪烁
    // setCroppedPreview('') // 清除之前的处理结果
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文')
      }
      
      // 使用裁切区域或自动计算的设置
      const cropSettings = settings || (cropArea ? {
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
        outputWidth: cropArea.width,
        outputHeight: cropArea.height,
        quality: globalSettings.defaultQuality,
        format: globalSettings.defaultFormat
      } : calculateAutoCrop(image))
      
      // 设置输出尺寸
      canvas.width = cropSettings.outputWidth
      canvas.height = cropSettings.outputHeight
      
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
        cropSettings.x, cropSettings.y, cropSettings.width, cropSettings.height,
        0, 0, cropSettings.outputWidth, cropSettings.outputHeight
      )
      
      setProcessingProgress(80)
      
      // 转换为指定格式
      const mimeType = `image/${cropSettings.format === 'jpg' ? 'jpeg' : cropSettings.format}`
      const quality = cropSettings.format === 'jpg' ? cropSettings.quality / 100 : undefined
      const processedUrl = canvas.toDataURL(mimeType, quality)
      
      // 更新预览
      setCroppedPreview(processedUrl)
      
      // 更新该比例的处理结果
      setPosterRatioResults(prev => ({
        ...prev,
        [posterRatio]: {
          processedUrl,
          cropSettings,
          isProcessing: false
        }
      }))
      
      // 更新裁切设置状态以保持 UI 一致性
      setCropSettings(cropSettings)
      
      // 更新图片信息
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, isProcessed: true, processedUrl, cropSettings: cropSettings }
          : img
      ))
      
      toast({
        title: "处理完成",
        description: `图片 ${image.name} 已成功处理`,
      })
      
    } catch (error) {
      logger.error('Failed to process image:', error)
      setCroppedPreview('') // 确保清除失败的处理结果
      toast({
        title: "处理失败",
        description: error?.message || "图片处理过程中出现错误",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  // 下载处理后的图片
  const downloadImage = () => {
    // 获取当前要下载的图片URL和设置
    let downloadUrl: string | undefined;
    let currentImageSettings: CropSettings | undefined;
    
    if (cropMode === 'poster') {
      // 海报模式：使用选中的比例结果
      downloadUrl = posterRatioResults[selectedPosterRatio].processedUrl;
      currentImageSettings = posterRatioResults[selectedPosterRatio].cropSettings;
    } else {
      // 背景模式：使用当前预览
      downloadUrl = croppedPreview;
      currentImageSettings = selectedImage?.cropSettings || cropSettings;
    }
    
    if (!downloadUrl) {
      toast({
        title: "无法下载",
        description: "没有处理后的图片可下载",
        variant: "destructive",
      })
      return
    }
    
    try {
      // 检查浏览器是否支持下载
      if (typeof document === 'undefined') {
        throw new Error('当前环境不支持文件下载')
      }
      
      const link = document.createElement('a')
      
      const extension = currentImageSettings?.format || 'jpg'
      
      // 智能文件命名
      let filename = ''
      if (selectedImage) {
        // 获取原始文件名（不含扩展名）
        const originalName = selectedImage.name.replace(/\.[^/.]+$/, '')
        
        // 根据全局设置决定命名规则
        switch (globalSettings.batchNaming) {
          case 'original':
            filename = `${originalName}_${cropMode}_${selectedPosterRatio || posterRatio}.${extension}`
            break
          case 'suffix':
            filename = `${originalName}_cropped_${cropMode}_${selectedPosterRatio || posterRatio}.${extension}`
            break
          case 'timestamp':
            const timestamp = Date.now()
            filename = `${originalName}_${timestamp}_${cropMode}_${selectedPosterRatio || posterRatio}.${extension}`
            break
          case 'sequence':
            filename = `cropped_${cropMode}_${selectedPosterRatio || posterRatio}_001.${extension}`
            break
          default:
            filename = `cropped-${cropMode}-${selectedPosterRatio || posterRatio}.${extension}`
        }
      } else {
        filename = `cropped-${cropMode}-${selectedPosterRatio || posterRatio}.${extension}`
      }
      
      // 设置下载属性
      link.href = downloadUrl
      link.download = filename
      link.style.display = 'none'
      
      // 确保链接被添加到 DOM 中
      document.body.appendChild(link)
      
      // 触发下载
      if (link.click) {
        link.click()
      } else {
        // 备用方案：创建一个鼠标事件
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        })
        link.dispatchEvent(event)
      }
      
      // 清理 DOM
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link)
        }
      }, 100)
      
      toast({
        title: "下载完成",
        description: `图片 ${filename} 已下载`,
      })
    } catch (error) {
      logger.error('Download failed:', error)
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "图片下载过程中出现错误",
        variant: "destructive",
      })
    }
  }

  // 重置
  const resetAll = () => {
    setOriginalPreview('')
    setCroppedPreview('')
    setSelectedImage(null)
    setImages([])
    setCropArea(null)
    // 重置海报比例对比状态
    setPosterRatioResults({
      '2:3': { isProcessing: false },
      '3:4': { isProcessing: false }
    })
    setSelectedPosterRatio('2:3')
    toast({
      title: "已重置",
      description: "工作区已清空",
    })
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 主渲染
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm h-12 flex items-center px-3 sm:px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors className="text-primary text-xl" />
          <h1 className="text-lg font-semibold text-dark">图像自动裁切工具</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelpDialog(true)}
          >
            帮助
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* 左侧配置区 */}
        <aside className="w-80 bg-white shadow-lg flex-shrink-0 flex flex-col">
          {/* 配置内容 */}
          <div className="p-3 overflow-y-auto flex-1">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              参数配置
            </h2>

            {/* 模式切换 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">裁切模式</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ease-in-out ${cropMode === 'poster'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setCropMode('poster')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-12 border-2 border-current mb-2" style={{ aspectRatio: '2/3' }}></div>
                    <span className="text-xs font-medium">海报</span>
                    <span className="text-xs text-muted-foreground">2:3</span>
                  </div>
                </button>
                <button
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ease-in-out ${cropMode === 'backdrop'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setCropMode('backdrop')}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-8 border-2 border-current mb-2" style={{ aspectRatio: '16/9' }}></div>
                    <span className="text-xs font-medium">背景</span>
                    <span className="text-xs text-muted-foreground">16:9</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 基本设置 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">基本设置</h3>
              
              {/* 自动处理开关 */}
              <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">自动按规定比例裁切</label>
                  <Switch
                    checked={globalSettings.autoProcess}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...globalSettings, autoProcess: checked }
                      setGlobalSettings(newSettings)
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  上传图片时自动按当前选择的比例（{cropMode === 'poster' ? (posterRatio === '2:3' ? '2:3' : '3:4') : '16:9'}）进行裁切和尺寸调整
                </p>
              </div>

              {/* 海报比例选择 */}
              {cropMode === 'poster' && (
                <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium mb-3">海报比例选择</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ease-in-out ${selectedPosterRatio === '2:3' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => {
                        setSelectedPosterRatio('2:3');
                        // 如果该比例还没有处理结果，自动处理
                        if (selectedImage && !posterRatioResults['2:3'].processedUrl && !posterRatioResults['2:3'].isProcessing) {
                          // 创建2:3比例的自动裁切设置
                          const tempRatio = posterRatio;
                          // 临时切换比例以获取正确的裁切设置
                          const cropSettings = calculateAutoCrop({ ...selectedImage });
                          // 恢复原比例
                          setPosterRatio(tempRatio);
                          // 处理2:3比例
                          processImageForRatio(selectedImage, '2:3', cropSettings);
                        }
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-12 border-2 border-current mb-2" style={{ aspectRatio: '2/3' }}></div>
                        <span className="text-xs font-medium">2:3</span>
                        <span className="text-xs text-muted-foreground">标准海报</span>
                      </div>
                    </button>
                    <button
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ease-in-out ${selectedPosterRatio === '3:4' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => {
                        setSelectedPosterRatio('3:4');
                        // 如果该比例还没有处理结果，自动处理
                        if (selectedImage && !posterRatioResults['3:4'].processedUrl && !posterRatioResults['3:4'].isProcessing) {
                          // 创建3:4比例的自动裁切设置
                          const tempRatio = posterRatio;
                          // 临时切换比例以获取正确的裁切设置
                          setPosterRatio('3:4');
                          const cropSettings = calculateAutoCrop({ ...selectedImage });
                          // 恢复原比例
                          setPosterRatio(tempRatio);
                          // 处理3:4比例
                          processImageForRatio(selectedImage, '3:4', cropSettings);
                        }
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-12 border-2 border-current mb-2" style={{ aspectRatio: '3/4' }}></div>
                        <span className="text-xs font-medium">3:4</span>
                        <span className="text-xs text-muted-foreground">竖版海报</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 非标准比例图片裁切策略 */}
              <div className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">非标准比例图片裁切策略</label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                    非当前比例图片的裁切策略，影响海报两种比例
                  </p>
                <div>
                  <Select 
                    value={cropStrategy}
                    onValueChange={(value) => setCropStrategy(value as 'center' | 'top-left' | 'bottom-right')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">居中裁切</SelectItem>
                      <SelectItem value="top-left">左上角裁切</SelectItem>
                      <SelectItem value="bottom-right">右下角裁切</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 输出设置 */}
            <div className="mb-6 mt-4">
              <h3 className="text-sm font-medium mb-3">输出设置</h3>
              
              {/* 输出格式 */}
              <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">输出格式</label>
                  <Badge variant="secondary" className="text-xs">
                    TMDB要求
                  </Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-sm font-medium">JPG</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  TMDB只支持JPG格式的图片，无论是海报还是背景幕布
                </p>
              </div>

              {/* 输出质量 */}
              <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                <label className="text-sm font-medium block mb-2">输出质量: {globalSettings.defaultQuality}%</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={globalSettings.defaultQuality}
                  onChange={(e) => {
                    const quality = parseInt(e.target.value)
                    const newSettings = { ...globalSettings, defaultQuality: quality }
                    setGlobalSettings(newSettings)
                    setCropSettings(prev => ({ ...prev, quality }))
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1% (最小)</span>
                  <span>100% (最高)</span>
                </div>
              </div>

              {/* 命名规则 */}
              <div className="p-3 border border-gray-200 rounded-lg">
                <label className="text-sm font-medium block mb-2">命名规则</label>
                <Select
                  value={globalSettings.batchNaming}
                  onValueChange={(value: string) => {
                    const newSettings = { ...globalSettings, batchNaming: value }
                    setGlobalSettings(newSettings)
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">保持原名</SelectItem>
                    <SelectItem value="suffix">添加后缀 _cropped</SelectItem>
                    <SelectItem value="timestamp">添加时间戳</SelectItem>
                    <SelectItem value="sequence">序号命名 (001, 002...)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  批量处理时按照此规则重命名输出文件
                </p>
              </div>
            </div>
          </div>
          
          {/* 底部保存按钮 */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                if (typeof window === 'undefined') return
                
                try {
                  localStorage.setItem('posterBackdropCropperSettings', JSON.stringify(globalSettings))
                  toast({
                    title: "设置已保存",
                    description: "您的配置已成功保存",
                  })
                } catch (error) {
                  console.error('Failed to save settings:', error)
                  toast({
                    title: "保存失败",
                    description: "设置保存失败，请重试",
                    variant: "destructive",
                  })
                }
              }}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              保存配置
            </button>
          </div>
        </aside>

        {/* 右侧主工作区 */}
        <section className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 工具栏 */}
          <div className="bg-white border-b px-3 sm:px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium">工作区</h2>
              <Badge variant="secondary" className="text-xs">
                {cropMode === 'poster' ? '海报模式' : '背景模式'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                重置
              </Button>
              
            </div>
          </div>

          {/* 主内容区域 */}
          <div className="flex-1 overflow-hidden p-3 sm:p-4 min-h-0">
            <div className={`${
              cropMode === 'poster' 
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4' 
                : 'flex flex-col gap-3 sm:gap-4'
            } h-full min-h-0 overflow-hidden`}>
              {/* 上传区域 */}
              <div className={`${
                cropMode === 'poster' 
                  ? 'bg-white rounded-xl shadow-sm p-3 sm:p-4 flex flex-col h-full overflow-hidden'
                  : 'bg-white rounded-xl shadow-sm p-3 sm:p-4 flex flex-col'
              }`}>
                <h3 className="text-base font-semibold mb-2 sm:mb-3 flex items-center flex-shrink-0">
                  <Upload className="h-5 w-5 mr-2 text-primary" />
                  图片上传
                </h3>
                
                <div 
                  className={`border-2 border-dashed border-gray-200 rounded-lg p-3 sm:p-6 text-center hover:border-primary transition-colors ${
                    cropMode === 'poster' ? 'flex-1 min-h-0 max-h-60 overflow-y-auto' : 'h-40 sm:h-48'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      handleFileUpload(files)
                    }
                  }}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="sr-only" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files)
                        // 重置文件输入值，允许重复选择同一文件
                        e.target.value = ''
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center h-full">
                    <FileImage className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mb-2 sm:mb-3" />
                    <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">拖拽图片到此处或点击上传</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      支持 JPG、PNG、WebP 格式
                    </p>
                    <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
                      {cropMode === 'poster' 
                        ? selectedPosterRatio === '2:3' 
                          ? `建议分辨率：500×750 到 2000×3000，比例 ${selectedPosterRatio}`
                          : `建议分辨率：500×666 到 2000×2666，比例 ${selectedPosterRatio}`
                        : '建议分辨率：1280×720 到 3840×2160，比例 16:9'
                      }
                    </p>
                    <label 
                      className="cursor-pointer bg-primary text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                      选择文件
                    </label>
                  </div>
                </div>

                {/* 图片信息 */}
                {selectedImage && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg flex-shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-medium truncate" title={selectedImage.name}>
                          {selectedImage.name.length > 15 ? selectedImage.name.substring(0, 15) + '...' : selectedImage.name}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {selectedImage.width}×{selectedImage.height}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {formatFileSize(selectedImage.size)}
                        </span>
                      </div>
                      <span className={`flex-shrink-0 ${
                      (cropMode === 'poster' && isAspectRatioPoster(selectedImage.width, selectedImage.height)) ||
                      (cropMode === 'backdrop' && isAspectRatio16x9(selectedImage.width, selectedImage.height))
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      {cropMode === 'poster' && isAspectRatioPoster(selectedImage.width, selectedImage.height)
                        ? posterRatio
                        : cropMode === 'backdrop' && isAspectRatio16x9(selectedImage.width, selectedImage.height)
                        ? '16:9'
                        : '不匹配'
                      }
                    </span>
                    </div>
                  </div>
                )}

                
              </div>

              {/* 可视化裁切区域 */}
              <div className={`${
                cropMode === 'poster' 
                  ? 'bg-white rounded-xl shadow-sm p-3 sm:p-4 flex flex-col h-full overflow-hidden'
                  : 'bg-white rounded-xl shadow-sm p-3 sm:p-4 flex flex-col h-full overflow-hidden'
              }`}>
                <h3 className="text-base font-semibold mb-2 sm:mb-3 flex items-center flex-shrink-0">
                  <Scissors className="h-5 w-5 mr-2 text-primary" />
                  {/* 根据自动处理设置显示标题 */}
                  {globalSettings.autoProcess && croppedPreview ? '处理结果' : '可视化裁切'}
                </h3>
                
                {selectedImage ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    {/* 自动处理模式：只要勾选了自动处理且有处理结果，就显示处理结果 */}
                    {globalSettings.autoProcess && (croppedPreview || posterRatioResults['2:3'].processedUrl || posterRatioResults['3:4'].processedUrl) ? (
                      <div className="flex-1 flex flex-col">
                        {/* 海报模式：显示两种比例的对比结果 */}
                        {cropMode === 'poster' ? (
                          <div className={`flex-1 flex flex-col space-y-3`}>
                            <h3 className="text-sm font-medium text-center">海报比例对比</h3>
                            
                            {/* 两种比例的并排对比 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                              {/* 2:3比例结果 */}
                              <div className="flex flex-col space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <h4 className={`text-sm font-medium ${selectedPosterRatio === '2:3' ? 'text-primary' : ''}`}>
                                    2:3 标准海报
                                  </h4>
                                  <button
                                    className={`px-2 py-1 rounded text-xs ${selectedPosterRatio === '2:3' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                    onClick={() => {
                                      setSelectedPosterRatio('2:3');
                                      setCroppedPreview(posterRatioResults['2:3'].processedUrl || '');
                                    }}
                                  >
                                    {selectedPosterRatio === '2:3' ? '已选择' : '选择'}
                                  </button>
                                </div>
                                
                                {/* 2:3预览图 */}
                                <div className="flex-1 flex items-center justify-center bg-white rounded-lg p-3 overflow-hidden border border-gray-200">
                                  {posterRatioResults['2:3'].isProcessing ? (
                                    <div className="text-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                                      <p className="text-xs text-blue-600 mt-1">处理中...</p>
                                    </div>
                                  ) : posterRatioResults['2:3'].processedUrl ? (
                                    <img 
                                      src={posterRatioResults['2:3'].processedUrl} 
                                      alt="2:3处理后的图片" 
                                      className="max-w-full max-h-full object-contain border border-gray-200 rounded bg-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="text-center text-gray-400">
                                      <FileImage className="h-8 w-8 mx-auto" />
                                      <p className="text-xs mt-1">等待处理</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* 2:3输出信息 */}
                                {posterRatioResults['2:3'].cropSettings && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">格式：</span>
                                        <span className="font-medium">{posterRatioResults['2:3'].cropSettings?.format.toUpperCase()}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">质量：</span>
                                        <span className="font-medium">{posterRatioResults['2:3'].cropSettings?.quality}%</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">尺寸：</span>
                                        <span className="font-medium">
                                          {posterRatioResults['2:3'].cropSettings?.outputWidth}×{posterRatioResults['2:3'].cropSettings?.outputHeight}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* 3:4比例结果 */}
                              <div className="flex flex-col space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <h4 className={`text-sm font-medium ${selectedPosterRatio === '3:4' ? 'text-primary' : ''}`}>
                                    3:4 竖版海报
                                  </h4>
                                  <button
                                    className={`px-2 py-1 rounded text-xs ${selectedPosterRatio === '3:4' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                    onClick={() => {
                                      setSelectedPosterRatio('3:4');
                                      setCroppedPreview(posterRatioResults['3:4'].processedUrl || '');
                                    }}
                                  >
                                    {selectedPosterRatio === '3:4' ? '已选择' : '选择'}
                                  </button>
                                </div>
                                
                                {/* 3:4预览图 */}
                                <div className="flex-1 flex items-center justify-center bg-white rounded-lg p-3 overflow-hidden border border-gray-200">
                                  {posterRatioResults['3:4'].isProcessing ? (
                                    <div className="text-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                                      <p className="text-xs text-blue-600 mt-1">处理中...</p>
                                    </div>
                                  ) : posterRatioResults['3:4'].processedUrl ? (
                                    <img 
                                      src={posterRatioResults['3:4'].processedUrl} 
                                      alt="3:4处理后的图片" 
                                      className="max-w-full max-h-full object-contain border border-gray-200 rounded bg-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="text-center text-gray-400">
                                      <FileImage className="h-8 w-8 mx-auto" />
                                      <p className="text-xs mt-1">等待处理</p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* 3:4输出信息 */}
                                {posterRatioResults['3:4'].cropSettings && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">格式：</span>
                                        <span className="font-medium">{posterRatioResults['3:4'].cropSettings?.format.toUpperCase()}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">质量：</span>
                                        <span className="font-medium">{posterRatioResults['3:4'].cropSettings?.quality}%</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">尺寸：</span>
                                        <span className="font-medium">
                                          {posterRatioResults['3:4'].cropSettings?.outputWidth}×{posterRatioResults['3:4'].cropSettings?.outputHeight}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 输出信息和操作按钮 */}
                            {selectedPosterRatio && posterRatioResults[selectedPosterRatio].processedUrl && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium mb-2 text-green-800">处理完成 - 已选择 {selectedPosterRatio}</h4>
                                
                                {/* 操作按钮 */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={downloadImage}
                                    className="flex-1"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    下载选中的图片
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCroppedPreview('');
                                      setPosterRatioResults({
                                        '2:3': { isProcessing: false },
                                        '3:4': { isProcessing: false }
                                      });
                                      toast({
                                        title: "已清除",
                                        description: "处理结果已清除",
                                      })
                                    }}
                                  >
                                    清除
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 背景模式或单图模式 */
                          <div className={`h-96 flex flex-col space-y-3`}>
                            {/* 处理后的图片预览 */}
                            <div className={`flex-1 max-h-80 flex items-center justify-center bg-gray-50 rounded-lg p-4 overflow-hidden`}>
                              {croppedPreview ? (
                                <img 
                                  src={croppedPreview} 
                                  alt="处理后的图片" 
                                  className="max-w-full max-h-full object-contain border border-gray-200 rounded bg-white shadow-sm"
                                />
                              ) : (
                                <div className="text-center">
                                  <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mx-auto" />
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                                    自动处理已启用，上传图片后将自动处理
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* 输出信息 */}
                            {croppedPreview && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium mb-2 text-green-800">处理完成</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">格式：</span>
                                    <span className="font-medium">{cropSettings.format.toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">质量：</span>
                                    <span className="font-medium">{cropSettings.quality}%</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">尺寸：</span>
                                    <span className="font-medium">
                                      {cropSettings.outputWidth}×{cropSettings.outputHeight}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 操作按钮 */}
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    onClick={downloadImage}
                                    className="flex-1"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    下载图片
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCroppedPreview('')
                                      toast({
                                        title: "已清除",
                                        description: "处理结果已清除",
                                      })
                                    }}
                                  >
                                    清除
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 手动裁切模式：显示可视化编辑器 */
                      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                        {/* 可视化裁切编辑器 */}
                        <VisualCropEditor
                          imageUrl={originalPreview}
                          imageName={selectedImage.name}
                          imageWidth={selectedImage.width}
                          imageHeight={selectedImage.height}
                          aspectRatio={cropMode === 'poster' ? (posterRatio === '2:3' ? 2/3 : 3/4) : 16/9}
                          initialCrop={cropMode === 'poster' ? {
                            x: Math.round((selectedImage.width - (selectedImage.height * (posterRatio === '2:3' ? 2/3 : 3/4))) / 2),
                            y: 0,
                            width: Math.round(selectedImage.height * (posterRatio === '2:3' ? 2/3 : 3/4)),
                            height: selectedImage.height
                          } : {
                            x: Math.round((selectedImage.width - (selectedImage.height * 16/9)) / 2),
                            y: 0,
                            width: Math.round(selectedImage.height * 16/9),
                            height: selectedImage.height
                          }}
                          onCropChange={(crop) => {
                            setCropArea(crop)
                            // 更新裁切设置
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
                            // 重置裁切区域
                            if (cropMode === 'poster') {
                              const defaultCrop = {
                                x: Math.round((selectedImage.width - (selectedImage.height * (posterRatio === '2:3' ? 2/3 : 3/4))) / 2),
                                y: 0,
                                width: Math.round(selectedImage.height * (posterRatio === '2:3' ? 2/3 : 3/4)),
                                height: selectedImage.height
                              }
                              setCropArea(defaultCrop)
                              setCroppedPreview('') // 清除之前的处理结果
                            } else {
                              const defaultCrop = {
                                x: Math.round((selectedImage.width - (selectedImage.height * 16/9)) / 2),
                                y: 0,
                                width: Math.round(selectedImage.height * 16/9),
                                height: selectedImage.height
                              }
                              setCropArea(defaultCrop)
                              setCroppedPreview('') // 清除之前的处理结果
                            }
                          }}
                        />

                        {/* 操作控制区 */}
                        <div className="space-y-2 sm:space-y-3 flex-shrink-0 mt-2 sm:mt-3">
                          {/* 操作按钮 */}
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (selectedImage && cropArea) {
                                  // 使用当前裁切区域创建设置
                                  let outputWidth = cropArea.width
                                  let outputHeight = cropArea.height
                                  let format = globalSettings.defaultFormat
                                  
                                  // 根据裁切模式应用分辨率限制
                                  if (cropMode === 'poster') {
                                    // 海报模式：根据当前选择的比例设置不同的分辨率范围
                                    let minWidth, minHeight, maxWidth, maxHeight;
                                    if (posterRatio === '2:3') {
                                      // 2:3比例：500×750到2000×3000
                                      minWidth = 500;
                                      minHeight = 750;
                                      maxWidth = 2000;
                                      maxHeight = 3000;
                                    } else {
                                      // 3:4比例：500×666到2000×2666
                                      minWidth = 500;
                                      minHeight = 666;
                                      maxWidth = 2000;
                                      maxHeight = 2666;
                                    }
                                    
                                    // 调整分辨率到规定范围
                                    if (outputWidth > maxWidth || outputHeight > maxHeight) {
                                      // 高于最大分辨率，等比缩小
                                      const scale = Math.min(maxWidth / outputWidth, maxHeight / outputHeight)
                                      outputWidth = outputWidth * scale
                                      outputHeight = outputHeight * scale
                                    } else if (outputWidth < minWidth || outputHeight < minHeight) {
                                      // 低于最小分辨率，等比放大
                                      const scale = Math.max(minWidth / outputWidth, minHeight / outputHeight)
                                      outputWidth = outputWidth * scale
                                      outputHeight = outputHeight * scale
                                    }
                                  } else {
                                    // 背景幕布模式：16:9比例
                                    const [minWidth, minHeight] = globalSettings.backdropMinResolution.split('x').map(Number)
                                    const [maxWidth, maxHeight] = globalSettings.backdropMaxResolution.split('x').map(Number)
                                    
                                    // 调整分辨率到规定范围
                                    if (outputWidth > maxWidth || outputHeight > maxHeight) {
                                      // 高于最大分辨率，等比缩小
                                      const scale = Math.min(maxWidth / outputWidth, maxHeight / outputHeight)
                                      outputWidth = outputWidth * scale
                                      outputHeight = outputHeight * scale
                                    } else if (outputWidth < minWidth || outputHeight < minHeight) {
                                      // 低于最小分辨率，等比放大
                                      const scale = Math.max(minWidth / outputWidth, minHeight / outputHeight)
                                      outputWidth = outputWidth * scale
                                      outputHeight = outputHeight * scale
                                    }
                                  }
                                  
                                  // TMDB只支持JPG格式，无论是海报还是背景幕布
                                  format = 'jpg'
                                  
                                  const cropSettings: CropSettings = {
                                    x: cropArea.x,
                                    y: cropArea.y,
                                    width: cropArea.width,
                                    height: cropArea.height,
                                    outputWidth: Math.round(outputWidth),
                                    outputHeight: Math.round(outputHeight),
                                    quality: globalSettings.defaultQuality,
                                    format: format
                                  }
                                  processImage(selectedImage, cropSettings)
                                }
                              }}
                              disabled={isProcessing || !cropArea}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  处理中...
                                </>
                              ) : (
                                <>
                                  <Scissors className="h-4 w-4 mr-1" />
                                  确认裁切
                                </>
                              )}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // 使用自动裁切
                                if (selectedImage) {
                                  const autoSettings = calculateAutoCrop(selectedImage)
                                  setCropArea({
                                    x: autoSettings.x,
                                    y: autoSettings.y,
                                    width: autoSettings.width,
                                    height: autoSettings.height
                                  })
                                  setCropSettings(autoSettings)
                                  processImage(selectedImage, autoSettings)
                                }
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              自动裁切
                            </Button>
                          </div>

                          {/* 处理进度 */}
                          {isProcessing && (
                            <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-500" />
                                <div className="flex-1">
                                  <p className="text-xs sm:text-sm font-medium text-blue-800">正在处理图片...</p>
                                  <Progress value={processingProgress} className="h-1.5 sm:h-2 mt-1 sm:mt-2" />
                                </div>
                                <span className="text-xs sm:text-sm text-blue-600 font-medium">
                                  {processingProgress}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 处理结果 */}
                          {croppedPreview && (
                            <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                              <h4 className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-green-800">处理完成</h4>
                              <div className="space-y-2 sm:space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                  {/* 输出预览 */}
                                  <div className="border border-gray-200 rounded p-1 sm:p-2">
                                    <p className="text-xs text-muted-foreground mb-1">输出预览</p>
                                    <div className="h-16 sm:h-20 bg-gray-100 rounded flex items-center justify-center">
                                      <img 
                                        src={croppedPreview} 
                                        alt="输出预览" 
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                  </div>
                                  {/* 输出信息 */}
                                  <div className="space-y-0.5 sm:space-y-1">
                                    <p className="text-xs">
                                      <span className="text-muted-foreground">格式：</span>
                                      <span className="font-medium">{cropSettings.format.toUpperCase()}</span>
                                    </p>
                                    <p className="text-xs">
                                      <span className="text-muted-foreground">质量：</span>
                                      <span className="font-medium">{cropSettings.quality}%</span>
                                    </p>
                                    <p className="text-xs">
                                      <span className="text-muted-foreground">尺寸：</span>
                                      <span className="font-medium">
                                        {cropSettings.outputWidth}×{cropSettings.outputHeight}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                {/* 下载按钮 */}
                                <Button
                                  size="sm"
                                  onClick={downloadImage}
                                  className="w-full"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  下载图片
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 空状态 */
                  <div className={`${
                    cropMode === 'poster' 
                      ? 'flex-1 flex items-center justify-center'
                      : 'h-36 sm:h-48 flex items-center justify-center'
                  }`}>
                    <div className="text-center">
                      <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        请先上传图片进行{globalSettings.autoProcess || globalSettings.autoProcessNon16x9 ? '处理' : '裁切'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 帮助对话框 */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              使用说明
            </DialogTitle>
            <DialogDescription>
              海报背景裁切工具使用指南
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">海报模式</h4>
              <p className="text-sm text-muted-foreground">
                支持两种比例：
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 mt-1 space-y-1">
                <li>2:3 标准海报 - 符合TMDB海报规范，分辨率范围500×750到2000×3000</li>
                <li>3:4 竖版海报 - 适用于竖版展示，分辨率范围500×666到2000×2666</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                输出格式为JPG（TMDB要求）
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">背景幕布模式（16:9）</h4>
              <p className="text-sm text-muted-foreground">
                适用于分集封面，分辨率范围1280×720到3840×2160
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                输出格式为JPG（TMDB要求）
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">自动处理</h4>
              <p className="text-sm text-muted-foreground">
                只要开启自动处理功能，上传任何图片都会自动按当前选择的模式进行裁切和尺寸调整
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">海报比例对比功能</h4>
              <p className="text-sm text-muted-foreground">
                在海报模式下，系统会自动生成2:3和3:4两种比例的裁切结果，您可以：
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 mt-1 space-y-1">
                <li>直观比较两种比例的裁切效果</li>
                <li>点击"选择"按钮切换要下载的比例</li>
                <li>已选择的比例会显示为"已选择"状态</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">分辨率限制</h4>
              <p className="text-sm text-muted-foreground">
                系统会根据不同模式自动调整输出分辨率到规定范围内：
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 mt-1 space-y-1">
                <li>高于最大分辨率：等比缩小到最大分辨率</li>
                <li>低于最小分辨率：等比放大到最小分辨率</li>
                <li>符合分辨率范围：保持原分辨率</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">格式要求</h4>
              <p className="text-sm text-muted-foreground">
                所有模式均强制输出JPG格式（TMDB要求）
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">操作说明</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>拖拽图片到上传区域或点击"选择文件"按钮上传图片</li>
                <li>系统会自动处理图片，生成预览结果</li>
                <li>在海报模式下，查看并比较两种比例的效果</li>
                <li>点击"选择"按钮选择要下载的比例</li>
                <li>点击"下载选中的图片"按钮保存处理后的图片</li>
                <li>点击"清除"按钮清除当前处理结果</li>
                <li>点击"重置"按钮清空工作区</li>
              </ul>
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
  )
}
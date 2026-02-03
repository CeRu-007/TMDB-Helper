import { useState, useCallback } from 'react'
import { useToast } from '@/shared/components/ui/use-toast'
import { SubtitleFile } from '../types'
import { parseSubtitleFile } from '../utils'
import { logger } from '@/lib/utils/logger'

export function useFileManagement() {
  const [subtitleFiles, setSubtitleFiles] = useState<SubtitleFile[]>([])
  const [selectedFile, setSelectedFile] = useState<SubtitleFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const { toast } = useToast()

  // 处理文件上传（通用函数）
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (!file.name.match(/\.(srt|vtt|ass|ssa)$/i)) {
        toast({
          title: "文件格式不支持",
          description: `${file.name} 不是支持的字幕格式`,
          variant: "destructive"
        })
        continue
      }

      try {
        const content = await file.text()
        const episodes = parseSubtitleFile(content, file.name)

        const subtitleFile: SubtitleFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content,
          episodes,
          uploadTime: new Date()
        }

        setSubtitleFiles(prev => [...prev, subtitleFile])
        toast({
          title: "文件上传成功",
          description: `${file.name} 已成功解析为 ${episodes.length} 集`,
        })
      } catch (error) {
        logger.error('文件处理失败:', error)
        toast({
          title: "文件处理失败",
          description: `${file.name} 处理时出现错误`,
          variant: "destructive"
        })
      }
    }
  }, [toast])

  // 处理文件上传
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    await processFiles(files)

    // 清空input
    event.target.value = ''
  }, [processFiles])

  // 拖拽处理函数
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragOver(false)
      }
      return newCounter
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await processFiles(files)
    }
  }, [processFiles])

  // 删除文件
  const handleDeleteFile = useCallback((fileId: string) => {
    setSubtitleFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFile?.id === fileId) {
      setSelectedFile(null)
    }
  }, [selectedFile])

  // 选择文件
  const handleSelectFile = useCallback((file: SubtitleFile) => {
    setSelectedFile(file)
  }, [])

  return {
    subtitleFiles,
    selectedFile,
    isDragOver,
    dragCounter,
    setSubtitleFiles,
    setSelectedFile,
    processFiles,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleDeleteFile,
    handleSelectFile
  }
}
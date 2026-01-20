import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

const SUPPORTED_SUBTITLE_FORMATS = ['.srt', '.ass', '.vtt', '.ssa', '.sub']

export const useFileUpload = () => {
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleFileUpload = useCallback((file: File) => {
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!SUPPORTED_SUBTITLE_FORMATS.includes(fileExtension)) {
      toast.error('不支持的文件格式', {
        description: `请上传字幕文件 (${SUPPORTED_SUBTITLE_FORMATS.join(', ')})`
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFileName(file.name)
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10
        if (newProgress >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return newProgress
      })
    }, 100)

    uploadTimeoutRef.current = setTimeout(() => {
      clearInterval(progressInterval)
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFileName(null)
      toast.error('文件上传超时')
    }, 30000)

    const reader = new FileReader()
    reader.onload = (e) => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current)
        uploadTimeoutRef.current = null
      }
      
      clearInterval(progressInterval)
      
      const content = e.target?.result as string
      if (!content) {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadedFileName(null)
        return
      }
      
      setUploadedFileContent(content)
      setIsUploading(false)
      setUploadProgress(100)
    }

    reader.onerror = () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current)
        uploadTimeoutRef.current = null
      }
      
      clearInterval(progressInterval)
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFileName(null)
      toast.error('文件读取失败')
    }

    reader.readAsText(file, 'utf-8')
  }, [])

  const handleCancelUpload = useCallback(() => {
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current)
      uploadTimeoutRef.current = null
    }
    
    setIsUploading(false)
    setUploadProgress(0)
    setUploadedFileName(null)
    setUploadedFileContent(null)
    
    toast.info('已取消上传')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, fileInputRef: React.RefObject<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    
    if (!SUPPORTED_SUBTITLE_FORMATS.includes(fileExtension)) {
      toast.error('不支持的文件格式')
      return
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files
      const event = new Event('change', { bubbles: true })
      fileInputRef.current.dispatchEvent(event)
    }
  }, [])

  const clearUpload = useCallback(() => {
    setUploadedFileContent(null)
    setUploadedFileName(null)
  }, [])

  return {
    uploadedFileContent,
    uploadedFileName,
    isUploading,
    uploadProgress,
    isDragOver,
    handleFileUpload,
    handleCancelUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearUpload
  }
}

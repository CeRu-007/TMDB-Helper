"use client"

import { useCallback, useState } from 'react'
import { toPng } from 'html-to-image'

async function convertExternalImageToDataUrl(src: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/files/avatar-proxy?url=${encodeURIComponent(src)}`
    const response = await fetch(proxyUrl)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function inlineExternalImages(element: HTMLElement): Promise<Map<HTMLImageElement, string>> {
  const originalSrcs = new Map<HTMLImageElement, string>()
  const images = element.querySelectorAll('img')

  const tasks = Array.from(images).map(async (img) => {
    const src = img.getAttribute('src') || ''
    if (!src.startsWith('http')) return
    if (src.includes('localhost') || src.includes('127.0.0.1')) return

    originalSrcs.set(img, src)

    const dataUrl = await convertExternalImageToDataUrl(src)
    if (dataUrl) {
      img.setAttribute('src', dataUrl)
      img.removeAttribute('crossorigin')
      img.removeAttribute('crossOrigin')
    } else {
      img.setAttribute('src', '')
      img.style.visibility = 'hidden'
    }
  })

  await Promise.all(tasks)
  return originalSrcs
}

function restoreOriginalImages(originalSrcs: Map<HTMLImageElement, string>) {
  originalSrcs.forEach((src, img) => {
    if (!img.isConnected) return
    img.setAttribute('src', src)
    img.style.visibility = ''
  })
}

export function useShareImage() {
  const [generating, setGenerating] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateImage = useCallback(async (element: HTMLElement): Promise<string | null> => {
    setGenerating(true)
    setError(null)
    let originalSrcs: Map<HTMLImageElement, string> | null = null

    try {
      originalSrcs = await inlineExternalImages(element)

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          overflow: 'visible',
        },
        backgroundColor: document.documentElement.classList.contains('dark')
          ? '#1f2937'
          : '#ffffff',
      })

      return dataUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[ShareImage] 生成图片失败:', message)
      setError(message || '生成图片失败')
      return null
    } finally {
      if (originalSrcs) {
        restoreOriginalImages(originalSrcs)
      }
      setGenerating(false)
    }
  }, [])

  const openPreview = useCallback(async (element: HTMLElement) => {
    const dataUrl = await generateImage(element)
    if (dataUrl) {
      setImageDataUrl(dataUrl)
      setPreviewOpen(true)
    }
  }, [generateImage])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setImageDataUrl(null)
    setError(null)
  }, [])

  const downloadImage = useCallback(() => {
    if (!imageDataUrl) return
    const link = document.createElement('a')
    link.download = `tmdb-maintenance-review-${new Date().toISOString().split('T')[0]}.png`
    link.href = imageDataUrl
    link.click()
  }, [imageDataUrl])

  const shareImage = useCallback(async () => {
    if (!imageDataUrl) return
    try {
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'tmdb-maintenance-review.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'TMDB 维护回顾',
          files: [file],
        })
      } else {
        downloadImage()
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      downloadImage()
    }
  }, [imageDataUrl, downloadImage])

  return {
    generating,
    previewOpen,
    imageDataUrl,
    error,
    openPreview,
    closePreview,
    downloadImage,
    shareImage,
  }
}

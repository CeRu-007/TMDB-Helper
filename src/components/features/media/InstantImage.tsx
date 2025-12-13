"use client"

import { useState, useEffect } from 'react'

interface InstantImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function InstantImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  placeholder = '/placeholder.svg',
  onLoad,
  onError
}: InstantImageProps) {
  const [imageSrc, setImageSrc] = useState(src || placeholder)

  useEffect(() => {
    if (!src || src === placeholder) {
      setImageSrc(placeholder)
      return
    }

    setImageSrc(src)
  }, [src, placeholder])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="eager"
      onLoad={onLoad}
      onError={onError}
    />
  )
}
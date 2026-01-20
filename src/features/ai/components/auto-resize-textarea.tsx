import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react"

export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, forwardedRef) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [height, setHeight] = useState('60px')
  const [isOverflowing, setIsOverflowing] = useState(false)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200)
    
    setHeight(`${newHeight}px`)
    textarea.style.height = `${newHeight}px`
    setIsOverflowing(textarea.scrollHeight > 200)
  }, [])

  useEffect(() => {
    adjustHeight()
    window.addEventListener('resize', adjustHeight)
    return () => window.removeEventListener('resize', adjustHeight)
  }, [props.value, adjustHeight])

  useEffect(() => {
    if (typeof forwardedRef === 'function') {
      forwardedRef(textareaRef.current)
    } else if (forwardedRef) {
      forwardedRef.current = textareaRef.current
    }
  }, [forwardedRef])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const style = document.createElement('style')
    style.textContent = `
      .auto-resize-textarea::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-thumb {
        background: hsl(var(--border));
        border-radius: 3px;
      }
      
      .auto-resize-textarea::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground));
      }
      
      .auto-resize-textarea {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--border)) transparent;
      }
      
      .auto-resize-textarea:hover {
        scrollbar-color: hsl(var(--muted-foreground)) transparent;
      }
    `
    
    document.head.appendChild(style)
    textarea.classList.add('auto-resize-textarea')
    
    return () => {
      document.head.removeChild(style)
      textarea.classList.remove('auto-resize-textarea')
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    if (isOverflowing) {
      const { scrollTop, scrollHeight, clientHeight } = textarea
      const isAtTop = scrollTop === 0
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
      
      if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
        return
      }
      
      e.stopPropagation()
      e.preventDefault()
    }
  }, [isOverflowing])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={className}
      onWheel={handleWheel}
      style={{ 
        height,
        resize: 'none',
        overflow: isOverflowing ? 'auto' : 'hidden',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--border)) transparent'
      }}
    />
  )
})

AutoResizeTextarea.displayName = 'AutoResizeTextarea'

"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  // 默认为false，避免SSR和客户端渲染不匹配问题
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') return;
    
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)

    return () => {
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isMobile
}

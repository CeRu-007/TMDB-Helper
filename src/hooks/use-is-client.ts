"use client"

import { useState, useEffect } from "react"

/**
 * 自定义钩子，用于确定当前代码是否在客户端执行
 * 返回一个布尔值，表示是否已完成客户端渲染
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // 在客户端渲染完成后设置为true
    setIsClient(true)
  }, [])

  return isClient
} 
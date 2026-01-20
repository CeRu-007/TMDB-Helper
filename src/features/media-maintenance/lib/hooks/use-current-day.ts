"use client"

import { useState, useEffect } from 'react'
import { useIsClient } from './use-is-client'

export interface UseCurrentDayReturn {
  currentDay: number
  isClientReady: boolean
}

// 判断当前环境是否为客户端
const isClientEnv = typeof window !== 'undefined'

export function useCurrentDay(): UseCurrentDayReturn {
  const [currentDay, setCurrentDay] = useState(() => {
    if (isClientEnv) {
      const jsDay = new Date().getDay() // 0-6，0是周日
      return jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
    }
    return 0 // 默认周一
  })

  const [isClientReady, setIsClientReady] = useState(false)
  const isClient = useIsClient()

  // 客户端渲染时正确初始化当前日期
  useEffect(() => {
    if (isClient) {
      const jsDay = new Date().getDay()
      const adjustedDay = jsDay === 0 ? 6 : jsDay - 1
      setCurrentDay(adjustedDay)
      setIsClientReady(true)
    }
  }, [isClient])

  // 定时更新当前日期（仅在客户端）
  useEffect(() => {
    if (!isClient) return

    const dayTimer = setInterval(() => {
      // 将JS的日期（0=周日，1=周一）转换为我们的数组索引（0=周一，6=周日）
      const jsDay = new Date().getDay() // 0-6，0是周日
      const adjustedDay = jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
      setCurrentDay(adjustedDay)
    }, 60000) // 每分钟更新一次

    return () => {
      clearInterval(dayTimer)
    }
  }, [isClient])

  return {
    currentDay,
    isClientReady
  }
}
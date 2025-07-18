"use client"

import { useEffect, useState, useCallback } from 'react'
import { optimisticUpdateManager } from '@/lib/optimistic-update-manager'

interface OptimisticConfig {
  timeout: number
  maxRetries: number
  retryDelays: number[]
  adaptiveTimeout: boolean
}

interface NetworkQuality {
  rtt: number // Round Trip Time
  downlink: number // Mbps
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
}

export function useOptimisticConfig() {
  const [config, setConfig] = useState<OptimisticConfig>({
    timeout: 30000, // 30秒默认超时
    maxRetries: 3,
    retryDelays: [1000, 2000, 5000],
    adaptiveTimeout: true
  })

  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null)

  // 检测网络质量
  const detectNetworkQuality = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        setNetworkQuality({
          rtt: connection.rtt || 100,
          downlink: connection.downlink || 10,
          effectiveType: connection.effectiveType || '4g'
        })
      }
    }
  }, [])

  // 根据网络质量调整配置
  const adaptConfigToNetwork = useCallback((quality: NetworkQuality) => {
    let newConfig = { ...config }

    // 根据网络类型调整超时时间
    switch (quality.effectiveType) {
      case 'slow-2g':
        newConfig.timeout = 60000 // 60秒
        newConfig.retryDelays = [3000, 6000, 10000]
        break
      case '2g':
        newConfig.timeout = 45000 // 45秒
        newConfig.retryDelays = [2000, 4000, 8000]
        break
      case '3g':
        newConfig.timeout = 35000 // 35秒
        newConfig.retryDelays = [1500, 3000, 6000]
        break
      case '4g':
      default:
        newConfig.timeout = 30000 // 30秒
        newConfig.retryDelays = [1000, 2000, 5000]
        break
    }

    // 根据RTT进一步调整
    if (quality.rtt > 1000) {
      newConfig.timeout += 15000 // 高延迟时增加15秒
      newConfig.retryDelays = newConfig.retryDelays.map(delay => delay * 1.5)
    } else if (quality.rtt > 500) {
      newConfig.timeout += 10000 // 中等延迟时增加10秒
      newConfig.retryDelays = newConfig.retryDelays.map(delay => delay * 1.2)
    }

    // 根据下行速度调整重试次数
    if (quality.downlink < 1) {
      newConfig.maxRetries = 5 // 低速网络增加重试次数
    } else if (quality.downlink < 5) {
      newConfig.maxRetries = 4
    } else {
      newConfig.maxRetries = 3
    }

    return newConfig
  }, [config])

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<OptimisticConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig }
      
      // 应用到乐观更新管理器
      optimisticUpdateManager.setOperationTimeout(updated.timeout)
      optimisticUpdateManager.setRetryConfig(updated.maxRetries, updated.retryDelays)
      
      console.log('[OptimisticConfig] 配置已更新:', updated)
      return updated
    })
  }, [])

  // 重置为默认配置
  const resetConfig = useCallback(() => {
    const defaultConfig: OptimisticConfig = {
      timeout: 30000,
      maxRetries: 3,
      retryDelays: [1000, 2000, 5000],
      adaptiveTimeout: true
    }
    updateConfig(defaultConfig)
  }, [updateConfig])

  // 手动触发网络适配
  const adaptToNetwork = useCallback(() => {
    if (networkQuality && config.adaptiveTimeout) {
      const adaptedConfig = adaptConfigToNetwork(networkQuality)
      updateConfig(adaptedConfig)
    }
  }, [networkQuality, config.adaptiveTimeout, adaptConfigToNetwork, updateConfig])

  // 监听网络变化
  useEffect(() => {
    detectNetworkQuality()

    const handleConnectionChange = () => {
      detectNetworkQuality()
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', handleConnectionChange)
        return () => {
          connection.removeEventListener('change', handleConnectionChange)
        }
      }
    }
  }, [detectNetworkQuality])

  // 自动适配网络质量
  useEffect(() => {
    if (networkQuality && config.adaptiveTimeout) {
      const adaptedConfig = adaptConfigToNetwork(networkQuality)
      if (JSON.stringify(adaptedConfig) !== JSON.stringify(config)) {
        updateConfig(adaptedConfig)
      }
    }
  }, [networkQuality, config.adaptiveTimeout, adaptConfigToNetwork, updateConfig])

  // 初始化配置
  useEffect(() => {
    optimisticUpdateManager.setOperationTimeout(config.timeout)
    optimisticUpdateManager.setRetryConfig(config.maxRetries, config.retryDelays)
  }, [])

  return {
    config,
    networkQuality,
    updateConfig,
    resetConfig,
    adaptToNetwork,
    detectNetworkQuality
  }
}

export default useOptimisticConfig

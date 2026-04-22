'use client'

import { useEffect } from 'react'

interface ElectronClassProviderProps {
  children: React.ReactNode
}

export function ElectronClassProvider({ children }: ElectronClassProviderProps) {
  useEffect(() => {
    // 检测是否在 Electron 环境
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      document.body.classList.add('electron-app')
    }
  }, [])

  return <>{children}</>
}

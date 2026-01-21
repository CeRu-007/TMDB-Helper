"use client"

import { useEffect, useState } from 'react'
import { AuthUser } from '@/shared/components/auth-provider'

export function useAuthCheck(isElectron: boolean): {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
} {
  const [state, setState] = useState({
    user: null as AuthUser | null,
    isLoading: !isElectron,
    isAuthenticated: isElectron
  })

  useEffect(() => {
    if (isElectron) return

    const checkAuth = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setState({
              user: data.user,
              isLoading: false,
              isAuthenticated: true
            })
            return
          }
        }
      } catch {
        // Silent failure
      }

      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false
      })
    }

    checkAuth()
  }, [isElectron])

  return state
}
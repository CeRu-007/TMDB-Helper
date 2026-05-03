"use client"

import { useEffect, useState } from 'react'
import type { AuthUser } from '@/shared/types/auth.types'

export function useAuthCheck(): {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
} {
  const [state, setState] = useState({
    user: null as AuthUser | null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        if (cancelled) return

        if (response.ok) {
          const data = await response.json()
          if (cancelled) return
          if (data.success) {
            setState({ user: data.user, isLoading: false, isAuthenticated: true })
            return
          }
        } else {
          console.warn('[AuthCheck] verify failed:', response.status, response.statusText)
        }
      } catch (err) {
        console.error('[AuthCheck] fetch error:', err)
      }

      if (!cancelled) {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
    }

    checkAuth()

    return () => { cancelled = true }
  }, [])

  return state
}

"use client"

import { useEffect, useState } from 'react'
import type { AuthUser } from '@/shared/types/auth.types'

export function useAuthCheck(): {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialSetup: boolean
} {
  const [state, setState] = useState({
    user: null as AuthUser | null,
    isLoading: true,
    isAuthenticated: false,
    isInitialSetup: false
  })

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const adminResponse = await fetch('/api/auth/check-admin', {
          method: 'GET',
          credentials: 'include'
        })

        if (cancelled) return

        if (adminResponse.ok) {
          const adminData = await adminResponse.json()
          if (adminData.success && !adminData.hasAdmin) {
            setState({ user: null, isLoading: false, isAuthenticated: false, isInitialSetup: true })
            return
          }
        } else {
          const adminData = await adminResponse.json().catch(() => ({}))
          if (adminData.hasAdmin === false) {
            setState({ user: null, isLoading: false, isAuthenticated: false, isInitialSetup: true })
            return
          }
        }

        if (cancelled) return

        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include'
        })

        if (cancelled) return

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setState({ user: data.user, isLoading: false, isAuthenticated: true, isInitialSetup: false })
            return
          }
        }
      } catch {}

      if (!cancelled) {
        setState({ user: null, isLoading: false, isAuthenticated: false, isInitialSetup: false })
      }
    }

    checkAuth()

    return () => { cancelled = true }
  }, [])

  return state
}

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
      let hasAdmin: boolean | null = null

      try {
        const adminResponse = await fetch('/api/auth/check-admin', {
          method: 'GET',
          credentials: 'include'
        })

        if (cancelled) return

        try {
          const adminData = await adminResponse.json()
          if (typeof adminData.hasAdmin === 'boolean') {
            hasAdmin = adminData.hasAdmin
          }
        } catch {
          hasAdmin = null
        }
      } catch {
        hasAdmin = null
      }

      if (cancelled) return

      if (hasAdmin === false) {
        setState({ user: null, isLoading: false, isAuthenticated: false, isInitialSetup: true })
        return
      }

      if (hasAdmin === null) {
        setState({ user: null, isLoading: false, isAuthenticated: false, isInitialSetup: true })
        return
      }

      try {
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

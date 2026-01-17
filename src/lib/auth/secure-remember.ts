// Client-side secure remember utility (username/password)
// Stores data only in the browser; never sends password to server.
// Uses Web Crypto (AES-GCM) if available; falls back to no-op for password
// to avoid insecure plaintext storage unless explicitly allowed.

import { storageService } from '../storage/storage-service'

const USERNAME_KEY = 'last_login_username'
const PASSWORD_KEY = 'last_login_password_enc'
const REMEMBER_KEY = 'last_login_remember_me'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.crypto !== 'undefined'
}

async function getKey(): Promise<CryptoKey | null> {
  if (!isBrowser() || !window.crypto?.subtle) return null
  // Derive a per-origin key using a static salt; in real-world, derive from a user secret
  const base = `${location.origin}-tmdb-helper-remember`
  const enc = new TextEncoder().encode(base)
  const hash = await window.crypto.subtle.digest('SHA-256', enc)
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function saveRemember(username: string, password: string, remember: boolean): Promise<void> {
  if (!isBrowser()) return
  try {
    // username & remember flag saved plainly to config API (already implemented elsewhere),
    // but we still mirror username locally for faster prefill.
    storageService.set(USERNAME_KEY, username)
    storageService.set(REMEMBER_KEY, remember ? '1' : '0')

    if (!remember) {
      storageService.remove(PASSWORD_KEY)
      return
    }

    const key = await getKey()
    if (!key) {
      // No secure crypto; do not store password to avoid plaintext risk
      storageService.remove(PASSWORD_KEY)
      return
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const pt = new TextEncoder().encode(password)
    const ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt)

    // Store iv + ciphertext as base64
    const combined = new Uint8Array(iv.length + new Uint8Array(ct).length)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ct), iv.length)
    const b64 = btoa(String.fromCharCode(...combined))
    storageService.set(PASSWORD_KEY, b64)
  } catch (e) {

  }
}

export async function loadRemember(): Promise<{ username: string; password: string; remember: boolean; }>{
  if (!isBrowser()) return { username: '', password: '', remember: false }
  try {
    const username = storageService.get<string>(USERNAME_KEY, '')
    const remember = storageService.get<string>(REMEMBER_KEY, '0') === '1'

    const enc = storageService.get<string>(PASSWORD_KEY, '')
    if (!remember || !enc) return { username, password: '', remember }

    const key = await getKey()
    if (!key) return { username, password: '', remember }

    const raw = Uint8Array.from(atob(enc), c => c.charCodeAt(0))
    const iv = raw.slice(0, 12)
    const data = raw.slice(12)
    const pt = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    const password = new TextDecoder().decode(pt)
    return { username, password, remember }
  } catch (e) {

    return { username: storageService.get<string>(USERNAME_KEY, ''), password: '', remember: storageService.get<string>(REMEMBER_KEY, '0') === '1' }
  }
}

export function clearRemember(): void {
  if (!isBrowser()) return
  try {
    storageService.remove(PASSWORD_KEY)
    // keep username and remember flag behavior aligned with UI choices
  } catch {}
}


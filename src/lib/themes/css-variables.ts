import type { ThemeConfig, ThemeBorderRadius } from './types'

const RADIUS_MAP: Record<ThemeBorderRadius, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
}

const FONT_SIZE_MAP = {
  small: '14px',
  medium: '16px',
  large: '18px',
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

export function themeToCSSVariables(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {}

  Object.entries(theme.colors).forEach(([key, value]) => {
    if (value !== undefined) {
      vars[`--${camelToKebab(key)}`] = value
    }
  })

  vars['--radius'] = RADIUS_MAP[theme.border.radius]
  vars['--font-family'] = theme.typography.fontFamily
  vars['--font-size-base'] = FONT_SIZE_MAP[theme.typography.fontSize]

  return vars
}

export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.setAttribute('data-theme', theme.id)

  const vars = themeToCSSVariables(theme)
  const currentVars = root.style
  const toRemove: string[] = []

  for (let i = 0; i < currentVars.length; i++) {
    const prop = currentVars.item(i)
    if (prop && prop.startsWith('--') && prop !== '--spacing-unit' && !(prop in vars)) {
      toRemove.push(prop)
    }
  }
  toRemove.forEach(prop => root.style.removeProperty(prop))

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function clearTheme(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.removeAttribute('data-theme')

  const vars = root.style
  const toRemove: string[] = []
  for (let i = 0; i < vars.length; i++) {
    const prop = vars.item(i)
    if (prop && prop.startsWith('--') && prop !== '--spacing-unit') {
      toRemove.push(prop)
    }
  }
  toRemove.forEach(prop => root.style.removeProperty(prop))
}

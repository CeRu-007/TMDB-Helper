const localeMap: Record<string, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  "zh-HK": "zh-HK",
  "en-US": "en-US",
}

export function getIntlLocale(locale: string): string {
  return localeMap[locale] || "zh-CN"
}

export function formatDate(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatRelativeDate(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const intlLocale = getIntlLocale(locale)

  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" })

  if (Math.abs(diffDays) < 1) {
    return rtf.format(0, "day")
  } else if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day")
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(Math.round(diffDays / 7), "week")
  } else if (Math.abs(diffDays) < 365) {
    return rtf.format(Math.round(diffDays / 30), "month")
  } else {
    return rtf.format(Math.round(diffDays / 365), "year")
  }
}

export function formatShortDate(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
  }).format(d)
}
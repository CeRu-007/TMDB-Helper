const localeMap: Record<string, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  "zh-HK": "zh-HK",
  "en-US": "en-US",
}

export function getIntlLocale(locale: string): string {
  return localeMap[locale] || "zh-CN"
}

export function formatNumber(num: number, locale: string): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale).format(num)
}

export function formatPercentage(num: number, locale: string, decimals: number = 1): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100)
}

export function formatDecimal(num: number, locale: string, decimals: number = 2): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatCurrency(num: number, locale: string, currency: string = "USD"): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(num)
}
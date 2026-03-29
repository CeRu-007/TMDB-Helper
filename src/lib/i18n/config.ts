export interface LanguageConfig {
  code: string
  name: string
  nativeName: string
  isTraditional: boolean
}

export const AUTO_LANGUAGE: LanguageConfig = {
  code: "auto",
  name: "自动",
  nativeName: "Auto",
  isTraditional: false,
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  AUTO_LANGUAGE,
  {
    code: "zh-CN",
    name: "简体中文",
    nativeName: "简体中文",
    isTraditional: false,
  },
  {
    code: "en-US",
    name: "English",
    nativeName: "English",
    isTraditional: false,
  },
  {
    code: "zh-TW",
    name: "繁體中文（台灣）",
    nativeName: "繁體中文（台灣）",
    isTraditional: true,
  },
  {
    code: "zh-HK",
    name: "繁體中文（香港）",
    nativeName: "繁體中文（香港）",
    isTraditional: true,
  },
  {
    code: "ja-JP",
    name: "日本語",
    nativeName: "日本語",
    isTraditional: false,
  },
  {
    code: "ko-KR",
    name: "한국어",
    nativeName: "한국어",
    isTraditional: false,
  },
]

export const DEFAULT_LANGUAGE = "auto"

export const LANGUAGE_STORAGE_KEY = "tmdb_language"

export function getLanguageByCode(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
}

export function isValidLanguage(code: string): boolean {
  if (code === "auto") return true
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code && lang.code !== "auto")
}

export function getLanguageFallback(code: string): string {
  if (code === "auto") {
    return DEFAULT_LANGUAGE
  }
  if (code.startsWith("zh")) {
    const lang = getLanguageByCode(code)
    if (lang?.isTraditional) {
      return "zh-TW"
    }
    return "zh-CN"
  }
  if (code.startsWith("en")) {
    return "en-US"
  }
  return "zh-CN"
}

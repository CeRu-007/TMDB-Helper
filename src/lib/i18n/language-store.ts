import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, isValidLanguage } from "./config"
import { mapSystemLanguageToAppLanguage } from "./index"

export type SupportedLanguage = "zh-CN" | "en-US" | "zh-TW" | "zh-HK" | "auto"

interface LanguageState {
  language: SupportedLanguage
  isInitialized: boolean
  setLanguage: (language: string) => void
  initializeLanguage: () => void
  getEffectiveLanguage: () => SupportedLanguage
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "auto" as SupportedLanguage,
      isInitialized: false,

      setLanguage: (language: string) => {
        if (language === "auto" || isValidLanguage(language)) {
          set({ language: language as SupportedLanguage })
        }
      },

      initializeLanguage: () => {
        if (!get().isInitialized) {
          set({ isInitialized: true })
        }
      },

      getEffectiveLanguage: () => {
        const { language } = get()
        if (language === "auto") {
          const systemLang = typeof navigator !== "undefined" ? navigator.language || (navigator as any).userLanguage : "zh-CN"
          return mapSystemLanguageToAppLanguage(systemLang) as SupportedLanguage
        }
        return language
      },
    }),
    {
      name: "language-store",
      partialize: (state) => ({
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true
        }
      },
    }
  )
)

export const getStoredLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") {
    return "auto"
  }

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored) {
      if (stored === "auto" || isValidLanguage(stored)) {
        return stored as SupportedLanguage
      }
    }
  } catch {}

  return "auto"
}

"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

export interface Language {
  name: string
  code: string
}

export const LANGUAGES: Language[] = [
  // 亚洲语言
  { name: "简体中文", code: "zh-CN" },
  { name: "繁體中文", code: "zh-TW" },
  { name: "日本語", code: "ja-JP" },
  { name: "한국어", code: "ko-KR" },
  { name: "ภาษาไทย", code: "th-TH" },
  { name: "Tiếng Việt", code: "vi-VN" },
  { name: "Bahasa Indonesia", code: "id-ID" },
  { name: "Bahasa Melayu", code: "ms-MY" },
  { name: "Wikang Filipino", code: "fil-PH" },
  { name: "हिन्दी", code: "hi-IN" },
  { name: "தமிழ்", code: "ta-IN" },
  { name: "తెలుగు", code: "te-IN" },
  
  // 欧洲语言
  { name: "English", code: "en-US" },
  { name: "Español", code: "es-ES" },
  { name: "Español Latinoamérica", code: "es-419" },
  { name: "Français", code: "fr-FR" },
  { name: "Deutsch", code: "de-DE" },
  { name: "Italiano", code: "it-IT" },
  { name: "Português (Brasil)", code: "pt-BR" },
  { name: "Português (Portugal)", code: "pt-PT" },
  { name: "Nederlands", code: "nl-NL" },
  { name: "Polski", code: "pl-PL" },
  { name: "Dansk", code: "da-DK" },
  { name: "Svenska", code: "sv-SE" },
  { name: "Norsk", code: "no-NO" },
  { name: "Suomi", code: "fi-FI" },
  { name: "Magyar", code: "hu-HU" },
  { name: "Čeština", code: "cs-CZ" },
  { name: "Română", code: "ro-RO" },
  { name: "Türkçe", code: "tr-TR" },
  { name: "Ελληνικά", code: "el-GR" },
  
  // 其他语言
  { name: "Русский", code: "ru-RU" },
  { name: "العربية", code: "ar-SA" },
  { name: "עברית", code: "he-IL" },
]

const STORAGE_KEY = "tmdb_language"

interface LanguageSelectorProps {
  value: string
  onChange: (languageCode: string) => void
  size?: "default" | "sm" | "lg"
}

export function LanguageSelector({
  value,
  onChange,
  size = "sm"
}: LanguageSelectorProps) {
  const currentLanguage = LANGUAGES.find(lang => lang.code === value) || LANGUAGES[0]

  // 从 localStorage 读取保存的语言
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        onChange(saved)
      }
    } catch (e) {
      // localStorage 访问失败时忽略
    }
  }, [onChange])

  const handleLanguageChange = (languageCode: string) => {
    onChange(languageCode)
    // 保存到 localStorage
    try {
      localStorage.setItem(STORAGE_KEY, languageCode)
    } catch (e) {
      // localStorage 访问失败时忽略
    }
  }

  return (
    <Select value={value} onValueChange={handleLanguageChange}>
      <SelectTrigger className="justify-between min-w-[120px] h-8 px-3 py-1 rounded-md border border-input bg-background/40 backdrop-blur-sm text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <div className="flex items-center gap-2">
          <Globe className="h-3 w-3" />
          <span className="text-xs">{currentLanguage.name}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[280px] z-[9999]">
        {LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">{language.name}</span>
              <span className="text-xs text-muted-foreground">{language.code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
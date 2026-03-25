"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { DEFAULT_LANGUAGE } from "./config"

import zhCN_common from "./locales/zh-CN/common.json"
import zhCN_nav_maintenance from "./locales/zh-CN/nav/maintenance.json"
import zhCN_nav_news from "./locales/zh-CN/nav/news.json"
import zhCN_nav_content from "./locales/zh-CN/nav/content.json"
import zhCN_nav_image from "./locales/zh-CN/nav/image.json"
import zhCN_nav_tools from "./locales/zh-CN/nav/tools.json"
import zhCN_nav_platforms from "./locales/zh-CN/nav/platforms.json"
import zhCN_media from "./locales/zh-CN/media.json"
import zhCN_schedule from "./locales/zh-CN/schedule.json"
import zhCN_settings from "./locales/zh-CN/settings.json"
import zhCN_user from "./locales/zh-CN/user.json"
import zhCN_dialogs from "./locales/zh-CN/dialogs.json"
import zhCN_messages from "./locales/zh-CN/messages.json"
import zhCN_errors from "./locales/zh-CN/errors.json"
import zhCN_weekdays from "./locales/zh-CN/weekdays.json"
import zhCN_categories from "./locales/zh-CN/categories.json"
import zhCN_aiChat from "./locales/zh-CN/ai-chat.json"
import zhCN_imageProcessing from "./locales/zh-CN/image-processing.json"
import zhCN_episodeGeneration from "./locales/zh-CN/episode-generation.json"
import zhCN_dataManagement from "./locales/zh-CN/data-management.json"
import zhCN_ui from "./locales/zh-CN/ui.json"

import enUS_common from "./locales/en-US/common.json"
import enUS_nav_maintenance from "./locales/en-US/nav/maintenance.json"
import enUS_nav_news from "./locales/en-US/nav/news.json"
import enUS_nav_content from "./locales/en-US/nav/content.json"
import enUS_nav_image from "./locales/en-US/nav/image.json"
import enUS_nav_tools from "./locales/en-US/nav/tools.json"
import enUS_nav_platforms from "./locales/en-US/nav/platforms.json"
import enUS_media from "./locales/en-US/media.json"
import enUS_schedule from "./locales/en-US/schedule.json"
import enUS_settings from "./locales/en-US/settings.json"
import enUS_user from "./locales/en-US/user.json"
import enUS_dialogs from "./locales/en-US/dialogs.json"
import enUS_messages from "./locales/en-US/messages.json"
import enUS_errors from "./locales/en-US/errors.json"
import enUS_weekdays from "./locales/en-US/weekdays.json"
import enUS_categories from "./locales/en-US/categories.json"
import enUS_aiChat from "./locales/en-US/ai-chat.json"
import enUS_imageProcessing from "./locales/en-US/image-processing.json"
import enUS_episodeGeneration from "./locales/en-US/episode-generation.json"
import enUS_dataManagement from "./locales/en-US/data-management.json"
import enUS_ui from "./locales/en-US/ui.json"

import zhTW_common from "./locales/zh-TW/common.json"
import zhTW_nav_maintenance from "./locales/zh-TW/nav/maintenance.json"
import zhTW_nav_news from "./locales/zh-TW/nav/news.json"
import zhTW_nav_content from "./locales/zh-TW/nav/content.json"
import zhTW_nav_image from "./locales/zh-TW/nav/image.json"
import zhTW_nav_tools from "./locales/zh-TW/nav/tools.json"
import zhTW_nav_platforms from "./locales/zh-TW/nav/platforms.json"
import zhTW_media from "./locales/zh-TW/media.json"
import zhTW_schedule from "./locales/zh-TW/schedule.json"
import zhTW_settings from "./locales/zh-TW/settings.json"
import zhTW_user from "./locales/zh-TW/user.json"
import zhTW_dialogs from "./locales/zh-TW/dialogs.json"
import zhTW_messages from "./locales/zh-TW/messages.json"
import zhTW_errors from "./locales/zh-TW/errors.json"
import zhTW_weekdays from "./locales/zh-TW/weekdays.json"
import zhTW_categories from "./locales/zh-TW/categories.json"
import zhTW_aiChat from "./locales/zh-TW/ai-chat.json"
import zhTW_imageProcessing from "./locales/zh-TW/image-processing.json"
import zhTW_episodeGeneration from "./locales/zh-TW/episode-generation.json"
import zhTW_dataManagement from "./locales/zh-TW/data-management.json"
import zhTW_ui from "./locales/zh-TW/ui.json"

import zhHK_common from "./locales/zh-HK/common.json"
import zhHK_nav_maintenance from "./locales/zh-HK/nav/maintenance.json"
import zhHK_nav_news from "./locales/zh-HK/nav/news.json"
import zhHK_nav_content from "./locales/zh-HK/nav/content.json"
import zhHK_nav_image from "./locales/zh-HK/nav/image.json"
import zhHK_nav_tools from "./locales/zh-HK/nav/tools.json"
import zhHK_nav_platforms from "./locales/zh-HK/nav/platforms.json"
import zhHK_media from "./locales/zh-HK/media.json"
import zhHK_schedule from "./locales/zh-HK/schedule.json"
import zhHK_settings from "./locales/zh-HK/settings.json"
import zhHK_user from "./locales/zh-HK/user.json"
import zhHK_dialogs from "./locales/zh-HK/dialogs.json"
import zhHK_messages from "./locales/zh-HK/messages.json"
import zhHK_errors from "./locales/zh-HK/errors.json"
import zhHK_weekdays from "./locales/zh-HK/weekdays.json"
import zhHK_categories from "./locales/zh-HK/categories.json"
import zhHK_aiChat from "./locales/zh-HK/ai-chat.json"
import zhHK_imageProcessing from "./locales/zh-HK/image-processing.json"
import zhHK_episodeGeneration from "./locales/zh-HK/episode-generation.json"
import zhHK_dataManagement from "./locales/zh-HK/data-management.json"
import zhHK_ui from "./locales/zh-HK/ui.json"

const resources = {
  "zh-CN": {
    common: zhCN_common,
    "nav.maintenance": zhCN_nav_maintenance,
    "nav.news": zhCN_nav_news,
    "nav.content": zhCN_nav_content,
    "nav.image": zhCN_nav_image,
    "nav.tools": zhCN_nav_tools,
    "nav.platforms": zhCN_nav_platforms,
    media: zhCN_media,
    schedule: zhCN_schedule,
    settings: zhCN_settings,
    user: zhCN_user,
    dialogs: zhCN_dialogs,
    messages: zhCN_messages,
    errors: zhCN_errors,
    weekdays: zhCN_weekdays,
    categories: zhCN_categories,
    "ai-chat": zhCN_aiChat,
    "image-processing": zhCN_imageProcessing,
    "episode-generation": zhCN_episodeGeneration,
    "data-management": zhCN_dataManagement,
    ui: zhCN_ui,
  },
  "en-US": {
    common: enUS_common,
    "nav.maintenance": enUS_nav_maintenance,
    "nav.news": enUS_nav_news,
    "nav.content": enUS_nav_content,
    "nav.image": enUS_nav_image,
    "nav.tools": enUS_nav_tools,
    "nav.platforms": enUS_nav_platforms,
    media: enUS_media,
    schedule: enUS_schedule,
    settings: enUS_settings,
    user: enUS_user,
    dialogs: enUS_dialogs,
    messages: enUS_messages,
    errors: enUS_errors,
    weekdays: enUS_weekdays,
    categories: enUS_categories,
    "ai-chat": enUS_aiChat,
    "image-processing": enUS_imageProcessing,
    "episode-generation": enUS_episodeGeneration,
    "data-management": enUS_dataManagement,
    ui: enUS_ui,
  },
  "zh-TW": {
    common: zhTW_common,
    "nav.maintenance": zhTW_nav_maintenance,
    "nav.news": zhTW_nav_news,
    "nav.content": zhTW_nav_content,
    "nav.image": zhTW_nav_image,
    "nav.tools": zhTW_nav_tools,
    "nav.platforms": zhTW_nav_platforms,
    media: zhTW_media,
    schedule: zhTW_schedule,
    settings: zhTW_settings,
    user: zhTW_user,
    dialogs: zhTW_dialogs,
    messages: zhTW_messages,
    errors: zhTW_errors,
    weekdays: zhTW_weekdays,
    categories: zhTW_categories,
    "ai-chat": zhTW_aiChat,
    "image-processing": zhTW_imageProcessing,
    "episode-generation": zhTW_episodeGeneration,
    "data-management": zhTW_dataManagement,
    ui: zhTW_ui,
  },
  "zh-HK": {
    common: zhHK_common,
    "nav.maintenance": zhHK_nav_maintenance,
    "nav.news": zhHK_nav_news,
    "nav.content": zhHK_nav_content,
    "nav.image": zhHK_nav_image,
    "nav.tools": zhHK_nav_tools,
    "nav.platforms": zhHK_nav_platforms,
    media: zhHK_media,
    schedule: zhHK_schedule,
    settings: zhHK_settings,
    user: zhHK_user,
    dialogs: zhHK_dialogs,
    messages: zhHK_messages,
    errors: zhHK_errors,
    weekdays: zhHK_weekdays,
    categories: zhHK_categories,
    "ai-chat": zhHK_aiChat,
    "image-processing": zhHK_imageProcessing,
    "episode-generation": zhHK_episodeGeneration,
    "data-management": zhHK_dataManagement,
    ui: zhHK_ui,
  },
}

function getInitialLanguage(): string {
  if (typeof window === "undefined") {
    return "zh-CN"
  }

  const stored = localStorage.getItem("tmdb_language")
  if (stored && stored !== "auto" && isValidLanguage(stored)) {
    return stored
  }

  return "zh-CN"
}

function isValidLanguage(code: string): boolean {
  return ["zh-CN", "en-US", "zh-TW", "zh-HK"].includes(code)
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: "zh-CN",
    defaultNS: "common",
    ns: [
      "common",
      "nav.maintenance",
      "nav.news",
      "nav.content",
      "nav.image",
      "nav.tools",
      "nav.platforms",
      "media",
      "schedule",
      "settings",
      "user",
      "dialogs",
      "messages",
      "errors",
      "weekdays",
      "categories",
      "ai-chat",
      "image-processing",
      "episode-generation",
      "data-management",
      "ui",
    ],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n

export function changeLanguage(language: string) {
  if (language === "auto") {
    const systemLang = navigator.language || (navigator as any).userLanguage || "zh-CN"
    const mappedLang = mapSystemLanguageToAppLanguage(systemLang)
    return i18n.changeLanguage(mappedLang)
  }
  return i18n.changeLanguage(language)
}

export function mapSystemLanguageToAppLanguage(systemLang: string): string {
  const lang = systemLang.toLowerCase()

  if (lang.startsWith("zh")) {
    if (lang.includes("tw") || lang.includes("hk") || lang.includes("mo")) {
      return "zh-TW"
    }
    return "zh-CN"
  }

  if (lang.startsWith("en")) {
    return "en-US"
  }

  return DEFAULT_LANGUAGE
}

export function getCurrentLanguage(): string {
  return i18n.language || DEFAULT_LANGUAGE
}

export { i18n }

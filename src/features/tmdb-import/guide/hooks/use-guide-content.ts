import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

import type { GuideCategory, GuideVersion, SupportedGuideLanguage } from "../types"

import { content as enUSOriginalGeneral } from "../content/en-US/original/general"
import { content as enUSOriginalNewContent } from "../content/en-US/original/new-content"
import { content as enUSOriginalMovie } from "../content/en-US/original/movie"
import { content as enUSOriginalTv } from "../content/en-US/original/tv"
import { content as enUSOriginalPeople } from "../content/en-US/original/people"
import { content as enUSOriginalCollection } from "../content/en-US/original/collection"
import { content as enUSOriginalImage } from "../content/en-US/original/image"

import { content as zhCNOriginalGeneral } from "../content/zh-CN/original/general"
import { content as zhCNOriginalNewContent } from "../content/zh-CN/original/new-content"
import { content as zhCNSummaryGeneral } from "../content/zh-CN/summary/general"
import { content as zhCNSummaryNewContent } from "../content/zh-CN/summary/new-content"
import { content as zhCNSummaryMovie } from "../content/zh-CN/summary/movie"
import { content as zhCNSummaryTv } from "../content/zh-CN/summary/tv"
import { content as zhCNSummaryPeople } from "../content/zh-CN/summary/people"
import { content as zhCNSummaryCollection } from "../content/zh-CN/summary/collection"
import { content as zhCNSummaryImage } from "../content/zh-CN/summary/image"

import { content as zhTWSummaryGeneral } from "../content/zh-TW/summary/general"
import { content as zhTWSummaryNewContent } from "../content/zh-TW/summary/new-content"
import { content as zhTWSummaryMovie } from "../content/zh-TW/summary/movie"
import { content as zhTWSummaryTv } from "../content/zh-TW/summary/tv"
import { content as zhTWSummaryPeople } from "../content/zh-TW/summary/people"
import { content as zhTWSummaryCollection } from "../content/zh-TW/summary/collection"
import { content as zhTWSummaryImage } from "../content/zh-TW/summary/image"

import { content as zhHKSummaryGeneral } from "../content/zh-HK/summary/general"
import { content as zhHKSummaryNewContent } from "../content/zh-HK/summary/new-content"
import { content as zhHKSummaryMovie } from "../content/zh-HK/summary/movie"
import { content as zhHKSummaryTv } from "../content/zh-HK/summary/tv"
import { content as zhHKSummaryPeople } from "../content/zh-HK/summary/people"
import { content as zhHKSummaryCollection } from "../content/zh-HK/summary/collection"
import { content as zhHKSummaryImage } from "../content/zh-HK/summary/image"

import { content as jaJPSummaryGeneral } from "../content/ja-JP/summary/general"
import { content as jaJPSummaryNewContent } from "../content/ja-JP/summary/new-content"
import { content as jaJPSummaryMovie } from "../content/ja-JP/summary/movie"
import { content as jaJPSummaryTv } from "../content/ja-JP/summary/tv"
import { content as jaJPSummaryPeople } from "../content/ja-JP/summary/people"
import { content as jaJPSummaryCollection } from "../content/ja-JP/summary/collection"
import { content as jaJPSummaryImage } from "../content/ja-JP/summary/image"

import { content as koKRSummaryGeneral } from "../content/ko-KR/summary/general"
import { content as koKRSummaryNewContent } from "../content/ko-KR/summary/new-content"
import { content as koKRSummaryMovie } from "../content/ko-KR/summary/movie"
import { content as koKRSummaryTv } from "../content/ko-KR/summary/tv"
import { content as koKRSummaryPeople } from "../content/ko-KR/summary/people"
import { content as koKRSummaryCollection } from "../content/ko-KR/summary/collection"
import { content as koKRSummaryImage } from "../content/ko-KR/summary/image"

type ContentMap = Record<string, string>

const GUIDE_CONTENT: ContentMap = {
  "en-US/original/general": enUSOriginalGeneral,
  "en-US/original/new-content": enUSOriginalNewContent,
  "en-US/original/movie": enUSOriginalMovie,
  "en-US/original/tv": enUSOriginalTv,
  "en-US/original/people": enUSOriginalPeople,
  "en-US/original/collection": enUSOriginalCollection,
  "en-US/original/image": enUSOriginalImage,

  "zh-CN/original/general": zhCNOriginalGeneral,
  "zh-CN/original/new-content": zhCNOriginalNewContent,
  "zh-CN/summary/general": zhCNSummaryGeneral,
  "zh-CN/summary/new-content": zhCNSummaryNewContent,
  "zh-CN/summary/movie": zhCNSummaryMovie,
  "zh-CN/summary/tv": zhCNSummaryTv,
  "zh-CN/summary/people": zhCNSummaryPeople,
  "zh-CN/summary/collection": zhCNSummaryCollection,
  "zh-CN/summary/image": zhCNSummaryImage,

  "zh-TW/summary/general": zhTWSummaryGeneral,
  "zh-TW/summary/new-content": zhTWSummaryNewContent,
  "zh-TW/summary/movie": zhTWSummaryMovie,
  "zh-TW/summary/tv": zhTWSummaryTv,
  "zh-TW/summary/people": zhTWSummaryPeople,
  "zh-TW/summary/collection": zhTWSummaryCollection,
  "zh-TW/summary/image": zhTWSummaryImage,

  "zh-HK/summary/general": zhHKSummaryGeneral,
  "zh-HK/summary/new-content": zhHKSummaryNewContent,
  "zh-HK/summary/movie": zhHKSummaryMovie,
  "zh-HK/summary/tv": zhHKSummaryTv,
  "zh-HK/summary/people": zhHKSummaryPeople,
  "zh-HK/summary/collection": zhHKSummaryCollection,
  "zh-HK/summary/image": zhHKSummaryImage,

  "ja-JP/summary/general": jaJPSummaryGeneral,
  "ja-JP/summary/new-content": jaJPSummaryNewContent,
  "ja-JP/summary/movie": jaJPSummaryMovie,
  "ja-JP/summary/tv": jaJPSummaryTv,
  "ja-JP/summary/people": jaJPSummaryPeople,
  "ja-JP/summary/collection": jaJPSummaryCollection,
  "ja-JP/summary/image": jaJPSummaryImage,

  "ko-KR/summary/general": koKRSummaryGeneral,
  "ko-KR/summary/new-content": koKRSummaryNewContent,
  "ko-KR/summary/movie": koKRSummaryMovie,
  "ko-KR/summary/tv": koKRSummaryTv,
  "ko-KR/summary/people": koKRSummaryPeople,
  "ko-KR/summary/collection": koKRSummaryCollection,
  "ko-KR/summary/image": koKRSummaryImage,
}

const SUPPORTED_LANGS: readonly SupportedGuideLanguage[] = ["en-US", "zh-CN", "zh-TW", "zh-HK", "ja-JP", "ko-KR"]

const LANG_FALLBACK: Record<string, string> = {
  "zh-TW": "zh-CN",
  "zh-HK": "zh-CN",
  "ja-JP": "en-US",
  "ko-KR": "en-US",
}

function resolveContent(category: GuideCategory, version: GuideVersion, language: string): string {
  const lang = SUPPORTED_LANGS.includes(language as SupportedGuideLanguage)
    ? (language as SupportedGuideLanguage)
    : "en-US"

  const tryKey = (l: string, v: GuideVersion) => GUIDE_CONTENT[`${l}/${v}/${category}`] || ""

  let result = tryKey(lang, version)
  if (result) return result

  if (version === "summary") {
    result = tryKey(lang, "original")
    if (result) return result
  }

  const fallback = LANG_FALLBACK[lang]
  if (fallback) {
    result = tryKey(fallback, version)
    if (result) return result
    if (version === "summary") {
      result = tryKey(fallback, "original")
      if (result) return result
    }
  }

  if (lang !== "en-US") {
    result = tryKey("en-US", version)
    if (result) return result
    if (version === "summary") result = tryKey("en-US", "original")
  }

  return result
}

export function useGuideContent(category: GuideCategory, version: GuideVersion, language: string) {
  const content = useMemo(() => resolveContent(category, version, language), [category, version, language])
  return { content, loading: false, error: null }
}

export function useGuideSections(content: string) {
  return useMemo(() => {
    if (!content) return []
    const sections: { id: string; title: string; level: number }[] = []
    content.split("\n").forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)/)
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        const id = title.toLowerCase().replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af-]/g, "").replace(/\s+/g, "-")
        sections.push({ id, title, level })
      }
    })
    return sections
  }, [content])
}

export { ReactMarkdown, remarkGfm, remarkBreaks }

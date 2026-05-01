"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  BookOpen,
  Film,
  Tv,
  Users,
  LayoutGrid,
  Image,
  Search,
  Star,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  FileText,
  Sparkles,
  Languages,
} from "lucide-react"

import { useGuideContent, useGuideSections, ReactMarkdown, remarkGfm, remarkBreaks } from "../hooks/use-guide-content"
import { GUIDE_CATEGORIES, type GuideCategory, type GuideVersion } from "../types"

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af-]/g, "").replace(/\s+/g, "-")
}

const markdownComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children)
    return <h1 id={slugify(text)} {...props}>{children}</h1>
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children)
    return <h2 id={slugify(text)} {...props}>{children}</h2>
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(children)
    return <h3 id={slugify(text)} {...props}>{children}</h3>
  },
}

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Film: <Film className="h-5 w-5" />,
  Tv: <Tv className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  LayoutGrid: <LayoutGrid className="h-5 w-5" />,
  Image: <Image className="h-5 w-5" />,
}

const CATEGORY_LABELS: Record<GuideCategory, Record<string, string>> = {
  general: { "zh-CN": "通用", "en-US": "General", "ja-JP": "一般", "ko-KR": "일반", "zh-TW": "通用", "zh-HK": "通用" },
  "new-content": { "zh-CN": "新内容", "en-US": "New Content", "ja-JP": "新規コンテンツ", "ko-KR": "새 콘텐츠", "zh-TW": "新內容", "zh-HK": "新內容" },
  movie: { "zh-CN": "电影", "en-US": "Movie", "ja-JP": "映画", "ko-KR": "영화", "zh-TW": "電影", "zh-HK": "電影" },
  tv: { "zh-CN": "节目", "en-US": "TV", "ja-JP": "番組", "ko-KR": "TV", "zh-TW": "節目", "zh-HK": "節目" },
  people: { "zh-CN": "人员", "en-US": "People", "ja-JP": "人物", "ko-KR": "인물", "zh-TW": "人員", "zh-HK": "人員" },
  collection: { "zh-CN": "合集", "en-US": "Collection", "ja-JP": "コレクション", "ko-KR": "컬렉션", "zh-TW": "合集", "zh-HK": "合集" },
  image: { "zh-CN": "图片", "en-US": "Image", "ja-JP": "画像", "ko-KR": "이미지", "zh-TW": "圖片", "zh-HK": "圖片" },
}

const VERSION_LABELS: Record<GuideVersion, Record<string, string>> = {
  original: { "zh-CN": "原文", "en-US": "Original", "ja-JP": "原文", "ko-KR": "원문", "zh-TW": "原文", "zh-HK": "原文" },
  summary: { "zh-CN": "提炼", "en-US": "Summary", "ja-JP": "要約", "ko-KR": "요약", "zh-TW": "提煉", "zh-HK": "提煉" },
}

const UI_LABELS: Record<string, Record<string, string>> = {
  back: { "zh-CN": "返回", "en-US": "Back", "ja-JP": "戻る", "ko-KR": "뒤로", "zh-TW": "返回", "zh-HK": "返回" },
  guide: { "zh-CN": "指南", "en-US": "Guide", "ja-JP": "ガイド", "ko-KR": "가이드", "zh-TW": "指南", "zh-HK": "指南" },
  editBible: { "zh-CN": "编辑指南", "en-US": "Edit Bible", "ja-JP": "編集ガイド", "ko-KR": "편집 가이드", "zh-TW": "編輯指南", "zh-HK": "編輯指南" },
  welcomeTo: { "zh-CN": "欢迎来到", "en-US": "Welcome to", "ja-JP": "ようこそ", "ko-KR": "환영합니다", "zh-TW": "歡迎來到", "zh-HK": "歡迎來到" },
  howCanWeHelp: { "zh-CN": "您需要哪方面的协助？", "en-US": "How can we help?", "ja-JP": "何をお手伝いしましょうか？", "ko-KR": "어떤 도움이 필요하신가요?", "zh-TW": "您需要哪方面的協助？", "zh-HK": "您需要哪方面的協助？" },
  generalDesc: { "zh-CN": "基本编辑原则和通用规则", "en-US": "Basic editing principles and general rules", "ja-JP": "基本的な編集原則と一般ルール", "ko-KR": "기본 편집 원칙과 일반 규칙", "zh-TW": "基本編輯原則和通用規則", "zh-HK": "基本編輯原則和通用規則" },
  newContentDesc: { "zh-CN": "添加新电影和电视节目", "en-US": "Adding new movies and TV shows", "ja-JP": "新しい映画とテレビ番組の追加", "ko-KR": "새 영화 및 TV 프로그램 추가", "zh-TW": "添加新電影和電視節目", "zh-HK": "添加新電影和電視節目" },
  imageDesc: { "zh-CN": "图片上传和质量标准", "en-US": "Image upload and quality standards", "ja-JP": "画像アップロードと品質基準", "ko-KR": "이미지 업로드 및 품질 기준", "zh-TW": "圖片上傳和品質標準", "zh-HK": "圖片上傳和品質標準" },
  versionInfo: { "zh-CN": "版本说明", "en-US": "Version Info", "ja-JP": "バージョン情報", "ko-KR": "버전 정보", "zh-TW": "版本說明", "zh-HK": "版本說明" },
  summaryVersion: { "zh-CN": "提炼版", "en-US": "Summary Version", "ja-JP": "要約版", "ko-KR": "요약 버전", "zh-TW": "提煉版", "zh-HK": "提煉版" },
  summaryDesc: { "zh-CN": "精简核心要点，快速掌握编辑规则", "en-US": "Condensed key points for quick reference", "ja-JP": "要点を絞った要約で素早く理解", "ko-KR": "핵심 요점으로 빠르게 편집 규칙 파악", "zh-TW": "精簡核心要點，快速掌握編輯規則", "zh-HK": "精簡核心要點，快速掌握編輯規則" },
  originalVersion: { "zh-CN": "原文版", "en-US": "Original Version", "ja-JP": "原文版", "ko-KR": "원문 버전", "zh-TW": "原文版", "zh-HK": "原文版" },
  originalDesc: { "zh-CN": "完整原文，包含所有详细说明和示例", "en-US": "Full original text with all details and examples", "ja-JP": "完全な原文、すべての詳細説明と例を含む", "ko-KR": "전체 원문, 모든 상세 설명과 예시 포함", "zh-TW": "完整原文，包含所有詳細說明和示例", "zh-HK": "完整原文，包含所有詳細說明和示例" },
  needMoreHelp: { "zh-CN": "需要更多帮助？", "en-US": "Need more help?", "ja-JP": "もっとヘルプが必要？", "ko-KR": "더 많은 도움이 필요하신가요?", "zh-TW": "需要更多幫助？", "zh-HK": "需要更多幫助？" },
  visitTmdbDesc: { "zh-CN": "访问TMDB官方网站获取最新的编辑指南和社区支持", "en-US": "Visit TMDB official site for the latest guidelines and community support", "ja-JP": "TMDB公式サイトで最新のガイドラインとコミュニティサポートを入手", "ko-KR": "TMDB 공식 사이트에서 최신 가이드라인과 커뮤니티 지원 확인", "zh-TW": "訪問TMDB官方網站獲取最新的編輯指南和社群支持", "zh-HK": "訪問TMDB官方網站獲取最新的編輯指南和社群支持" },
}

function t(key: string, language: string): string {
  return UI_LABELS[key]?.[language] || UI_LABELS[key]?.["en-US"] || key
}

function getCategoryLabel(category: GuideCategory, language: string): string {
  const labels = CATEGORY_LABELS[category]
  return labels[language] || labels["en-US"] || category
}

function getVersionLabel(version: GuideVersion, language: string): string {
  const labels = VERSION_LABELS[version]
  return labels[language] || labels["en-US"] || version
}

export function TMDBGuide() {
  const { i18n } = useTranslation("common")
  const language = i18n.language || "en-US"

  const [selectedSection, setSelectedSection] = useState<GuideCategory>("general")
  const [showDetailedGuide, setShowDetailedGuide] = useState(false)
  const [version, setVersion] = useState<GuideVersion>("summary")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSectionId, setActiveSectionId] = useState<string>("")

  const { content } = useGuideContent(selectedSection, version, language)
  const sections = useGuideSections(content)

  const topSections = sections.filter((s) => s.level <= 2)

  useEffect(() => {
    if (topSections.length > 0 && !activeSectionId) {
      setActiveSectionId(topSections[0].id)
    }
  }, [topSections, activeSectionId])

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    const element = document.getElementById(sectionId)
    const container = document.querySelector("[data-guide-content]")
    if (element && container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const offset = elementRect.top - containerRect.top + container.scrollTop - 24
      container.scrollTo({ top: offset, behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    if (!showDetailedGuide) return

    const container = document.querySelector("[data-guide-content]")
    if (!container) return

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 100
      for (let i = topSections.length - 1; i >= 0; i--) {
        const element = document.getElementById(topSections[i].id)
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSectionId(topSections[i].id)
          break
        }
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [showDetailedGuide, topSections])

  useEffect(() => {
    setActiveSectionId("")
  }, [selectedSection])

  if (showDetailedGuide) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-gradient-to-r from-[#032541] to-[#01b4e4] text-white py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => setShowDetailedGuide(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("back", language)}
              </Button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                {ICON_MAP[GUIDE_CATEGORIES[selectedSection].icon]}
              </div>
              <h1 className="text-3xl font-bold">
                {getCategoryLabel(selectedSection, language)}
                {" "}{t("guide", language)}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex bg-white/10 rounded-lg p-1">
                {(["summary", "original"] as GuideVersion[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      version === v
                        ? "bg-white text-[#032541] shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      {v === "summary" ? (
                        <Sparkles className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      <span>{getVersionLabel(v, language)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg shadow-sm border lg:sticky lg:top-6 lg:h-fit">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#01b4e4] text-white">
                      {getCategoryLabel(selectedSection, language).toUpperCase()}
                    </Badge>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Languages className="h-3 w-3" />
                      <span>{version === "summary" ? getVersionLabel(version, language) : getVersionLabel(version, language)}</span>
                    </div>
                  </div>
                </div>
                <nav className="p-2 max-h-[60vh] overflow-y-auto">
                  {topSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                        section.level === 2 ? "pl-6" : ""
                      } ${
                        activeSectionId === section.id
                          ? "bg-[#01b4e4]/10 text-[#01b4e4] font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="lg:w-3/4">
              <div
                className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-4"
                data-guide-content
              >
                <div className="prose prose-slate prose-headings:text-[#032541] prose-headings:font-bold prose-h1:text-2xl prose-h1:border-b prose-h1:pb-3 prose-h1:mb-6 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-a:text-[#01b4e4] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#032541] prose-li:marker:text-[#01b4e4] prose-blockquote:border-l-[#01b4e4] prose-blockquote:bg-[#01b4e4]/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none max-w-none bg-white rounded-lg shadow-sm border p-6 md:p-8">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#032541] text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#01b4e4] rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg">
              {t("editBible", language)}
            </span>
          </div>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => window.open("https://www.themoviedb.org/bible", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            TMDB
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#032541] via-[#01b4e4] to-[#90cea1] text-white py-16 relative">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {t("welcomeTo", language)}
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-8">
            {t("editBible", language)}
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <Input
                type="text"
                placeholder={t("howCanWeHelp", language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-lg bg-white text-black border-0 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(["general", "new-content", "image"] as GuideCategory[]).map((cat) => (
            <Card
              key={cat}
              className="bg-[#032541] text-white hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedSection(cat)
                setShowDetailedGuide(true)
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  {ICON_MAP[GUIDE_CATEGORIES[cat].icon]}
                  <h3 className="text-xl font-semibold">
                    {getCategoryLabel(cat, language)}
                  </h3>
                </div>
                <div className="h-1 w-12 bg-[#01b4e4] rounded mb-4"></div>
                <p className="text-gray-300 text-sm">
                  {cat === "general" && t("generalDesc", language)}
                  {cat === "new-content" && t("newContentDesc", language)}
                  {cat === "image" && t("imageDesc", language)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {(["movie", "tv", "people", "collection"] as GuideCategory[]).map((cat) => {
            const colorMap: Record<string, string> = {
              movie: "from-red-600 to-red-800",
              tv: "from-purple-600 to-purple-800",
              people: "from-blue-600 to-blue-800",
              collection: "from-yellow-600 to-yellow-800",
            }
            return (
              <Card
                key={cat}
                className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedSection(cat)
                  setShowDetailedGuide(true)
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[cat]}`}></div>
                <div className="absolute inset-0 bg-black/40"></div>
                <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
                  <div className="mb-4 opacity-80">
                    {ICON_MAP[GUIDE_CATEGORIES[cat].icon]}
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {getCategoryLabel(cat, language)}
                  </h3>
                  <h4 className="text-lg">
                    {t("guide", language)}
                  </h4>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            {t("versionInfo", language)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#01b4e4]/20 bg-[#01b4e4]/5">
              <CardContent className="p-4 flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-[#01b4e4]" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {t("summaryVersion", language)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("summaryDesc", language)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#032541]/20 bg-[#032541]/5">
              <CardContent className="p-4 flex items-center space-x-3">
                <FileText className="h-8 w-8 text-[#032541]" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {t("originalVersion", language)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("originalDesc", language)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-[#032541] text-white">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2 text-white">
              {t("needMoreHelp", language)}
            </h3>
            <p className="text-gray-300 mb-4">
              {t("visitTmdbDesc", language)}
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#032541] bg-transparent"
                onClick={() => window.open("https://www.themoviedb.org/bible", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                TMDB Bible
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export type GuideVersion = "original" | "summary"

export type GuideCategory =
  | "general"
  | "new-content"
  | "movie"
  | "tv"
  | "people"
  | "collection"
  | "image"

export interface GuideCategoryMeta {
  id: GuideCategory
  icon: string
  color: string
  subSections: string[]
}

export const GUIDE_CATEGORIES: Record<GuideCategory, GuideCategoryMeta> = {
  general: {
    id: "general",
    icon: "BookOpen",
    color: "from-[#032541] to-[#01b4e4]",
    subSections: [
      "contribution-guidelines",
      "incorrect-entries",
      "general-tips",
      "image-reports",
      "incorrect-episodes",
      "keywords",
      "locked-fields",
      "website-translation",
      "faq",
      "search-tips",
      "source-reliability",
      "moderation",
      "international-editing",
      "vibes",
    ],
  },
  "new-content": {
    id: "new-content",
    icon: "Star",
    color: "from-[#032541] to-[#01b4e4]",
    subSections: [
      "general",
      "not-supported",
      "how-should-i-add",
      "movies",
      "tv",
      "people",
      "collections",
      "awards",
      "content-allowed-in-tv-and-movie-section",
      "amateur-content",
      "adult-content",
    ],
  },
  movie: {
    id: "movie",
    icon: "Film",
    color: "from-red-600 to-red-800",
    subSections: [
      "original-movie-language",
      "original-title",
      "translated-title",
      "taglines",
      "overviews",
      "movie-status",
      "adult-movie",
      "softcore-movie",
      "convert-to-collection",
      "video",
      "runtime",
      "budget-revenue",
      "homepage",
      "spoken-languages",
      "alternative-titles",
      "cast",
      "crew",
      "external-ids",
      "genres",
      "keywords",
      "production-info",
      "release-dates",
      "videos",
    ],
  },
  tv: {
    id: "tv",
    icon: "Tv",
    color: "from-purple-600 to-purple-800",
    subSections: [
      "original-name",
      "overview",
      "tv-show-type",
      "tv-show-status",
      "created-by",
      "homepage",
      "runtime",
      "spoken-languages",
      "alternative-titles",
      "content-ratings",
      "regular-cast",
      "crew",
      "genre-keywords",
      "production-info",
      "seasons",
      "episodes",
      "videos",
    ],
  },
  people: {
    id: "people",
    icon: "Users",
    color: "from-blue-600 to-blue-800",
    subSections: [
      "name",
      "biography",
      "known-for",
      "translated-name",
      "birthday",
      "place-of-birth",
      "gender",
      "homepage",
      "alternative-names",
      "social-links",
      "adult-actors",
      "credit-issues",
    ],
  },
  collection: {
    id: "collection",
    icon: "LayoutGrid",
    color: "from-yellow-600 to-yellow-800",
    subSections: [
      "general",
      "exclusivity",
      "type-of-content",
      "parts",
    ],
  },
  image: {
    id: "image",
    icon: "Image",
    color: "from-[#032541] to-[#01b4e4]",
    subSections: [
      "image-quality",
      "posters",
      "backdrops",
      "profiles",
      "logos",
    ],
  },
}

export const SUPPORTED_GUIDE_LANGUAGES = [
  "en-US",
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "ja-JP",
  "ko-KR",
] as const

export type SupportedGuideLanguage = (typeof SUPPORTED_GUIDE_LANGUAGES)[number]

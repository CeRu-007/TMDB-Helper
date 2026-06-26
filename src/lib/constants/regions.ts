export interface Region {
  id: string
  name: string
  icon: string
}

export interface RegionGroup {
  name: string
  regions: string[]
}

// 定义国家/区域常量
export const REGIONS: Region[] = [
  { id: "CN", name: "中国大陆", icon: "🇨🇳" },
  { id: "HK", name: "香港", icon: "🇭🇰" },
  { id: "TW", name: "台湾", icon: "🇹🇼" },
  { id: "JP", name: "日本", icon: "🇯🇵" },
  { id: "KR", name: "韩国", icon: "🇰🇷" },
  { id: "US", name: "美国", icon: "🇺🇸" },
  { id: "GB", name: "英国", icon: "🇬🇧" },
]

// 区域分组
export const REGION_GROUPS: RegionGroup[] = [
  {
    name: "亚洲",
    regions: ["CN", "HK", "TW", "JP", "KR"]
  },
  {
    name: "欧美",
    regions: ["US", "GB"]
  }
]

const LANGUAGE_TO_REGION: Record<string, string> = {
  "zh-CN": "CN",
  "zh-TW": "TW",
  "zh-HK": "HK",
  "ja-JP": "JP",
  "ko-KR": "KR",
  "en-US": "US",
}

export function mapLanguageToRegion(languageCode: string): string {
  return LANGUAGE_TO_REGION[languageCode] || "CN"
}
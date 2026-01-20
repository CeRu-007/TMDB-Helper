"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { 
  BookOpen, 
  Film, 
  Tv, 
  Activity, 
  LayoutGrid, 
  Image, 
  Search,
  Star,
  Calendar,
  Globe,
  Users,
  Award,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Settings,
  Shield,
  Edit
} from "lucide-react"

interface GuideSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  content: GuideContent[]
}

interface GuideContent {
  title: string
  description: string
  items?: string[]
  examples?: string[]
  tips?: string[]
  warnings?: string[]
  notes?: string[]
}

interface SearchResult {
  sectionId: string
  sectionTitle: string
  contentIndex: number
  contentTitle: string
  contentDescription: string
  matchedText: string[]
  relevanceScore: number
}

export interface TMDBGuideProps {
  activeSection?: string
}

export function TMDBGuide({ activeSection = "general" }: TMDBGuideProps) {
  const [selectedSection, setSelectedSection] = useState(activeSection)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetailedGuide, setShowDetailedGuide] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeContentIndex, setActiveContentIndex] = useState(0)

  // TMDB编辑指南的完整中文内容
  const guideSections: GuideSection[] = [
    {
      id: "general",
      title: "通用指南",
      description: "TMDB编辑的基本原则、贡献指南和通用规则",
      icon: <BookOpen className="h-5 w-5" />,
      content: [
        {
          title: "贡献指南",
          description: "TMDB旨在成为高质量和可信赖的娱乐数据来源",
          items: [
            "尊重每个人，我们都因为共同点而聚集在这里",
            "对新用户保持礼貌和欢迎态度",
            "在可能的情况下寻求帮助并向他人提供协助",
            "提供建设性批评或表达不同意见，但不要刻薄或不尊重",
            "以身作则，对待他人要比你期望被对待的方式更好"
          ],
          warnings: [
            "不要发布粗俗或冒犯性语言",
            "不要发布或询问受版权保护的非合理使用材料的链接",
            "不要在TMDB的成人部分以外发布任何NSFW内容",
            "不要进行恶意破坏、滥用、煽动和/或骚扰",
            "不要在TMDB上发布垃圾邮件或广告"
          ]
        },
        {
          title: "合集创建",
          description: "如何创建电影合集的详细步骤",
          items: [
            "要创建新合集，您必须首先创建一个\"虚拟\"电影，例如神奇女侠合集",
            "电影条目上的所有字段都应留空，除了标题和描述",
            "创建电影后，进入\"主要事实\"编辑区域",
            "在\"转换为合集？\"选项下将项目转换为合集",
            "添加相关电影到合集中"
          ],
          tips: [
            "合集标题应清楚地标识电影系列",
            "概述应简要描述合集的主题和包含的电影",
            "确保所有包含的电影都符合合集的定义和标准"
          ],
          notes: [
            "如果您意外将好的电影条目转换为合集，只需转到合集的主要事实并使用\"转换为电影？\"字段将其转换回电影"
          ],
          warnings: [
            "不要将不相关的电影添加到同一个合集中",
            "确保合集中的电影确实属于同一个系列"
          ]
        },
        {
          title: "业余内容",
          description: "关于业余内容在TMDB中的处理规则",
          items: [
            "TMDB通常不接受业余制作的内容",
            "粉丝电影或粉丝网络剧不被允许",
            "YouTube视频，包括病毒视频和知名YouTuber制作的视频不被接受",
            "只有专业制作或官方发行的内容才被允许",
            "学生作品通常不符合TMDB的收录标准"
          ],
          examples: [
            "❌ 粉丝制作的短片或电影",
            "❌ 学校项目或学生作品",
            "❌ 个人YouTube频道的内容",
            "❌ 未经官方发行的独立制作",
            "✅ 在电影节放映的专业独立电影",
            "✅ 官方发行的网络剧或短片"
          ],
          warnings: [
            "不要添加未经官方认可的业余内容",
            "确认内容是否有正式的发行渠道",
            "避免添加纯粹的用户生成内容"
          ]
        },
        {
          title: "一般提示",
          description: "我们的数据100%由用户贡献，鼓励您添加缺失项目并编辑任何不正确的数据",
          items: [
            "在创建或编辑内容之前，建议查看新内容部分以及电影、电视节目、人员、合集和图片的完整编辑指南",
            "请避免与其他贡献者发生编辑战争",
            "可以使用举报按钮请求内容版主锁定字段或报告重复问题",
            "内容问题报告主要由志愿者内容版主处理",
            "在报告中包含官方来源将大大加快处理速度"
          ],
          tips: [
            "在创建新的内容问题报告之前，确保问题尚未被报告或您的问题尚未得到解答",
            "尝试选择正确的问题类型（重复、不良图片、不正确内容、冒犯性或垃圾邮件等）",
            "每个问题一个报告，请在一个报告中包含所有相关信息"
          ]
        },
        {
          title: "搜索技巧",
          description: "如何有效搜索TMDB数据库中的内容",
          items: [
            "使用原始标题进行搜索通常最有效",
            "尝试不同的关键词组合",
            "使用年份来缩小搜索范围",
            "检查不同语言版本的标题",
            "搜索演员或导演的姓名来找到相关作品"
          ],
          examples: [
            "搜索《阿凡达》时，也可以尝试搜索\"Avatar\"",
            "如果找不到某部电影，尝试搜索主演的姓名",
            "使用IMDb ID可以快速定位特定内容"
          ]
        },
        {
          title: "网站翻译",
          description: "TMDB支持多语言，翻译质量对用户体验至关重要",
          items: [
            "翻译应准确反映原始含义",
            "保持专业术语的一致性",
            "考虑目标语言的文化背景",
            "避免直译，注重语言的自然流畅"
          ],
          notes: [
            "翻译工作需要社区志愿者的持续贡献",
            "如发现翻译错误，欢迎提交修正建议"
          ]
        }
      ]
    },
    {
      id: "new-content",
      title: "新内容指南",
      description: "添加新电影、电视节目和其他内容的详细指南",
      icon: <Star className="h-5 w-5" />,
      content: [
        {
          title: "创建新条目",
          description: "添加新内容前的准备工作和基本要求",
          items: [
            "在添加缺失条目之前，建议您彻底搜索数据库",
            "在点击\"添加新电影\"或\"添加新电视节目\"按钮之前，考虑要使用哪种语言创建新条目",
            "将您的默认语言设置为您选择的语言",
            "只需要原始标题和概述即可创建新的电影条目",
            "对于电视条目，还需要一集的数据（标题、概述、播出日期）"
          ],
          tips: [
            "如果所需信息不可用，您可以添加虚假的概述或播出日期，但必须在创建条目后立即删除它们",
            "新条目只有在您点击完成按钮后才会被创建",
            "只点击一次并等待，每次额外点击可能会创建重复条目"
          ],
          warnings: [
            "如果您意识到创建的条目已经在数据库中存在，请使用举报按钮将其报告为重复项"
          ]
        },
        {
          title: "不支持的内容",
          description: "TMDB数据库中不允许的内容类型",
          items: [
            "视频游戏或Twitch等平台上的视频游戏直播",
            "广告（极少数例外：不像广告的长篇广告，有著名导演和/或演员）",
            "音乐视频（极少数例外：在电影节放映的扩展音乐视频）",
            "YouTube视频，包括病毒视频和知名YouTuber制作的视频",
            "粉丝电影或粉丝网络剧",
            "业余内容",
            "替代版本，包括3D/IMAX、导演剪辑版、扩展版本等"
          ],
          examples: [
            "❌ 游戏直播、广告、普通音乐视频",
            "❌ YouTube视频、粉丝制作内容",
            "❌ DVD额外材料（除非有导演署名的纪录片、制作花絮和短片）",
            "✅ YouTube Originals、正式发行的内容",
            "✅ 有导演署名的纪录片和短片"
          ]
        }
      ]
    },
    {
      id: "movies",
      title: "电影指南",
      description: "电影条目的编辑规范、主要事实和制作信息",
      icon: <Film className="h-5 w-5" />,
      content: [
        {
          title: "原始标题",
          description: "电影原始标题的设定规则和标准",
          items: [
            "原始标题通常是电影首次正式发行时使用的标题",
            "原始标题应始终是电影原始版本中使用的标题",
            "原始标题可能会发生变化，直到电影正式上映、发行或在电视上播出",
            "我们通常偏爱原始的本地标题",
            "与其他数据库不同，我们不对原始标题进行罗马化"
          ],
          examples: [
            "法国电影《天使爱美丽》的原始标题是\"Le fabuleux destin d'Amélie Poulain\"",
            "原始标题应使用原始文字（如Левиафан、우리들）",
            "罗马化的原始标题可以作为替代标题添加"
          ],
          tips: [
            "当宣传材料使用略有不同的标题时，我们尝试使用原始片头字幕中的标题",
            "标题大写规则因语言而异",
            "标题中不应添加年份或国家代码等额外信息"
          ]
        },
        {
          title: "视频内容？",
          description: "如何判断电影条目是否应该包含视频内容",
          items: [
            "电影条目通常不包含完整的电影视频内容",
            "预告片和官方片段可以添加到电影页面",
            "用户生成的内容（如评论视频）不应添加",
            "只有官方发布的宣传材料才被允许",
            "视频内容必须与电影直接相关"
          ],
          examples: [
            "✅ 官方预告片、电视广告、制作花絮",
            "✅ 导演访谈、演员采访（官方发布）",
            "❌ 粉丝制作的混剪视频",
            "❌ 盗版或泄露的电影片段",
            "❌ 第三方评论或解说视频"
          ],
          warnings: [
            "不要上传受版权保护的完整电影内容",
            "确保视频来源的合法性",
            "避免添加低质量或非官方的视频内容"
          ]
        }
      ]
    },
    {
      id: "tv",
      title: "电视剧指南",
      description: "电视剧和网络剧的编辑规范、剧集管理和播出信息",
      icon: <Tv className="h-5 w-5" />,
      content: [
        {
          title: "原始名称",
          description: "电视剧原始标题的设定规则",
          items: [
            "在原始版本中本地使用的第一个标题",
            "这意味着使用原始语言的原始名称，即最初在日本播出的节目使用日语",
            "电影标题指南也适用于电视剧标题",
            "电视节目名称必须使用原始文字",
            "标题中不应添加发行年份或国家代码等额外信息"
          ]
        },
        {
          title: "常规演员",
          description: "电视剧常规演员的管理和编辑指南",
          items: [
            "常规演员是在多个剧集中出现的主要角色演员",
            "应该按照重要性和出现频率排序",
            "客串演员不应列为常规演员",
            "演员信息应包括角色名称和出现的季数",
            "定期更新常规演员列表以反映剧集的变化"
          ],
          tips: [
            "确认演员信息的准确性，特别是角色名称的拼写",
            "区分主要演员和客串演员",
            "注明演员在哪些季中出现",
            "对于长期剧集，及时更新演员状态"
          ],
          examples: [
            "主演：在所有或大部分剧集中出现的核心角色",
            "常规演员：在一季中多次出现的重要角色",
            "客串演员：只在少数剧集中出现的角色"
          ]
        },
        {
          title: "添加新剧集",
          description: "如何正确添加电视剧的新剧集",
          items: [
            "当没有即将播出剧集的确认电视剧集数据时，最好等到新闻稿或电视列表信息发布后再创建新剧集",
            "最好从新闻稿而不是用户贡献数据库添加演员和工作人员信息",
            "内容版主可能会尝试使用支持论坛或私信系统联系您",
            "请听取他们的建议，必要时对您的编辑进行更改",
            "确保剧集信息的准确性和完整性"
          ],
          warnings: [
            "不要基于推测或传言添加剧集信息",
            "避免添加未经确认的播出日期",
            "不要复制其他数据库的错误信息"
          ],
          tips: [
            "使用官方来源确认剧集信息",
            "等待官方公告再添加新剧集",
            "保持剧集编号的一致性",
            "及时更新剧集状态和信息"
          ]
        }
      ]
    },
    {
      id: "people",
      title: "人员指南",
      description: "演员、导演等人员信息的编辑规范和管理",
      icon: <Activity className="h-5 w-5" />,
      content: [
        {
          title: "基本信息",
          description: "人员档案必须包含的基本信息和格式要求",
          items: [
            "真实姓名：使用人员的法定全名",
            "艺名/别名：常用的职业名称或舞台名",
            "出生日期：使用YYYY-MM-DD格式",
            "出生地：包括城市、州/省、国家",
            "职业：演员、导演、编剧、制片人等",
            "活跃年份：从业开始到结束的时间段"
          ]
        }
      ]
    },
    {
      id: "collections",
      title: "合集指南",
      description: "电影系列和合集的组织方法和管理规范",
      icon: <LayoutGrid className="h-5 w-5" />,
      content: [
        {
          title: "合集概述",
          description: "合集的定义和使用原则",
          items: [
            "合集应仅用于真正的电影续集",
            "作为一般规则，续集是围绕相同主要角色并延续早期电影故事的电影",
            "主角会发展并意识到早期电影中发生的事件",
            "大多数流行电影系列都由适当的电影续集组成"
          ]
        }
      ]
    },
    {
      id: "images",
      title: "图片指南",
      description: "图片上传、质量标准和版权要求",
      icon: <Image className="h-5 w-5" />,
      content: [
        {
          title: "图片质量标准",
          description: "上传图片的技术要求和质量规范",
          items: [
            "海报：最小分辨率1000x1500像素，推荐更高分辨率",
            "剧照：最小分辨率1920x1080像素（1080p）",
            "人员照片：最小分辨率500x750像素",
            "格式：支持JPG、PNG格式，推荐JPG以获得更好的压缩",
            "质量：图片应清晰、无水印、无压缩失真"
          ]
        }
      ]
    }
  ]

  const currentSection = guideSections.find(section => section.id === selectedSection) || guideSections[0]

  // 防抖延迟时间（毫秒）
  const DEBOUNCE_DELAY = 200
  
  // 最大搜索结果数量
  const MAX_SEARCH_RESULTS = 10
  
  // 最大搜索建议数量
  const MAX_SEARCH_SUGGESTIONS = 8
  
  // 同义词和相关词映射
  const SYNONYMS_MAP: Record<string, string[]> = {
    '电影': ['影片', 'movie', 'film'],
    '电视剧': ['剧集', '节目', 'tv', 'show', 'series'],
    '演员': ['艺人', 'actor', 'actress', 'cast'],
    '导演': ['执导', 'director'],
    '图片': ['图像', '照片', 'image', 'photo'],
    '合集': ['系列', 'collection', 'series'],
    '编辑': ['修改', 'edit', 'modify'],
    '添加': ['新增', 'add', 'create'],
    '搜索': ['查找', 'search', 'find'],
    '指南': ['教程', '帮助', 'guide', 'tutorial', 'help'],
    '规则': ['规定', 'rule', 'regulation'],
    '质量': ['标准', 'quality', 'standard'],
    '内容': ['信息', 'content', 'information'],
    '标题': ['题目', 'title', 'name'],
    '原始': ['最初', 'original'],
    '语言': ['language', 'lang'],
    '翻译': ['translation', 'translate'],
    '贡献': ['提交', 'contribution', 'contribute'],
    '业余': ['非专业', 'amateur'],
    '专业': ['职业', 'professional'],
    '用户': ['使用者', 'user'],
    '数据': ['资料', 'data']
  }
  
  // 提取所有可搜索的文本内容用于生成搜索建议
  const allSearchableContent = useMemo(() => {
    const content: { 
      text: string; 
      sectionId: string; 
      contentIndex: number; 
      fieldType: string;
      itemIndex?: number;
      exampleIndex?: number;
      tipIndex?: number;
      warningIndex?: number;
      noteIndex?: number;
    }[] = []
    guideSections.forEach(section => {
      content.push({ text: section.title, sectionId: section.id, contentIndex: -1, fieldType: 'sectionTitle' })
      content.push({ text: section.description, sectionId: section.id, contentIndex: -1, fieldType: 'sectionDescription' })
      section.content.forEach((contentItem, contentIndex) => {
        content.push({ text: contentItem.title, sectionId: section.id, contentIndex, fieldType: 'contentTitle' })
        content.push({ text: contentItem.description, sectionId: section.id, contentIndex, fieldType: 'contentDescription' })
        if (contentItem.items) {
          contentItem.items.forEach((item, itemIndex) => {
            content.push({ text: item, sectionId: section.id, contentIndex, fieldType: 'item', itemIndex })
          })
        }
        if (contentItem.examples) {
          contentItem.examples.forEach((example, exampleIndex) => {
            content.push({ text: example, sectionId: section.id, contentIndex, fieldType: 'example', exampleIndex })
          })
        }
        if (contentItem.tips) {
          contentItem.tips.forEach((tip, tipIndex) => {
            content.push({ text: tip, sectionId: section.id, contentIndex, fieldType: 'tip', tipIndex })
          })
        }
        if (contentItem.warnings) {
          contentItem.warnings.forEach((warning, warningIndex) => {
            content.push({ text: warning, sectionId: section.id, contentIndex, fieldType: 'warning', warningIndex })
          })
        }
        if (contentItem.notes) {
          contentItem.notes.forEach((note, noteIndex) => {
            content.push({ text: note, sectionId: section.id, contentIndex, fieldType: 'note', noteIndex })
          })
        }
      })
    })
    return content
  }, [])

  // 计算文本相似度（基于Levenshtein距离）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }
  
  // 计算Levenshtein距离
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  
  // 获取查询词的同义词
  const getSynonyms = (query: string): string[] => {
    const synonyms: string[] = []
    const lowerQuery = query.toLowerCase()
    
    Object.entries(SYNONYMS_MAP).forEach(([key, values]) => {
      if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
        synonyms.push(key, ...values)
      }
      values.forEach(value => {
        if (value.includes(lowerQuery) || lowerQuery.includes(value)) {
          synonyms.push(key, ...values)
        }
      })
    })
    
    return Array.from(new Set(synonyms)) // 去重
  }
  
  // 生成搜索建议
  const generateSearchSuggestions = (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([])
      return
    }

    const queryLower = query.toLowerCase()
    const suggestions = new Set<string>()

    allSearchableContent.forEach(({ text }) => {
      const textLower = text.toLowerCase()
      if (textLower.includes(queryLower)) {
        // 提取包含查询词的短语
        const words = text.split(/\s+/)
        const queryIndex = words.findIndex(word => 
          word.toLowerCase().includes(queryLower)
        )
        
        if (queryIndex !== -1) {
          // 获取查询词周围的上下文
          const start = Math.max(0, queryIndex - 2)
          const end = Math.min(words.length, queryIndex + 3)
          const suggestion = words.slice(start, end).join(' ')
          suggestions.add(suggestion)
        }
      }
    })

    setSearchSuggestions(Array.from(suggestions).slice(0, 8))
  }

  // 搜索功能
  const searchContent = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const queryLower = query.toLowerCase()
    const results: SearchResult[] = []
    const synonyms = getSynonyms(query)
    
    // 扩展查询词，包括同义词
    const expandedQueries = [queryLower, ...synonyms.map(s => s.toLowerCase())]
    
    // 使用Map来避免重复结果
    const resultsMap = new Map<string, SearchResult>()
    
    allSearchableContent.forEach(({ text, sectionId, contentIndex, fieldType }) => {
      let totalRelevanceScore = 0
      const matchedText: string[] = []
      const queryMatches: string[] = []
      
      expandedQueries.forEach(expandedQuery => {
        // 精确匹配
        if (text.toLowerCase() === expandedQuery) {
          totalRelevanceScore += 15
          matchedText.push(text)
          queryMatches.push(expandedQuery)
        }
        // 开头匹配
        else if (text.toLowerCase().startsWith(expandedQuery)) {
          totalRelevanceScore += 12
          matchedText.push(text)
          queryMatches.push(expandedQuery)
        }
        // 包含匹配
        else if (text.toLowerCase().includes(expandedQuery)) {
          totalRelevanceScore += 8
          matchedText.push(text)
          queryMatches.push(expandedQuery)
        }
        // 相似度匹配
        else {
          const similarity = calculateSimilarity(expandedQuery, text.toLowerCase())
          if (similarity > 0.7) {
            totalRelevanceScore += Math.floor(similarity * 6)
            matchedText.push(text)
            queryMatches.push(expandedQuery)
          }
        }
      })
      
      // 如果找到匹配项，添加到结果中
      if (totalRelevanceScore > 0) {
        const section = guideSections.find(s => s.id === sectionId)
        if (!section) return
        
        const contentItem = contentIndex >= 0 ? section.content[contentIndex] : null
        const resultKey = `${sectionId}-${contentIndex}`
        
        // 如果已存在该结果，增加相关性分数
        if (resultsMap.has(resultKey)) {
          const existingResult = resultsMap.get(resultKey)!
          existingResult.relevanceScore += totalRelevanceScore
          existingResult.matchedText.push(...matchedText)
        } else {
          // 字段类型权重
          const fieldWeight = {
            'sectionTitle': 1.5,
            'contentTitle': 1.3,
            'contentDescription': 1.0,
            'item': 0.9,
            'example': 0.8,
            'tip': 0.9,
            'warning': 1.0,
            'note': 0.8
          }
          
          const weightedScore = totalRelevanceScore * (fieldWeight[fieldType] || 1.0)
          
          resultsMap.set(resultKey, {
            sectionId,
            sectionTitle: section.title,
            contentIndex,
            contentTitle: contentItem?.title || section.title,
            contentDescription: contentItem?.description || section.description,
            matchedText: [...new Set(matchedText)], // 去重
            relevanceScore: weightedScore
          })
        }
      }
    })
    
    // 转换为数组并按相关性排序
    const sortedResults = Array.from(resultsMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MAX_SEARCH_RESULTS)
    
    setSearchResults(sortedResults)
    setIsSearching(false)
  }

  // 处理搜索输入变化
  useEffect(() => {
    generateSearchSuggestions(searchQuery)
    if (searchQuery.length >= 1) {
      const timeoutId = setTimeout(() => {
        searchContent(searchQuery)
      }, DEBOUNCE_DELAY) // 使用常量防抖延迟
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  // 处理搜索结果点击
  const handleSearchResultClick = (result: SearchResult) => {
    setSelectedSection(result.sectionId)
    setShowDetailedGuide(true)
    setSearchQuery("")
    setSearchResults([])
    setShowSuggestions(false)
    setActiveContentIndex(result.contentIndex >= 0 ? result.contentIndex : 0)
  }

  // 处理章节导航点击
  const handleChapterClick = (index: number, title: string) => {
    setActiveContentIndex(index)
    const element = document.getElementById(title)
    const contentContainer = document.querySelector('[data-content-container]')
    
    if (element && contentContainer) {
      // 计算元素相对于容器的位置
      const containerRect = contentContainer.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const offsetTop = elementRect.top - containerRect.top + contentContainer.scrollTop - 80
      
      contentContainer.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
  }

  // 监听右侧内容区域滚动更新激活状态
  useEffect(() => {
    if (!showDetailedGuide) return

    const handleScroll = () => {
      const contentContainer = document.querySelector('[data-content-container]')
      if (!contentContainer) return

      const contentElements = currentSection.content.map((_, index) => 
        document.getElementById(currentSection.content[index].title)
      ).filter(Boolean)

      const scrollPosition = contentContainer.scrollTop + 100 // 添加偏移量

      for (let i = contentElements.length - 1; i >= 0; i--) {
        const element = contentElements[i]
        if (element && element.offsetTop <= scrollPosition) {
          setActiveContentIndex(i)
          break
        }
      }
    }

    const contentContainer = document.querySelector('[data-content-container]')
    if (contentContainer) {
      contentContainer.addEventListener('scroll', handleScroll)
      return () => contentContainer.removeEventListener('scroll', handleScroll)
    }
  }, [showDetailedGuide, currentSection])

  // 重置激活内容索引当切换章节时
  useEffect(() => {
    setActiveContentIndex(0)
  }, [selectedSection])

  // 高亮匹配文本
  const highlightMatchedText = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-black px-1 rounded">{part}</span>
      ) : (
        part
      )
    )
  }

  // 侧边栏导航项
  const sidebarItems = [
    { id: "contribution-guidelines", label: "Contribution Guidelines", active: true },
    { id: "incorrect-entries", label: "Incorrect Entries" },
    { id: "general-tips", label: "General Tips" },
    { id: "image-reports", label: "Image Reports" },
    { id: "incorrect-episodes", label: "Incorrect Episodes" },
    { id: "keywords", label: "Keywords" },
    { id: "locked-fields", label: "Locked Fields" },
    { id: "website-translation", label: "Website Translation" },
    { id: "faq", label: "FAQ" },
    { id: "search-tips", label: "Search Tips" },
    { id: "source-reliability", label: "Source Reliability" },
    { id: "moderation", label: "Moderation" },
    { id: "international-editing", label: "International Editing" },
    { id: "vibes", label: "Vibes" }
  ]

  // 如果显示详细指南，渲染详细页面
  if (showDetailedGuide) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#032541] to-[#01b4e4] text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-4 mb-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                onClick={() => setShowDetailedGuide(false)}
              >
                <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                返回
              </Button>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                {currentSection.icon}
              </div>
              <h1 className="text-4xl font-bold">{currentSection.title}</h1>
            </div>
            <div className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  type="text"
                  placeholder="搜索需要方面的协助？"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-black border-0 rounded"
                />
              </div>
              
              {/* TMDB风格搜索结果列表 */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="mt-4 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">搜索结果</h3>
                    <div className="text-xs text-gray-500">
                      找到 {searchSuggestions.length} 个结果
                    </div>
                  </div>
                  <div className="divide-y">
                    {searchSuggestions.map((suggestion, index) => {
                      // 中文路径分类
                      const categoryPaths = [
                        "主要信息 > 原始标题",
                        "主要信息 > 概述", 
                        "主要信息 > 视频内容",
                        "主要信息 > 时长",
                        "主要信息 > 预算与收入",
                        "主要信息 > 语言",
                        "替代标题 > 替代标题",
                        "演员 > 排序演员",
                        "工作人员 > 工作人员",
                        "上映日期 > 日期",
                        "上映日期 > 分级",
                        "上映日期 > 备注",
                        "外部ID > 外部ID",
                        "类型 > 类型",
                        "视频 > 搜索YouTube",
                        "视频 > 语言",
                        "通用 > 一般提示",
                        "新内容 > 添加新内容"
                      ];
                      
                      const categoryTypes = ["电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "电影", "通用", "新内容"];
                      
                      const pathIndex = index % categoryPaths.length;
                      const categoryType = categoryTypes[pathIndex];
                      const isMovie = categoryType === "电影";
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSearchQuery(suggestion)
                            setShowSuggestions(false)
                          }}
                        >
                          <span 
                            className={`px-2 py-1 text-xs font-semibold text-white rounded mr-3 ${
                              isMovie ? 'bg-red-500' : categoryType === '通用' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                          >
                            {categoryType}
                          </span>
                          <span className="text-gray-700 text-sm">
                            {highlightMatchedText(categoryPaths[pathIndex], searchQuery)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {isSearching && (
                <div className="mt-4 text-center text-gray-500">
                  <div className="inline-flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>搜索中...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg shadow-sm border lg:sticky lg:top-8 lg:h-fit">
                <div className="p-4 border-b">
                  <Badge className="bg-green-500 text-white mb-2">GENERAL</Badge>
                  <h3 className="font-semibold text-gray-900">{currentSection.title}</h3>
                </div>
                <nav className="p-2">
                  {currentSection.content.map((content, index) => (
                    <button
                      key={index}
                      onClick={() => handleChapterClick(index, content.title)}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                        index === activeContentIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {content.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4">
              <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-4 space-y-6" data-content-container>
                {currentSection.content.map((content, index) => (
                  <div key={index} id={content.title} className="bg-white rounded-lg shadow-sm border scroll-mt-20">
                    <div className="p-6 border-b">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
                      </div>
                      <p className="text-gray-600 mt-2">{content.description}</p>
                    </div>
                    <div className="p-6">
                      <div className="prose max-w-none">
                        {/* 要点列表 */}
                        {content.items && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              要点
                            </h4>
                            <ul className="space-y-2">
                              {content.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 示例 */}
                        {content.examples && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <ChevronRight className="h-4 w-4 mr-1" />
                              示例
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                              {content.examples.map((example, exampleIndex) => (
                                <div key={exampleIndex} className="text-gray-700 font-mono text-sm">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 提示 */}
                        {content.tips && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <Info className="h-4 w-4 mr-1" />
                              提示
                            </h4>
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 space-y-2">
                              {content.tips.map((tip, tipIndex) => (
                                <div key={tipIndex} className="text-blue-800">
                                  💡 {tip}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 警告 */}
                        {content.warnings && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              注意事项
                            </h4>
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 space-y-2">
                              {content.warnings.map((warning, warningIndex) => (
                                <div key={warningIndex} className="text-red-800">
                                  ⚠️ {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 备注 */}
                        {content.notes && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              备注
                            </h4>
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 space-y-2">
                              {content.notes.map((note, noteIndex) => (
                                <div key={noteIndex} className="text-yellow-800">
                                  📝 {note}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* TMDB Header */}
      <div className="bg-[#032541] text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#01b4e4] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-bold text-lg">编辑指南</span>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10">
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            返回TMDB
          </Button>
        </div>
      </div>

      {/* Hero Section - 保留原始高度，使用绝对定位避免高度变化 */}
      <div className="bg-gradient-to-br from-[#032541] via-[#01b4e4] to-[#90cea1] text-white py-16 relative">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            欢迎来到
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-8">
            编辑指南
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <Input
                type="text"
                placeholder="您需要哪方面的协助？"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-4 py-3 text-lg bg-white text-black border-0 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        {/* 真实搜索结果 - 使用绝对定位，不影响容器高度 */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">搜索结果</h3>
                    <div className="text-xs text-gray-500">
                      找到 {searchResults.length} 个结果
                    </div>
                  </div>
                  <div className="divide-y">
                    {searchResults.map((result, index) => {
                      const section = guideSections.find(s => s.id === result.sectionId);
                      const categoryType = section?.id === 'general' ? '通用' : 
                                        section?.id === 'movies' ? '电影' : 
                                        section?.id === 'tv' ? '电视剧' : 
                                        section?.id === 'people' ? '人员' : 
                                        section?.id === 'collections' ? '合集' : 
                                        section?.id === 'images' ? '图片' : 
                                        section?.id === 'new-content' ? '新内容' : '通用';
                      
                      const isMovie = categoryType === "电影";
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSearchResultClick(result)}
                        >
                          <span 
                            className={`px-2 py-1 text-xs font-semibold text-white rounded mr-3 ${
                              isMovie ? 'bg-red-500' : 
                              categoryType === '通用' ? 'bg-green-500' : 
                              categoryType === '电视剧' ? 'bg-purple-500' : 
                              categoryType === '人员' ? 'bg-blue-500' : 
                              categoryType === '合集' ? 'bg-yellow-600' : 
                              categoryType === '图片' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                          >
                            {categoryType}
                          </span>
                          <span className="text-gray-700 text-sm">
                            {highlightMatchedText(result.contentTitle, searchQuery)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 搜索状态指示器 - 使用绝对定位 */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 z-50">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <div className="mt-2 text-center">
                  <div className="inline-flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-500">搜索中...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Cards */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 通用 */}
          <Card 
            className="bg-[#032541] text-white hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedSection("general")
              setShowDetailedGuide(true)
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <BookOpen className="h-6 w-6" />
                <h3 className="text-xl font-semibold">通用</h3>
              </div>
              <div className="h-1 w-12 bg-[#01b4e4] rounded mb-4"></div>
              <p className="text-gray-300">基本编辑原则和通用规则</p>
            </CardContent>
          </Card>

          {/* 新内容 */}
          <Card 
            className="bg-[#032541] text-white hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedSection("new-content")
              setShowDetailedGuide(true)
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Star className="h-6 w-6" />
                <h3 className="text-xl font-semibold">新内容</h3>
              </div>
              <div className="h-1 w-12 bg-[#01b4e4] rounded mb-4"></div>
              <p className="text-gray-300">添加新电影和电视节目</p>
            </CardContent>
          </Card>

          {/* 图片 */}
          <Card 
            className="bg-[#032541] text-white hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedSection("images")
              setShowDetailedGuide(true)
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Image className="h-6 w-6" />
                <h3 className="text-xl font-semibold">图片</h3>
              </div>
              <div className="h-1 w-12 bg-[#01b4e4] rounded mb-4"></div>
              <p className="text-gray-300">图片上传和质量标准</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* 电影指南 */}
          <Card 
            className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => {
              setSelectedSection("movies")
              setShowDetailedGuide(true)
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800"></div>
            <div className="absolute inset-0 bg-black/40"></div>
            <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
              <Film className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">电影</h3>
              <h4 className="text-lg">指南</h4>
            </CardContent>
          </Card>

          {/* 节目指南 */}
          <Card 
            className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => {
              setSelectedSection("tv")
              setShowDetailedGuide(true)
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800"></div>
            <div className="absolute inset-0 bg-black/40"></div>
            <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
              <Tv className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">节目</h3>
              <h4 className="text-lg">指南</h4>
            </CardContent>
          </Card>

          {/* 人员指南 */}
          <Card 
            className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => {
              setSelectedSection("people")
              setShowDetailedGuide(true)
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>
            <div className="absolute inset-0 bg-black/40"></div>
            <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
              <Activity className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">人员</h3>
              <h4 className="text-lg">指南</h4>
            </CardContent>
          </Card>

          {/* 合集指南 */}
          <Card 
            className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => {
              setSelectedSection("collections")
              setShowDetailedGuide(true)
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-600 to-yellow-800"></div>
            <div className="absolute inset-0 bg-black/40"></div>
            <CardContent className="relative p-6 text-white h-48 flex flex-col justify-end">
              <LayoutGrid className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">合集</h3>
              <h4 className="text-lg">指南</h4>
            </CardContent>
          </Card>
        </div>

        {/* Featured Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">精选文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("movies")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-pink-500 text-white">电影</Badge>
              <span className="text-gray-700">视频内容？</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("images")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-green-500 text-white">图片</Badge>
              <span className="text-gray-700">图片质量标准</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("general")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-green-500 text-white">通用</Badge>
              <span className="text-gray-700">搜索技巧</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("new-content")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-green-500 text-white">新内容</Badge>
              <span className="text-gray-700">合集创建</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("general")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-green-500 text-white">通用</Badge>
              <span className="text-gray-700">网站翻译</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("new-content")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-green-500 text-white">新内容</Badge>
              <span className="text-gray-700">业余内容</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("tv")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-purple-500 text-white">电视</Badge>
              <span className="text-gray-700">常规演员</span>
            </div>
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedSection("tv")
                setShowDetailedGuide(true)
              }}
            >
              <Badge className="bg-purple-500 text-white">电视</Badge>
              <span className="text-gray-700">添加新剧集</span>
            </div>
          </div>
        </div>

        {/* 底部链接 */}
         <div className="mt-auto">
           <Card className="bg-[#032541] text-white">
             <CardContent className="p-6 text-center">
               <h3 className="text-lg font-semibold mb-2 text-white">需要更多帮助？</h3>
               <p className="text-gray-300 mb-4">
                 访问TMDB官方网站获取最新的编辑指南和社区支持
               </p>
               <div className="flex justify-center space-x-4">
                 <Button 
                   variant="outline"
                   className="border-white text-white hover:bg-white hover:text-[#032541] bg-transparent"
                   onClick={() => window.open('https://www.themoviedb.org/bible', '_blank')}
                 >
                   <ExternalLink className="h-4 w-4 mr-2" />
                   访问TMDB官网
                 </Button>
                 <Button 
                   variant="outline"
                   className="border-white text-white hover:bg-white hover:text-[#032541] bg-transparent"
                   onClick={() => window.open('https://www.themoviedb.org/talk', '_blank')}
                 >
                   <Users className="h-4 w-4 mr-2" />
                   加入社区讨论
                 </Button>
                 <Button 
                   variant="outline"
                   className="border-white text-white hover:bg-white hover:text-[#032541] bg-transparent"
                   onClick={() => window.open('https://www.themoviedb.org/talk/category/5047958519c29526b50017d4', '_blank')}
                 >
                   <Shield className="h-4 w-4 mr-2" />
                   报告问题
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
      </div>
    </div>
  )
}
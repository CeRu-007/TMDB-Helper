"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { logger } from '@/lib/utils/logger'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Badge, badgeVariants } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { BackgroundImage } from "@/shared/components/ui/background-image"
import {
  Tv,
  Search,
  Info,
  Star,
  ExternalLink,
  Loader2,
  Sparkles,
  Baby,
  Popcorn,
  Ticket,
  LayoutGrid,
  Zap,
  FileCode,
  Image as ImageIcon
} from "lucide-react"
import type { TMDBItem, Season, Episode } from "@/types/tmdb-item"
import { StorageManager } from "@/lib/data/storage"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useToast } from "@/lib/hooks/use-toast"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"
import { useTranslation } from "react-i18next"

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const WEEKDAYS_KEYS_FOR_SELECT = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

// 定义分类列表
const CATEGORY_IDS = ['anime', 'tv', 'kids', 'variety', 'short'] as const

type CategoryType = "anime" | "tv" | "kids" | "variety" | "short";

interface TMDBSearchResult {
  id: number
  title: string
  name?: string
  media_type: "tv"
  poster_path?: string
  backdrop_path?: string
  first_air_date?: string
  release_date?: string
  overview?: string
  vote_average?: number
  original_language?: string
  adult?: boolean
}

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: TMDBItem) => void
  prefilledData?: {
    id: number
    title: string
    mediaType: 'movie' | 'tv'
    posterPath?: string | null
    releaseDate: string
    overview?: string
    voteAverage?: number
  } | null
}

export default function AddItemDialog({ open, onOpenChange, onAdd, prefilledData }: AddItemDialogProps) {
  const { t } = useTranslation('media')
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TMDBSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tmdbSeasons, setTmdbSeasons] = useState<Season[]>([])
  const [backdropUrl, setBackdropUrl] = useState<string | undefined>(undefined)
  const [backdropPath, setBackdropPath] = useState<string | undefined>(undefined)
  const [customBackdropUrl, setCustomBackdropUrl] = useState<string>("")
  const [showBackdropPreview, setShowBackdropPreview] = useState(false)
  const [showPreviewCard, setShowPreviewCard] = useState(false)
  const { toast } = useToast()

  const CATEGORIES = [
    { id: "anime" as const, name: t('categoryNames.anime'), icon: <Sparkles className="h-4 w-4" strokeWidth={2} /> },
    { id: "tv" as const, name: t('categoryNames.tv'), icon: <Tv className="h-4 w-4" strokeWidth={2} /> },
    { id: "kids" as const, name: t('categoryNames.kids'), icon: <Baby className="h-4 w-4" strokeWidth={2} /> },
    { id: "variety" as const, name: t('categoryNames.variety'), icon: <Popcorn className="h-4 w-4" strokeWidth={2} /> },
    { id: "short" as const, name: t('categoryNames.short'), icon: <Ticket className="h-4 w-4" strokeWidth={2} /> },
  ]

  const WEEKDAYS = WEEKDAY_KEYS.map(key => t(`weekdaysList.${key}`))

  const [formData, setFormData] = useState({
    weekday: 1,
    secondWeekday: -1, // -1 表示未设置
    airTime: "18:00",
    totalEpisodes: 1,
    platformUrl: "",
    category: "" as CategoryType | "",
    isDailyUpdate: false // 添加每日更新选项
  })
  // 添加标记来跟踪用户是否手动修改了总集数
  const [isManualTotalEpisodes, setIsManualTotalEpisodes] = useState(false)
  // Node.js和浏览器环境中setTimeout返回类型不同，使用any类型避免类型错误
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // 获取显示标题
  const getDisplayTitle = (result: TMDBSearchResult): string => {
    return result.name || result.title
  }
  
  // 选择搜索结果 - 使用useCallback包装以避免依赖循环
  const handleSelectResult = useCallback(async (result: TMDBSearchResult) => {
    setSelectedResult(result)
    setDetailLoading(true)
    setBackdropUrl(undefined) // 重置背景图URL
    setBackdropPath(undefined) // 重置背景图路径
    setCustomBackdropUrl("") // 重置自定义背景图URL

    try {
      // 构建TMDB URL
      const tmdbUrl = `https://www.themoviedb.org/${result.media_type}/${result.id}`

      // 显示预览卡片
      setShowPreviewCard(true)

      // 获取详细信息
      const response = await fetch(`/api/tmdb?action=getItemFromUrl&url=${encodeURIComponent(tmdbUrl)}`)
      const data = await response.json()
      const tmdbData = data.success ? data.data : null

      if (tmdbData) {
        // 计算总集数：如果有多季数据，计算所有季的总集数
        let calculatedTotalEpisodes = formData.totalEpisodes;
        if (tmdbData.totalEpisodes) {
          calculatedTotalEpisodes = tmdbData.totalEpisodes;
        }
        if (tmdbData.seasons && tmdbData.seasons.length > 0) {
          calculatedTotalEpisodes = tmdbData.seasons.reduce((sum: number, season: { totalEpisodes?: number }) => sum + (season.totalEpisodes || 0), 0);
        }

        // 更新表单数据
        setFormData((prev) => ({
          ...prev,
          // 只有在用户没有手动设置总集数时才使用TMDB数据
          totalEpisodes: isManualTotalEpisodes ? prev.totalEpisodes : calculatedTotalEpisodes,
          platformUrl: prev.platformUrl || tmdbData.platformUrl || "",
          weekday: tmdbData.weekday !== undefined ? tmdbData.weekday : prev.weekday,
          // 根据标签自动设置推荐分类
          category: prev.category || tmdbData.recommendedCategory || "tv" as CategoryType
        }))

        // 设置季数据用于预览
        if (tmdbData.seasons) {
          setTmdbSeasons(tmdbData.seasons)
        }
        
        // 设置背景图URL和路径
        if (tmdbData.backdropUrl) {
          setBackdropUrl(tmdbData.backdropUrl)
          setBackdropPath(tmdbData.backdropPath || "")
          setShowBackdropPreview(true)
        } else if (result.backdrop_path) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w1280${result.backdrop_path}`)
          setBackdropPath(result.backdrop_path)
          setShowBackdropPreview(true)
        }
      }
    } catch (error) {
      
    } finally {
      setDetailLoading(false)
    }
  }, [setSelectedResult, setDetailLoading, setFormData, setTmdbSeasons, setBackdropUrl, setBackdropPath])
  
  // 处理对话框状态变化，统一重置表单
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // 处理预填数据 - 当对话框打开且有预填数据时，模拟搜索→选择结果的完整流程
  useEffect(() => {
    if (open && prefilledData) {
      const { id, title, mediaType, posterPath, releaseDate, overview, voteAverage } = prefilledData;

      // 构建 TMDBSearchResult 格式的数据
      const fakeResult: TMDBSearchResult = {
        id,
        title,
        name: title,
        media_type: mediaType,
        poster_path: posterPath || undefined,
        backdrop_path: undefined,
        first_air_date: releaseDate,
        release_date: releaseDate,
        overview,
        vote_average: voteAverage
      };

      // 模拟搜索流程：设置搜索query和结果列表
      setSearchQuery(title);
      setSearchResults([fakeResult]);

      // 延迟一点选择结果，让用户能看到搜索结果
      setTimeout(() => {
        handleSelectResult(fakeResult);
      }, 100);
    }
  }, [open, prefilledData]);

  // 搜索TMDB
  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/tmdb?action=search&query=${encodeURIComponent(query)}&page=1`
      )

      if (!response.ok) {
        throw new Error("搜索失败，请检查网络连接")
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "搜索失败")
      }

      const results = result.data.results
        .filter((item: { media_type: string }) => item.media_type === "tv")
        .slice(0, 10) // 限制显示10个结果

      setSearchResults(results)
    } catch (error) {
      logger.error('[添加词条] 添加失败:', error);
      toast({
        variant: "destructive",
        title: "添加失败",
        description: error instanceof Error ? error.message : "未知错误"
      })
    } finally {
      setLoading(false)
    }
  }

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    clearSearchState()

    // 防抖搜索
    debounceSearch(value)
  }

  // 清除搜索相关状态
  const clearSearchState = () => {
    setSelectedResult(null)
    setTmdbSeasons([])
    setShowPreviewCard(false)
  }

  // 防抖搜索
  const debounceSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      searchTMDB(query)
    }, 500) as unknown as number
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // 处理自定义背景图URL变更
  const handleCustomBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomBackdropUrl(e.target.value)
  }

  // 预览自定义背景图
  const handlePreviewBackdrop = () => {
    if (customBackdropUrl) {
      setBackdropUrl(customBackdropUrl)
      setBackdropPath(undefined) // 清除TMDB背景图路径，因为使用自定义URL
      setShowBackdropPreview(true)
    }
  }

  // 重置背景图
  const handleResetBackdrop = () => {
    if (selectedResult?.backdrop_path) {
      setBackdropUrl(`https://image.tmdb.org/t/p/w1280${selectedResult.backdrop_path}`)
      setBackdropPath(selectedResult.backdrop_path)
    } else {
      setBackdropUrl(undefined)
      setBackdropPath(undefined)
    }
    setCustomBackdropUrl("")
  }

  const resetForm = () => {
    setSearchQuery("")
    setSearchResults([])
    setSelectedResult(null)
    setFormData({
      weekday: 1,
      secondWeekday: -1,
      airTime: "18:00",
      totalEpisodes: 1,
      platformUrl: "",
      category: "",
      isDailyUpdate: false
    })
    // 重置手动设置标记
    setIsManualTotalEpisodes(false)
    setTmdbSeasons([])
    setBackdropUrl(undefined)
    setBackdropPath(undefined)
    setCustomBackdropUrl("")
    setShowBackdropPreview(false)
    setShowPreviewCard(false)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedResult) {
      toast({
        title: t("independentPage.addItem.errors.selectItem", { ns: "nav.maintenance" }),
        description: t("independentPage.addItem.errors.selectItemHint", { ns: "nav.maintenance" }),
        variant: "destructive"
      })
      return
    }

    // 表单验证
    if (!formData.category) {
      toast({
        title: t("independentPage.addItem.errors.selectCategory", { ns: "nav.maintenance" }),
        description: t("independentPage.addItem.errors.selectCategoryHint", { ns: "nav.maintenance" }),
        variant: "destructive"
      })
      return
    }

    if (formData.totalEpisodes < 1) {
      toast({
        title: t("independentPage.addItem.errors.invalidEpisodes", { ns: "nav.maintenance" }),
        description: t("independentPage.addItem.errors.invalidEpisodesHint", { ns: "nav.maintenance" }),
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const tmdbUrl = `https://www.themoviedb.org/${selectedResult.media_type}/${selectedResult.id}`
      const response = await fetch(`/api/tmdb?action=getItemFromUrl&url=${encodeURIComponent(tmdbUrl)}`)
      const result = await response.json()
      const tmdbData = result.success ? result.data : null
      
      if (!tmdbData) {
        throw new Error(t("independentPage.addItem.errors.getDetailFailed", { ns: "nav.maintenance" }))
      }
      
      // 如果缺少关键图片信息，尝试强制刷新获取
      const missingImages = [];
      if (!tmdbData.logoUrl) missingImages.push("logo");
      if (!tmdbData.backdropUrl) missingImages.push("backdrop");
      if (!tmdbData.networkLogoUrl && selectedResult.media_type === "tv") missingImages.push("networkLogo");

      if (missingImages.length > 0) {
        logger.info(`🔄 [添加词条] 缺少图片信息: ${missingImages.join(", ")}，尝试强制刷新获取...`);
        try {
          const refreshResponse = await fetch(`/api/tmdb?action=getItemFromUrl&url=${encodeURIComponent(tmdbUrl)}&forceRefresh=true`);
          const refreshResult = await refreshResponse.json();
          const refreshedData = refreshResult.success ? refreshResult.data : null;

          if (refreshedData) {
            // 更新缺失的图片信息
            if (!tmdbData.logoUrl && refreshedData.logoUrl) {
              
              tmdbData.logoUrl = refreshedData.logoUrl;
              tmdbData.logoPath = refreshedData.logoPath;
            }

            if (!tmdbData.backdropUrl && refreshedData.backdropUrl) {
              
              tmdbData.backdropUrl = refreshedData.backdropUrl;
              tmdbData.backdropPath = refreshedData.backdropPath;
            }

            if (!tmdbData.networkLogoUrl && refreshedData.networkLogoUrl) {
              
              tmdbData.networkLogoUrl = refreshedData.networkLogoUrl;
              tmdbData.networkId = refreshedData.networkId;
              tmdbData.networkName = refreshedData.networkName;
            }
          }
        } catch (error) {
          
        }
      }

      // 构建季数据
      let seasons: Season[] = []
      let episodes: Episode[] = []
      let totalEpisodes = formData.totalEpisodes
      
      if (tmdbData.seasons && tmdbData.seasons.length > 0) {
        // 多季电视剧 - 使用 currentEpisode 字段
        seasons = tmdbData.seasons.map((seasonData) => ({
          seasonNumber: seasonData.seasonNumber,
          name: seasonData.name,
          totalEpisodes: seasonData.totalEpisodes,
          currentEpisode: 0,  // 初始为0，表示未开始维护
          posterUrl: seasonData.posterUrl,
        }))
        
        totalEpisodes = tmdbData.totalEpisodes || seasons.reduce((sum, s) => sum + s.totalEpisodes, 0)
      } else if (selectedResult.media_type === "tv") {
        // 单季电视剧 - 使用 currentEpisode 字段
        const episodeCount = tmdbData.totalEpisodes || formData.totalEpisodes
        totalEpisodes = episodeCount
        seasons = [{
          seasonNumber: 1,
          totalEpisodes: episodeCount,
          currentEpisode: 0,
        }]
      }
      
      // 优先使用用户手动输入的平台地址
      const finalPlatformUrl = formData.platformUrl || tmdbData.platformUrl || ""
      
      // 判断是否手动设置了集数
      const isManuallySetEpisodes = selectedResult.media_type === "tv" && 
        (tmdbData.totalEpisodes !== formData.totalEpisodes || 
        (!tmdbData.totalEpisodes && formData.totalEpisodes > 1));
      
      // 创建项目对象
      const newItem: TMDBItem = {
        id: Date.now().toString(),
        title: tmdbData.title,
        originalTitle: tmdbData.title !== tmdbData.name ? tmdbData.title : undefined,
        mediaType: tmdbData.mediaType,
        tmdbId: tmdbData.tmdbId,
        tmdbUrl,
        posterUrl: tmdbData.posterUrl || "",
        posterPath: tmdbData.poster_path,
        backdropUrl: backdropUrl || tmdbData.backdropUrl,
        backdropPath: backdropPath || tmdbData.backdropPath,
        // 添加logo相关字段
        logoUrl: tmdbData.logoUrl,
        logoPath: tmdbData.logoPath,
        // 添加网络相关字段
        networkId: tmdbData.networkId,
        networkName: tmdbData.networkName,
        networkLogoUrl: tmdbData.networkLogoUrl,
        // 添加其他TMDB数据
        overview: tmdbData.overview,
        voteAverage: tmdbData.voteAverage,
        weekday: formData.weekday,
        secondWeekday: formData.secondWeekday >= 0 ? formData.secondWeekday : undefined,
        airTime: formData.airTime,
        totalEpisodes: totalEpisodes,
        // 添加手动设置集数标记
        ...(isManuallySetEpisodes && { manuallySetEpisodes: true }),
        isDailyUpdate: formData.isDailyUpdate, // 添加每日更新字段
        seasons: seasons.length > 0 ? seasons : undefined,
        episodes: episodes,
        completed: false,
        status: "ongoing",
        platformUrl: finalPlatformUrl,
        category: formData.category as CategoryType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 检查重复项目（简化版，直接查询数据库）
      const isDuplicate = await StorageManager.checkDuplicateByTmdbId(
        newItem.tmdbId,
        newItem.mediaType
      );

      if (isDuplicate) {
        // 显示重复提示
        toast({
          title: t("independentPage.addItem.errors.alreadyExists", { ns: "nav.maintenance" }),
          description: t("independentPage.addItem.errors.alreadyExistsDesc", { ns: "nav.maintenance", title: newItem.title }),
          variant: "destructive",
          duration: 6000
        });

        setLoading(false);
        return;
      }

      await onAdd(newItem)

      // 显示成功提示
      toast({
        title: t("independentPage.addItem.errors.addSuccess", { ns: "nav.maintenance" }),
        description: t("independentPage.addItem.errors.addSuccessDesc", { ns: "nav.maintenance", title: newItem.title }),
        variant: "default",
        duration: 3000
      });

      onOpenChange(false)
      resetForm()
    } catch (error) {
      logger.error('[添加词条] 添加失败:', error);

      toast({
        title: t("independentPage.addItem.errors.addFailed", { ns: "nav.maintenance" }),
        description: error instanceof Error ? error.message : t("independentPage.addItem.errors.networkError", { ns: "nav.maintenance" }),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return t("unknown", { ns: "common" })
    return new Date(dateString).getFullYear().toString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-4xl overflow-hidden flex flex-col",
        selectedResult ? "h-[85vh]" : "h-auto max-h-[60vh]"
      )}>
        {/* 背景图预览 */}
        {showBackdropPreview && backdropUrl && (
          <div className="absolute inset-0 -z-10">
            <BackgroundImage 
              src={backdropUrl} 
              alt="背景图预览"
              blur={true}
              overlayClassName="bg-gradient-to-b from-background/95 via-background/80 to-background/95 backdrop-blur-[2px]"
            />
          </div>
        )}
        
        <DialogHeader className="text-center pb-3 border-b">
          <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("independentPage.addItem.title", { ns: "nav.maintenance" })}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("independentPage.addItem.searchHint", { ns: "nav.maintenance" })}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "overflow-y-auto p-4",
          selectedResult ? "flex-1" : "flex-none"
        )}>
          <div className="space-y-4">
            {/* 搜索栏 */}
            <div className="bg-gradient-to-r from-muted/20 to-muted/30 p-3 rounded-lg border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder={t("independentPage.addItem.searchPlaceholder", { ns: "nav.maintenance" })}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pr-10 h-9 text-sm"
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => searchTMDB(searchQuery)}
                  className="h-9 px-4"
                  size="sm"
                >
                  <Search className="h-3 w-3 mr-1" />
                  {t("independentPage.addItem.search", { ns: "nav.maintenance" })}
                </Button>
              </div>
            </div>

            {/* 搜索结果区域 - 只有搜索结果时才显示 */}
            {searchResults.length > 0 && (
              <div className="bg-background border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-3 py-1.5 border-b">
                  <h3 className="text-xs font-medium text-muted-foreground">{t("independentPage.addItem.searchResults", { ns: "nav.maintenance" })} ({searchResults.length})</h3>
                </div>
                <ScrollArea className="h-[240px]">
                  <div className="p-2 space-y-1">
                    {searchResults.map((result) => (
                      <div
                        key={`${result.media_type}-${result.id}`}
                        className={cn(
                          "p-2 rounded-md cursor-pointer transition-all hover:bg-accent/60",
                          selectedResult?.id === result.id && "bg-primary/15 border border-primary/30"
                        )}
                        onClick={() => handleSelectResult(result)}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-10 h-14 bg-muted rounded overflow-hidden mr-3">
                            {result.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                alt={getDisplayTitle(result)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Tv className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{getDisplayTitle(result)}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                              <span>{t("tvSeries", { ns: "common" })}</span>
                              {result.adult && (
                                <>
                                  <span>•</span>
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0 h-auto">{t("adult", { ns: "common" })}</Badge>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(result.first_air_date)}</span>
                              {result.vote_average && (
                                <>
                                  <span>•</span>
                                  <Star className="h-2 w-2 text-yellow-500" />
                                  <span>{result.vote_average.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                            {selectedResult?.id === result.id && result.overview && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {result.overview}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <a
                              href={`https://www.themoviedb.org/${result.media_type}/${result.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-blue-600 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              title={t("independentPage.addItem.viewOnTmdb", { ns: "nav.maintenance" })}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            {result.backdrop_path && (
                              <ImageIcon className="h-2.5 w-2.5 text-blue-500" />
                            )}
                            {selectedResult?.id === result.id && (
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                      </div>
                    </ScrollArea>
              </div>
            )}

            {/* 空状态提示 - 当没有搜索结果且搜索过时显示 */}
            {searchResults.length === 0 && searchQuery.trim() !== '' && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("independentPage.addItem.noResults", { ns: "nav.maintenance" })}</p>
                <p className="text-xs mt-1">{t("independentPage.addItem.noResultsHint", { ns: "nav.maintenance" })}</p>
              </div>
            )}

            {/* 初始状态提示 - 当没有搜索时显示 */}
            {searchResults.length === 0 && searchQuery.trim() === '' && !loading && (
              <div className="text-center py-6 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium mb-1">{t("independentPage.addItem.startSearch", { ns: "nav.maintenance" })}</p>
                <p className="text-sm">{t("independentPage.addItem.startSearchHint", { ns: "nav.maintenance" })}</p>
              </div>
            )}

          {/* 表单 */}
          {selectedResult && (
            <div className="bg-gradient-to-br from-muted/10 to-muted/20 p-3 rounded-lg border">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 基本信息行 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-medium">{t("independentPage.addItem.form.title", { ns: "nav.maintenance" })}</Label>
                    <Input
                      id="title"
                      value={getDisplayTitle(selectedResult)}
                      disabled
                      className="bg-muted/50 font-medium h-10"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-medium">{t("independentPage.addItem.form.category", { ns: "nav.maintenance" })}</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as CategoryType })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("independentPage.addItem.form.selectCategory", { ns: "nav.maintenance" })} />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center">
                              {category.icon}
                              <span className="ml-2">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedResult.media_type === "tv" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="totalEpisodes" className="text-sm font-medium">{t("independentPage.addItem.form.totalEpisodes", { ns: "nav.maintenance" })}</Label>
                        {tmdbSeasons && tmdbSeasons.length > 1 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t("independentPage.addItem.form.seasons", { ns: "nav.maintenance", count: tmdbSeasons.length })}
                          </span>
                        )}
                      </div>
                      <Input
                        id="totalEpisodes"
                        type="number"
                        min="1"
                        value={formData.totalEpisodes}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setFormData({
                            ...formData,
                            totalEpisodes: newValue,
                          });
                          // 标记用户已手动设置总集数
                          setIsManualTotalEpisodes(true);
                        }}
                        className="h-10"
                      />
                      {/* 季数信息展示 - 使用紧凑的标签式设计 */}
                      {tmdbSeasons && tmdbSeasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tmdbSeasons.map((season: Season, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-[10px] h-5 px-2 py-0 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                            >
                              S{season.seasonNumber} {season.totalEpisodes || 0}{t("independentPage.addItem.form.episodes", { ns: "nav.maintenance" })}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 时间设置行 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="weekday" className="text-sm font-medium">{t("independentPage.addItem.weekday", { ns: "nav.maintenance" })}</Label>
                    <Select
                      value={formData.weekday.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, weekday: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("independentPage.addItem.selectWeekday", { ns: "nav.maintenance" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t("weekdaysList.sunday")}</SelectItem>
                        {WEEKDAYS.map((day, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="airTime" className="text-sm font-medium">{t("independentPage.addItem.airTime", { ns: "nav.maintenance" })}</Label>
                    <Input
                      id="airTime"
                      placeholder={t("independentPage.addItem.airTimePlaceholder", { ns: "nav.maintenance" })}
                      value={formData.airTime}
                      onChange={(e) =>
                        setFormData({ ...formData, airTime: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="secondWeekday" className="text-sm font-medium">{t("independentPage.addItem.secondWeekday", { ns: "nav.maintenance" })}</Label>
                    <Select
                      value={formData.secondWeekday.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, secondWeekday: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("independentPage.addItem.selectWeekday", { ns: "nav.maintenance" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">{t('none', { ns: 'common' })}</SelectItem>
                        <SelectItem value="0">{t('weekdaysList.sunday')}</SelectItem>
                        {WEEKDAY_KEYS.map((day, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {t(`weekdaysList.${day}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 每日更新选项 - 移动到这里 */}
                <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <Checkbox
                    id="isDailyUpdate"
                    checked={formData.isDailyUpdate}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isDailyUpdate: checked === true,
                      })
                    }
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <Label
                    htmlFor="isDailyUpdate"
                    className="text-sm flex items-center cursor-pointer font-medium"
                  >
                    <Zap className="h-4 w-4 mr-2 text-amber-500" />
                    {t("independentPage.addItem.setAsDailyUpdate", { ns: "nav.maintenance" })}
                  </Label>
                </div>

                {/* URL和背景图行 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="platformUrl" className="text-sm font-medium">{t("independentPage.addItem.platformUrlLabel", { ns: "nav.maintenance" })}</Label>
                    <Input
                      id="platformUrl"
                      placeholder="https://example.com/show-page"
                      value={formData.platformUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, platformUrl: e.target.value })
                      }
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 {t("independentPage.addItem.tmdbImportHint", { ns: "nav.maintenance" })}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="backdropUrl" className="text-sm font-medium">{t("independentPage.addItem.backdropUrlLabel", { ns: "nav.maintenance" })}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="backdropUrl"
                        placeholder="https://example.com/backdrop.jpg"
                        value={customBackdropUrl}
                        onChange={handleCustomBackdropChange}
                        className="h-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewBackdrop}
                        disabled={!customBackdropUrl}
                        className="h-10 px-3"
                      >
                        {t("independentPage.addItem.preview", { ns: "nav.maintenance" })}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground flex items-center">
                        {backdropUrl ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            {t("independentPage.addItem.backdropSet", { ns: "nav.maintenance" })}
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                            {t("independentPage.addItem.backdropNotSet", { ns: "nav.maintenance" })}
                          </>
                        )}
                      </div>
                      {backdropUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={handleResetBackdrop}
                        >
                          {t("independentPage.addItem.reset", { ns: "nav.maintenance" })}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex justify-center gap-4 pt-6 relative">
                  {/* 渐变分割效果 */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-10 px-8 font-medium"
                  >
                    {t("independentPage.addItem.cancel", { ns: "nav.maintenance" })}
                  </Button>
                  <Button
                    type="submit"
                    disabled={detailLoading || loading}
                    className="h-10 px-8 font-medium"
                  >
                    {(detailLoading || loading) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {detailLoading ? t("independentPage.addItem.loading", { ns: "nav.maintenance" }) : t("independentPage.addItem.adding", { ns: "nav.maintenance" })}
                      </>
                    ) : (
                      t("independentPage.addItem.addItem", { ns: "nav.maintenance" })
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

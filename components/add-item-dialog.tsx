"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BackgroundImage } from "@/components/ui/background-image"
import { 
  Tv, 
  Search, 
  Info, 
  Star, 
  ExternalLink, 
  Loader2, 
  Sparkles,
  Clapperboard,
  Baby,
  Popcorn,
  Ticket,
  LayoutGrid,
  Zap,
  FileCode,
  Image as ImageIcon
} from "lucide-react"
import type { TMDBItem, Season, Episode } from "@/lib/storage"
import { StorageManager } from "@/lib/storage"
import { TMDBService } from "@/lib/tmdb"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六"]

// 定义分类列表
const CATEGORIES = [
  { id: "anime" as const, name: "动漫", icon: <Sparkles className="h-4 w-4" strokeWidth={2} /> },
  { id: "tv" as const, name: "电视剧", icon: <Tv className="h-4 w-4" strokeWidth={2} /> },
  { id: "kids" as const, name: "少儿", icon: <Baby className="h-4 w-4" strokeWidth={2} /> },
  { id: "variety" as const, name: "综艺", icon: <Popcorn className="h-4 w-4" strokeWidth={2} /> },
  { id: "short" as const, name: "短剧", icon: <Ticket className="h-4 w-4" strokeWidth={2} /> },
  { id: "movie" as const, name: "电影", icon: <Clapperboard className="h-4 w-4" strokeWidth={2} /> },
]

type CategoryType = "anime" | "tv" | "kids" | "variety" | "short" | "movie";

interface TMDBSearchResult {
  id: number
  title: string
  name?: string
  media_type: "movie" | "tv"
  poster_path?: string
  backdrop_path?: string
  first_air_date?: string
  release_date?: string
  overview?: string
  vote_average?: number
  original_language?: string
}

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: TMDBItem) => void
}

export default function AddItemDialog({ open, onOpenChange, onAdd }: AddItemDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TMDBSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tmdbSeasons, setTmdbSeasons] = useState<any[]>([])
  const [backdropUrl, setBackdropUrl] = useState<string | undefined>(undefined)
  const [backdropPath, setBackdropPath] = useState<string | undefined>(undefined)
  const [customBackdropUrl, setCustomBackdropUrl] = useState<string>("")
  const [showBackdropPreview, setShowBackdropPreview] = useState(false)
  const [showPreviewCard, setShowPreviewCard] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    weekday: 1,
    secondWeekday: -1, // -1 表示未设置
    airTime: "18:00",
    totalEpisodes: 1,
    platformUrl: "",
    category: "" as CategoryType | "",
    isDailyUpdate: false // 添加每日更新选项
  })
  // Node.js和浏览器环境中setTimeout返回类型不同，使用any类型避免类型错误
  const searchTimeoutRef = useRef<any>();
  
  // 获取显示标题
  const getDisplayTitle = (result: TMDBSearchResult): string => {
    return result.media_type === "movie" ? result.title : (result.name || result.title)
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
      const tmdbData = await TMDBService.getItemFromUrl(tmdbUrl)

      if (tmdbData) {
        // 更新表单数据
        setFormData((prev) => ({
          ...prev,
          totalEpisodes: tmdbData.totalEpisodes || prev.totalEpisodes,
          platformUrl: prev.platformUrl || tmdbData.platformUrl || "",
          weekday: tmdbData.weekday !== undefined ? tmdbData.weekday : prev.weekday,
          // 根据标签自动设置推荐分类
          category: prev.category || tmdbData.recommendedCategory || (result.media_type === "movie" ? "movie" : "tv") as CategoryType
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
      console.error("获取详细信息失败:", error)
    } finally {
      setDetailLoading(false)
    }
  }, [setSelectedResult, setDetailLoading, setFormData, setTmdbSeasons, setBackdropUrl, setBackdropPath])
  
  // 处理预填充数据
  useEffect(() => {
    if (open) {
      // 检查localStorage中是否有预填充数据
      const prefilledDataStr = localStorage.getItem('tmdb_prefilled_data');
      if (prefilledDataStr) {
        try {
          const prefilledData = JSON.parse(prefilledDataStr);
          
          // 设置搜索查询为标题
          setSearchQuery(prefilledData.title);
          
          // 创建一个更详细的搜索结果
          const mockResult: TMDBSearchResult = {
            id: Number(prefilledData.id || 0),
            title: prefilledData.title,
            name: prefilledData.title, // 确保TV类型也显示标题
            media_type: prefilledData.media_type as "movie" | "tv",
            poster_path: prefilledData.poster_path,
            release_date: prefilledData.release_date,
            first_air_date: prefilledData.media_type === 'tv' ? prefilledData.release_date : undefined,
            overview: prefilledData.overview,
            vote_average: prefilledData.vote_average,
            original_language: prefilledData.original_language
          };
          
          // 设置搜索结果
          setSearchResults([mockResult]);
          
          // 设置选中结果
          setSelectedResult(mockResult);
          
          // 手动获取详细信息
          const tmdbUrl = `https://www.themoviedb.org/${mockResult.media_type}/${mockResult.id}`;
          setDetailLoading(true);
          
          TMDBService.getItemFromUrl(tmdbUrl)
            .then(tmdbData => {
              if (tmdbData) {
                // 更新表单数据
                setFormData(prev => ({
                  ...prev,
                  totalEpisodes: tmdbData.totalEpisodes || prev.totalEpisodes,
                  platformUrl: prev.platformUrl || tmdbData.platformUrl || "",
                  weekday: tmdbData.weekday !== undefined ? tmdbData.weekday : prev.weekday,
                  category: prev.category || tmdbData.recommendedCategory || (mockResult.media_type === "movie" ? "movie" : "tv") as CategoryType
                }));
                
                // 设置季数据用于预览
                if (tmdbData.seasons) {
                  setTmdbSeasons(tmdbData.seasons);
                }
              }
            })
            .catch(error => {
              console.error("获取详细信息失败:", error);
            })
            .finally(() => {
              setDetailLoading(false);
              // 清除localStorage中的预填充数据
              localStorage.removeItem('tmdb_prefilled_data');
            });
        } catch (error) {
          console.error("解析预填充数据失败:", error);
          localStorage.removeItem('tmdb_prefilled_data');
        }
      }
    }
  }, [open]);
  
  // 当对话框关闭时重置表单
  useEffect(() => {
    if (!open) {
      // 直接在这里重置状态
      setSearchQuery("");
      setSearchResults([]);
      setSelectedResult(null);
      setTmdbSeasons([]);
      setBackdropUrl(undefined);
      setBackdropPath(undefined);
      setCustomBackdropUrl("");
      setShowBackdropPreview(false);
      setShowPreviewCard(false);
      setFormData({
        weekday: 1,
        secondWeekday: -1,
        airTime: "18:00",
        totalEpisodes: 1,
        platformUrl: "",
        category: "",
        isDailyUpdate: false
      });
    }
  }, [open]);

  // 搜索TMDB
  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const apiKey = localStorage.getItem("tmdb_api_key")
      if (!apiKey) {
        throw new Error("请先在设置中配置TMDB API密钥")
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(query)}&page=1`,
      )

      if (!response.ok) {
        throw new Error("搜索失败，请检查API密钥是否正确")
      }

      const data = await response.json()
      const results = data.results
        .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
        .slice(0, 10) // 限制显示10个结果

      setSearchResults(results)
    } catch (error) {
      console.error("搜索失败:", error)
      toast({
        title: "搜索失败",
        description: error instanceof Error ? error.message : "搜索失败，请重试",
        variant: "destructive"
      })
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedResult(null)
    setTmdbSeasons([])
    setShowPreviewCard(false)

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTMDB(value)
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
        title: "请选择词条",
        description: "请先从搜索结果中选择一个词条",
        variant: "destructive"
      })
      return
    }

    // 表单验证
    if (!formData.category) {
      toast({
        title: "请选择分类",
        description: "请为词条选择一个分类",
        variant: "destructive"
      })
      return
    }

    if (formData.totalEpisodes < 1) {
      toast({
        title: "集数无效",
        description: "总集数必须大于0",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const tmdbUrl = `https://www.themoviedb.org/${selectedResult.media_type}/${selectedResult.id}`
      const tmdbData = await TMDBService.getItemFromUrl(tmdbUrl)
      
      if (!tmdbData) {
        throw new Error("无法获取词条详细信息")
      }
      
      // 构建季数据
      let seasons: Season[] = []
      let episodes: Episode[] = []
      let totalEpisodes = formData.totalEpisodes
      
      if (tmdbData.seasons && tmdbData.seasons.length > 0) {
        // 多季电视剧
        seasons = tmdbData.seasons.map((seasonData) => ({
          seasonNumber: seasonData.seasonNumber,
          name: seasonData.name,
          totalEpisodes: seasonData.totalEpisodes,
          episodes: Array.from({ length: seasonData.totalEpisodes }, (_, i) => ({
            number: i + 1,
            completed: false,
            seasonNumber: seasonData.seasonNumber,
          })),
          posterUrl: seasonData.posterUrl,
        }))
        
        // 生成所有集数的扁平化数组
        episodes = seasons.flatMap((season) => season.episodes)
        totalEpisodes = tmdbData.totalEpisodes || episodes.length
      } else if (selectedResult.media_type === "tv") {
        // 单季电视剧
        const episodeCount = tmdbData.totalEpisodes || formData.totalEpisodes
        totalEpisodes = episodeCount
        episodes = Array.from({ length: episodeCount }, (_, i) => ({
          number: i + 1,
          completed: false,
        }))
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
        totalEpisodes: selectedResult.media_type === "movie" ? 1 : totalEpisodes,
        // 添加手动设置集数标记
        ...(isManuallySetEpisodes && { manuallySetEpisodes: true }),
        isDailyUpdate: formData.isDailyUpdate, // 添加每日更新字段
        seasons: seasons.length > 0 ? seasons : undefined,
        episodes: selectedResult.media_type === "movie" ? [] : episodes,
        completed: false,
        status: "ongoing",
        platformUrl: finalPlatformUrl,
        category: formData.category as CategoryType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 检查重复项目
      const existingItems = await StorageManager.getItemsWithRetry();
      const duplicateItem = existingItems.find(item =>
        item.tmdbId === newItem.tmdbId &&
        item.mediaType === newItem.mediaType
      );

      if (duplicateItem) {
        console.log("检测到重复词条:", newItem.title);

        // 显示重复提示
        toast({
          title: "⚠️ 词条已存在",
          description: `"${newItem.title}" 已经在您的列表中了，无法重复添加。请选择其他词条或检查现有列表。`,
          variant: "destructive",
          duration: 6000
        });

        setLoading(false);
        return;
      }

      onAdd(newItem)

      // 显示成功提示
      toast({
        title: "✅ 添加成功",
        description: `"${newItem.title}" 已成功添加到您的列表中`,
        variant: "default",
        duration: 3000
      });

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("添加词条失败:", error)
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知"
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
            添加新词条
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            搜索并添加电影或剧集到收藏列表
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
                    placeholder="搜索电影或剧集..."
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
                  搜索
                </Button>
              </div>
            </div>

            {/* 搜索结果区域 - 只有搜索结果时才显示 */}
            {searchResults.length > 0 && (
              <div className="bg-background border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-3 py-1.5 border-b">
                  <h3 className="text-xs font-medium text-muted-foreground">搜索结果 ({searchResults.length})</h3>
                </div>
                <ScrollArea className="h-[240px]">
                  <div className="p-2 space-y-1">
                    {searchResults.map((result) => (
                      <div
                        key={`${result.media_type}-${result.id}`}
                        className={cn(
                          "flex items-center p-2 rounded-md cursor-pointer transition-all hover:bg-accent/60",
                          selectedResult?.id === result.id && "bg-primary/15 border border-primary/30"
                        )}
                        onClick={() => handleSelectResult(result)}
                      >
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
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>{result.media_type === "movie" ? "电影" : "剧集"}</span>
                            <span>•</span>
                            <span>{formatDate(result.release_date || result.first_air_date)}</span>
                            {result.vote_average && (
                              <>
                                <span>•</span>
                                <Star className="h-2 w-2 text-yellow-500" />
                                <span>{result.vote_average.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {result.backdrop_path && (
                            <ImageIcon className="h-2.5 w-2.5 text-blue-500" />
                          )}
                          {selectedResult?.id === result.id && (
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          )}
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
                <p className="text-sm">未找到相关内容</p>
                <p className="text-xs mt-1">请尝试其他关键词</p>
              </div>
            )}

            {/* 初始状态提示 - 当没有搜索时显示 */}
            {searchResults.length === 0 && searchQuery.trim() === '' && !loading && (
              <div className="text-center py-6 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium mb-1">开始搜索</p>
                <p className="text-sm">在上方输入电影或剧集名称进行搜索</p>
              </div>
            )}

          {/* 表单 */}
          {selectedResult && (
            <div className="bg-gradient-to-br from-muted/10 to-muted/20 p-3 rounded-lg border">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 预览卡片 */}
                {showPreviewCard && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        TMDB详情
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreviewCard(false)}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>ID:</strong> {selectedResult.id}</p>
                      <p><strong>标题:</strong> {getDisplayTitle(selectedResult)}</p>
                      <p><strong>类型:</strong> {selectedResult.media_type === 'movie' ? '电影' : '剧集'}</p>
                      <p><strong>TMDB链接:</strong>{' '}
                        <a
                          href={`https://www.themoviedb.org/${selectedResult.media_type}/${selectedResult.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          查看TMDB页面
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {/* 基本信息行 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-medium">标题</Label>
                    <Input
                      id="title"
                      value={getDisplayTitle(selectedResult)}
                      disabled
                      className="bg-muted/50 font-medium h-10"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-medium">分类</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as CategoryType })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="选择分类" />
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
                      <Label htmlFor="totalEpisodes" className="text-sm font-medium">总集数</Label>
                      <Input
                        id="totalEpisodes"
                        type="number"
                        min="1"
                        value={formData.totalEpisodes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            totalEpisodes: parseInt(e.target.value) || 1,
                          })
                        }
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {/* 时间设置行 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="weekday" className="text-sm font-medium">更新星期</Label>
                    <Select
                      value={formData.weekday.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, weekday: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">周日</SelectItem>
                        {WEEKDAYS.map((day, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="airTime" className="text-sm font-medium">更新时间</Label>
                    <Input
                      id="airTime"
                      placeholder="时间 (如 18:00)"
                      value={formData.airTime}
                      onChange={(e) =>
                        setFormData({ ...formData, airTime: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="secondWeekday" className="text-sm font-medium">第二播出日</Label>
                    <Select
                      value={formData.secondWeekday.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, secondWeekday: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">无</SelectItem>
                        <SelectItem value="0">周日</SelectItem>
                        {WEEKDAYS.map((day, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {day}
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
                    设为每日更新
                  </Label>
                </div>

                {/* URL和背景图行 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="platformUrl" className="text-sm font-medium">播出平台URL</Label>
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
                      💡 用于TMDB导入工具抓取元数据
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="backdropUrl" className="text-sm font-medium">背景图URL</Label>
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
                        预览
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground flex items-center">
                        {backdropUrl ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            已设置背景图
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                            未设置背景图
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
                          重置
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
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={detailLoading || loading}
                    className="h-10 px-8 font-medium"
                  >
                    {(detailLoading || loading) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {detailLoading ? "加载中" : "添加中"}
                      </>
                    ) : (
                      "添加词条"
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

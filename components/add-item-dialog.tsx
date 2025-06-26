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

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

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
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    weekday: 1,
    secondWeekday: -1, // -1 表示未设置
    airTime: "19:00",
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

      // 创建详细信息预览卡片
      const previewCard = document.createElement('div');
      previewCard.className = 'p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4';
      previewCard.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-blue-700 dark:text-blue-300">TMDB详情预览</div>
          <button type="button" class="text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <p><strong>ID:</strong> ${result.id}</p>
          <p><strong>标题:</strong> ${getDisplayTitle(result)}</p>
          <p><strong>类型:</strong> ${result.media_type === 'movie' ? '电影' : '剧集'}</p>
          <p><strong>TMDB链接:</strong> 
            <a href="https://www.themoviedb.org/${result.media_type}/${result.id}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="text-blue-600 hover:underline">
              查看TMDB页面
            </a>
          </p>
        </div>
      `;
      
      // 插入预览卡片到表单顶部
      const formElement = document.querySelector('form.space-y-6');
      if (formElement && formElement.firstChild) {
        const timeoutId = setTimeout(() => {
          formElement.insertBefore(previewCard, formElement.firstChild);
          // 清除超时
          clearTimeout(timeoutId);
        }, 100);
      }

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
      setFormData({
        weekday: 1,
        secondWeekday: -1,
        airTime: "19:00",
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
      alert(error instanceof Error ? error.message : "搜索失败")
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

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTMDB(value)
    }, 500) as unknown as number
  }

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
      airTime: "19:00",
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
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedResult) {
      alert("请先选择一个词条")
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
      const existingItems = StorageManager.getItems();
      const duplicateItem = existingItems.find(item => 
        item.tmdbId === newItem.tmdbId && 
        item.mediaType === newItem.mediaType
      );
      
      if (duplicateItem) {
        toast({
          title: "词条已存在",
          description: `"${newItem.title}" 已存在于您的列表中`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      onAdd(newItem)
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
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
        
        <DialogHeader>
          <DialogTitle>添加新项目</DialogTitle>
          <DialogDescription>
            搜索TMDB并添加电影或剧集到您的列表
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
          {/* 搜索栏 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                <Input
                placeholder="搜索电影或剧集..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                className="pr-10"
                />
                {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                )}
              </div>
            <Button type="button" onClick={() => searchTMDB(searchQuery)}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-4 space-y-2">
                      {searchResults.map((result) => (
                        <div
                    key={`${result.media_type}-${result.id}`}
                    className={cn(
                      "flex items-start p-2 rounded-md cursor-pointer hover:bg-accent",
                      selectedResult?.id === result.id && "bg-accent"
                    )}
                          onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex-shrink-0 w-12 h-18 bg-muted rounded overflow-hidden mr-3">
                      {result.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                              alt={getDisplayTitle(result)}
                          className="w-full h-full object-cover"
                            />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                    <div className="flex-1">
                      <div className="font-medium">{getDisplayTitle(result)}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.media_type === "movie" ? "电影" : "剧集"} •{" "}
                        {formatDate(result.release_date || result.first_air_date)}
                      </div>
                      {result.vote_average && (
                        <div className="flex items-center mt-1">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="text-xs">{result.vote_average.toFixed(1)}</span>
                              </div>
                              )}
                            </div>
                    {result.backdrop_path && (
                      <div className="flex-shrink-0 text-xs text-blue-500">
                        <ImageIcon className="h-3 w-3" />
                          </div>
                    )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
            )}

          {/* 表单 */}
          {selectedResult && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：基本信息 */}
            <div className="space-y-4">
                <Card>
                  <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        基本信息
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">标题</Label>
                        <Input 
                          id="title"
                          value={getDisplayTitle(selectedResult)}
                          disabled
                        />
                  </div>

                      <div className="space-y-2">
                    <Label htmlFor="category">分类</Label>
                    <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value as CategoryType })}
                    >
                      <SelectTrigger>
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

                      <div className="space-y-2">
                        <Label htmlFor="weekday">更新时间</Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.weekday.toString()}
                            onValueChange={(value) =>
                              setFormData({ ...formData, weekday: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择星期" />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAYS.map((day, index) => (
                                <SelectItem key={index} value={(index + 1).toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                              <SelectItem value="0">周日</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="airTime"
                            placeholder="时间 (如 20:00)"
                            value={formData.airTime}
                            onChange={(e) =>
                              setFormData({ ...formData, airTime: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* 第二播出日 */}
                      <div className="space-y-2">
                        <Label htmlFor="secondWeekday">第二播出日 (可选)</Label>
                      <Select
                          value={formData.secondWeekday.toString()}
                          onValueChange={(value) =>
                            setFormData({ ...formData, secondWeekday: parseInt(value) })
                          }
                      >
                        <SelectTrigger>
                            <SelectValue placeholder="选择星期" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="-1">无</SelectItem>
                            {WEEKDAYS.map((day, index) => (
                              <SelectItem key={index} value={(index + 1).toString()}>
                                {day}
                              </SelectItem>
                            ))}
                            <SelectItem value="0">周日</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                      
                      {/* 每日更新选项 */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isDailyUpdate"
                          checked={formData.isDailyUpdate}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              isDailyUpdate: checked === true,
                            })
                          }
                        />
                        <Label
                          htmlFor="isDailyUpdate"
                          className="text-sm flex items-center cursor-pointer"
                        >
                          <Zap className="h-3 w-3 mr-1 animate-pulse" />
                          设为每日更新
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 右侧：详细设置 */}
                <div className="space-y-4">
                  {/* 集数设置 */}
                  {selectedResult.media_type === "tv" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          集数设置
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalEpisodes">总集数</Label>
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
                          />
                    </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 平台信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        平台信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="platformUrl">播出平台URL</Label>
                    <Input
                      id="platformUrl"
                          placeholder="https://example.com/show-page"
                      value={formData.platformUrl}
                          onChange={(e) =>
                            setFormData({ ...formData, platformUrl: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          用于TMDB导入工具抓取元数据
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 背景图设置 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        背景图设置
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="backdropUrl">背景图URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="backdropUrl"
                            placeholder="https://example.com/backdrop.jpg"
                            value={customBackdropUrl}
                            onChange={handleCustomBackdropChange}
                    />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handlePreviewBackdrop}
                            disabled={!customBackdropUrl}
                          >
                            预览
                          </Button>
                        </div>
                        <div className="flex justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {backdropUrl ? "已设置背景图" : "未设置背景图"}
                          </p>
                          {backdropUrl && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className="h-5 px-2 py-0 text-xs"
                              onClick={handleResetBackdrop}
                            >
                              重置
                            </Button>
                          )}
                        </div>
                  </div>
                </CardContent>
              </Card>
            </div>
              </div>

              <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
                <Button type="submit" disabled={detailLoading}>
                  {detailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      加载中
                    </>
                  ) : (
                    "添加"
                  )}
            </Button>
          </div>
        </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
